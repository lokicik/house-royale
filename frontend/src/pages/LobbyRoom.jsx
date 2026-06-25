import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/authContextValue'
import { useLocale } from '../contexts/localeContextValue'
import { useWebSocket } from '../hooks/useWebSocket'
import { probeLobbyAccess, wsUrl } from '../lib/api'
import AppShell from '../components/AppShell'
import { Icon, ModelBadge } from '../components/icons'
import DistrictMap from '../components/DistrictMap'
import './LobbyRoom.css'

void React

const ROUND_COUNT_OPTIONS = [3, 6]
const ROUND_DURATION_OPTIONS = [30, 60]
const ACTIVITY_MAX = 20

const LEAGUE_EMOJI = {
  bronze: '🥉',
  gold: '🥇',
  diamond: '💎',
}

const ROUND_MEDALS = ['🥇', '🥈', '🥉']

function LeagueBadge({ league }) {
  const { t } = useLocale()
  if (!league) return null
  return (
    <span className={`lr-league-badge lr-league-${league}`}>
      <span aria-hidden="true">{LEAGUE_EMOJI[league] ?? ''}</span>
      {t(`lobbyRoom.leagues.${league}`) ?? league}
    </span>
  )
}

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function computeRoundTimeLeft(payload) {
  if (!payload) return 0
  if (payload.deadline_ts) {
    return Math.max(0, Math.ceil((payload.deadline_ts - Date.now()) / 1000))
  }
  return payload.time_limit_sec ?? 0
}

function roomClosedMessage(reason, t) {
  return t(`lobbyRoom.roomClosed.${reason}`) ?? t('lobbyRoom.roomClosed.default')
}

function terminalMessageFromErrorCode(errorCode, fallbackMessage, t) {
  if (errorCode === 'removed_from_lobby') return t('lobbyRoom.terminal.removed_from_lobby')
  if (errorCode === 'lobby_not_found') return t('lobbyRoom.terminal.lobby_not_found')
  if (errorCode === 'game_in_progress') return t('lobbyRoom.terminal.game_in_progress')
  return fallbackMessage || t('lobbyRoom.terminal.unavailable')
}

function connectionStatusLabel(connectionState, connectionErrorCode, connectionError, resolveError, t) {
  if (connectionState === 'connected') return t('lobbyRoom.connection.connected')
  if (connectionState === 'reconnecting') {
    return connectionErrorCode
      ? resolveError({ code: connectionErrorCode, message: connectionError }, 'lobbyRoom.connection.reconnecting')
      : (connectionError ?? t('lobbyRoom.connection.reconnecting'))
  }
  if (connectionState === 'terminal') return t('lobbyRoom.connection.terminal')
  if (connectionState === 'connecting') return t('lobbyRoom.connection.connecting')
  return connectionError ?? t('lobbyRoom.connection.waiting')
}

export default function LobbyRoom() {
  const { id: lobbyId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, resolveError } = useLocale()

  const fallbackNick = user?.displayName || user?.email?.split('@')[0] || t('common.player')
  const nickname = state?.nickname ?? fallbackNick

  const [screen, setScreen] = useState('waiting')
  const [roomStatus, setRoomStatus] = useState('waiting')
  const [players, setPlayers] = useState([])
  const [roundData, setRoundData] = useState(null)
  const [resultData, setResultData] = useState(null)
  const [leaderboardData, setLeaderboardData] = useState(null)
  const [roundHistory, setRoundHistory] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [guess, setGuess] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submittedPlayerIds, setSubmittedPlayerIds] = useState(new Set())
  const [settings, setSettings] = useState({ round_count: 3, round_duration_sec: 30 })
  const [aiModels, setAIModels] = useState({})
  const [availableAI, setAvailableAI] = useState([])
  const [hostId, setHostId] = useState(null)
  const [youId, setYouId] = useState(null)
  const [lobbyLeague, setLobbyLeague] = useState(null)
  const [leagueToast, setLeagueToast] = useState(null)
  const [activity, setActivity] = useState([])
  const [voteState, setVoteState] = useState({ round: 0, voted: [], needed: [], deadline_ts: 0 })
  const [voted, setVoted] = useState(false)
  const [error, setError] = useState(null)
  const [url, setUrl] = useState(null)

  const timerRef = useRef(null)
  const joinedRef = useRef(false)
  const noticeTimeoutRef = useRef(null)
  const redirectingRef = useRef(false)
  const leavingRef = useRef(false)

  const isHost = !!youId && youId === hostId

  useEffect(() => {
    if (!user) return
    let cancelled = false
    user.getIdToken().then(token => {
      if (!cancelled) setUrl(wsUrl(lobbyId, token))
    })
    const interval = setInterval(() => {
      user.getIdToken(true).then(token => {
        if (!cancelled) {
          setUrl(wsUrl(lobbyId, token))
        }
      })
    }, 50 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [user, lobbyId])

  const pushActivity = useCallback((entry) => {
    setActivity(prev => [entry, ...prev].slice(0, ACTIVITY_MAX))
  }, [])

  const showError = useCallback((message) => {
    setError(message)
    window.clearTimeout(noticeTimeoutRef.current)
    noticeTimeoutRef.current = window.setTimeout(() => setError(null), 4000)
  }, [])

  const handleTerminalClose = useCallback((message) => {
    if (redirectingRef.current || leavingRef.current) return
    redirectingRef.current = true
    navigate('/lobby', { state: { notice: message } })
  }, [navigate])

  const onMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'LOBBY_STATE': {
        const p = msg.payload || {}
        setHostId(p.host_id ?? null)
        setYouId(p.you_id ?? null)
        setRoomStatus(p.status ?? 'waiting')
        if (p.status === 'waiting') {
          setScreen('waiting')
        }
        if (p.league) setLobbyLeague(p.league)
        if (p.settings) setSettings(p.settings)
        if (p.ai_models) setAIModels(p.ai_models)
        if (Array.isArray(p.available_ai_models)) setAvailableAI(p.available_ai_models)
        if (Array.isArray(p.players)) {
          setPlayers(p.players.map(pl => ({
            player_id: pl.id,
            nickname: pl.nickname,
            score: pl.score,
            connected: pl.connected,
          })))
        }
        break
      }
      case 'PLAYER_JOINED':
        setPlayers(prev => {
          const id = msg.payload?.player_id
          if (!id) return prev
          if (prev.some(p => p.player_id === id)) {
            return prev.map(p => (
              p.player_id === id
                ? { ...p, connected: true, nickname: msg.payload.nickname ?? p.nickname }
                : p
            ))
          }
          return [...prev, { ...msg.payload, connected: true }]
        })
        break
      case 'PLAYER_LEFT':
        setPlayers(prev => {
          const id = msg.payload?.player_id
          if (!id) return prev
          if (msg.payload?.remove) {
            return prev.filter(p => p.player_id !== id)
          }
          return prev.map(p => (p.player_id === id ? { ...p, connected: false } : p))
        })
        break
      case 'PLAYER_KICKED':
        handleTerminalClose(terminalMessageFromErrorCode('removed_from_lobby', msg.payload?.message, t))
        break
      case 'ROOM_CLOSED':
        handleTerminalClose(roomClosedMessage(msg.payload?.reason, t))
        break
      case 'SETTINGS_UPDATED':
        if (msg.payload?.settings) setSettings(msg.payload.settings)
        if (msg.payload?.ai_models) setAIModels(msg.payload.ai_models)
        break
      case 'LOBBY_ACTIVITY':
        pushActivity({
          id: `${msg.payload?.ts ?? Date.now()}-${msg.payload?.actor_id ?? ''}-${msg.payload?.kind ?? ''}-${Math.random().toString(36).slice(2, 6)}`,
          kind: msg.payload?.kind ?? '',
          actor: msg.payload?.actor_nickname ?? t('common.system'),
          ts: msg.payload?.ts ?? Date.now(),
        })
        if (msg.payload?.kind === 'submitted' && msg.payload?.actor_id) {
          setSubmittedPlayerIds(prev => new Set([...prev, msg.payload.actor_id]))
        }
        break
      case 'ROUND_START':
        if (msg.payload?.round === 1) setRoundHistory([])
        clearInterval(timerRef.current)
        setRoomStatus('playing')
        setRoundData(msg.payload)
        setSubmitted(false)
        setSubmittedPlayerIds(new Set())
        setGuess('')
        setScreen('round')
        setTimeLeft(computeRoundTimeLeft(msg.payload))
        setVoted(false)
        setVoteState({ round: 0, voted: [], needed: [], deadline_ts: 0 })
        break
      case 'ROUND_RESULT':
        clearInterval(timerRef.current)
        setResultData(msg.payload)
        setRoundHistory(prev => {
          const next = prev.filter(entry => entry.round !== msg.payload?.round)
          return [...next, msg.payload]
        })
        setScreen('result')
        setVoted(false)
        break
      case 'ROUND_VOTE_STATE':
        setVoteState({
          round: msg.payload?.round ?? 0,
          voted: msg.payload?.voted ?? [],
          needed: msg.payload?.needed ?? [],
          deadline_ts: msg.payload?.deadline_ts ?? 0,
        })
        break
      case 'LEADERBOARD':
        setRoomStatus('finished')
        setLeaderboardData(msg.payload)
        setScreen('leaderboard')
        break
      case 'LEAGUE_UPDATE': {
        const p = msg.payload || {}
        if (youId && p.player_id && p.player_id !== youId) break
        setLeagueToast(p)
        window.setTimeout(() => setLeagueToast(null), 6000)
        break
      }
      case 'ERROR':
        showError(resolveError({ code: msg.payload?.code, message: msg.payload?.message }))
        break
      default:
        break
    }
  }, [handleTerminalClose, pushActivity, resolveError, showError, t, youId])

  const resolveTerminalState = useCallback(async () => {
    if (!user) {
      return {
        terminal: true,
        errorCode: 'lobby_not_found',
        message: t('lobbyRoom.terminal.sessionMissing'),
      }
    }

    try {
      const idToken = await user.getIdToken()
      const access = await probeLobbyAccess(user, idToken, lobbyId)
      if (access.ok) {
        return { terminal: false }
      }
      if ([403, 404, 409].includes(access.status)) {
        return {
          terminal: true,
          errorCode: access.errorCode,
          message: terminalMessageFromErrorCode(access.errorCode, access.message, t),
        }
      }
    } catch {
      return { terminal: false }
    }

    return { terminal: false }
  }, [lobbyId, t, user])

  const {
    connected,
    connectionState,
    connectionError,
    connectionErrorCode,
    terminalState,
    send,
    disconnect,
  } = useWebSocket(url, onMessage, { resolveTerminalState })

  useEffect(() => {
    if (connected && !joinedRef.current) {
      joinedRef.current = true
      send('JOIN', { nickname })
    }
    if (!connected) {
      joinedRef.current = false
    }
  }, [connected, nickname, send])

  useEffect(() => {
    if (!terminalState?.terminal) return
    disconnect(false)
    handleTerminalClose(terminalState.message || t('lobbyRoom.terminal.unavailable'))
  }, [disconnect, handleTerminalClose, t, terminalState])

  useEffect(() => {
    if (screen !== 'round' || !roundData) return
    timerRef.current = setInterval(() => {
      setTimeLeft(computeRoundTimeLeft(roundData))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [roundData, screen])

  useEffect(() => {
    const i = setInterval(() => {
      setActivity(prev => [...prev])
    }, 15_000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => () => {
    clearInterval(timerRef.current)
    window.clearTimeout(noticeTimeoutRef.current)
  }, [])

  function handleStartGame() {
    send('READY', {})
  }

  function handleSubmitGuess(e) {
    e.preventDefault()
    const price = parseFloat(String(guess).replace(/\./g, '').replace(',', '.'))
    if (!price || price <= 0) return
    send('SUBMIT_GUESS', { price_try: price })
    setSubmitted(true)
  }

  function handleUpdateSetting(field, value) {
    if (!isHost) return
    send('UPDATE_SETTINGS', { [field]: value })
  }

  function handleToggleAI(modelId, nextValue) {
    if (!isHost) return
    send('UPDATE_SETTINGS', { ai_models: { [modelId]: nextValue } })
  }

  function handleVoteNext() {
    if (voted) return
    send('NEXT_ROUND_VOTE', {})
    setVoted(true)
  }

  function handleKickPlayer(playerId) {
    if (!isHost || !playerId || playerId === youId) return
    send('KICK_PLAYER', { player_id: playerId })
  }

  function handleCloseRoom() {
    if (!isHost) return
    send('CLOSE_ROOM', {})
  }

  function handleExitGame() {
    leavingRef.current = true
    send('LEAVE', {})
    disconnect(false)
    navigate('/lobby', { state: { notice: t('lobbyRoom.notices.leftGame') } })
  }

  if (!user) {
    navigate('/login')
    return null
  }

  const subnavRound = screen === 'round' && roundData
    ? { label: t('lobbyRoom.subnav.round'), value: `${roundData.round} / ${roundData.total_rounds}` }
    : screen === 'result' && resultData
      ? { label: t('lobbyRoom.subnav.round'), value: `${resultData.round}` }
      : null

  const aiActiveCount = availableAI.filter(m => aiModels[m.id]).length
  const connectedPlayerCount = players.filter(p => p.connected !== false).length
  const canCloseRoom = isHost && (roomStatus === 'waiting' || roomStatus === 'finished' || screen === 'leaderboard')

  return (
    <AppShell>
      <div className="lr-subnav">
        <div className="lr-subnav-item">{t('lobbyRoom.subnav.room')} <strong>{lobbyId}</strong></div>
        <div className="lr-subnav-item">{t('lobbyRoom.subnav.mode')} <strong>{t('common.multiplayer')}</strong></div>
        {subnavRound && <div className="lr-subnav-item">{subnavRound.label} <strong>{subnavRound.value}</strong></div>}
        {screen === 'round' && (
          <div className="lr-subnav-item">{t('lobbyRoom.subnav.time')} <strong style={{ color: timeLeft <= 10 ? '#fca5a5' : '#fff' }}>{timeLeft}s</strong></div>
        )}
        <div className="lr-subnav-item">{t('lobbyRoom.subnav.host')} <strong>{
          (hostId && players.find(p => p.player_id === hostId)?.nickname) || (isHost ? nickname : '-')
        }</strong></div>
        <div className="lr-subnav-item">{t('lobbyRoom.subnav.players')} <strong>{connectedPlayerCount} / 8</strong></div>
        <div className="lr-subnav-spacer" />
        {canCloseRoom && (
          <button className="hr-btn hr-btn-outline" onClick={handleCloseRoom}>{t('common.actions.closeRoom')}</button>
        )}
        {screen === 'leaderboard' ? (
          <button className="hr-btn hr-btn-primary" onClick={() => navigate('/lobby')}>{t('common.actions.backToLobby')}</button>
        ) : (
          <>
            <span className={`lr-conn ${connected ? 'ok' : 'bad'}`}>
              {connectionStatusLabel(connectionState, connectionErrorCode, connectionError, resolveError, t)}
            </span>
            <button className="hr-btn hr-btn-danger" onClick={handleExitGame}>{t('lobbyRoom.subnav.exitGame')}</button>
          </>
        )}
      </div>

      {error && <div className="lr-error">{error}</div>}
      {leagueToast && (
        <div className={`lr-league-toast ${leagueToast.promoted ? 'promoted' : leagueToast.demoted ? 'demoted' : ''}`}>
          <LeagueBadge league={leagueToast.league} />
          <span className="lr-league-toast-text">
            {leagueToast.promoted && `${t('lobbyRoom.leagueToast.promoted')} `}
            {leagueToast.demoted && `${t('lobbyRoom.leagueToast.demoted')} `}
            {t('lobbyRoom.leagueToast.lp')}: <strong>{leagueToast.lp}</strong>
            <span className="delta"> ({leagueToast.lp_delta >= 0 ? '+' : ''}{leagueToast.lp_delta})</span>
          </span>
        </div>
      )}

      {screen === 'waiting' && (
        <WaitingScreen
          players={players}
          isHost={isHost}
          youId={youId}
          onKickPlayer={handleKickPlayer}
          onStart={handleStartGame}
          settings={settings}
          onChangeSetting={handleUpdateSetting}
          availableAI={availableAI}
          aiModels={aiModels}
          aiActiveCount={aiActiveCount}
          onToggleAI={handleToggleAI}
          activity={activity}
          lobbyLeague={lobbyLeague}
        />
      )}
      {screen === 'round' && roundData && (
        <RoundScreen
          data={roundData}
          guess={guess}
          setGuess={setGuess}
          submitted={submitted}
          onSubmit={handleSubmitGuess}
          players={players}
          nickname={nickname}
          submittedPlayerIds={submittedPlayerIds}
        />
      )}
      {screen === 'result' && resultData && (
        <ResultScreen
          data={resultData}
          property={roundData?.property ?? null}
          nickname={nickname}
          totalRounds={settings.round_count}
          voteState={voteState}
          voted={voted}
          onVoteNext={handleVoteNext}
          players={players}
          youId={youId}
        />
      )}
      {screen === 'leaderboard' && leaderboardData && (
        <FinalLeaderboard
          data={leaderboardData}
          roundHistory={roundHistory}
          onExit={() => navigate('/lobby')}
          isHost={isHost}
          onCloseRoom={handleCloseRoom}
        />
      )}
    </AppShell>
  )
}

function WaitingScreen({
  players,
  isHost,
  youId,
  onKickPlayer,
  onStart,
  settings,
  onChangeSetting,
  availableAI,
  aiModels,
  aiActiveCount,
  onToggleAI,
  activity,
  lobbyLeague,
}) {
  const { t, formatRelativeTime } = useLocale()
  const connectedPlayers = players.filter(p => p.connected !== false)
  const enabledAI = availableAI.filter(m => aiModels[m.id])
  const totalParticipants = connectedPlayers.length + enabledAI.length
  const activityVerbs = t('lobbyRoom.activityVerbs')

  return (
    <div className="lr-wait-grid">
      <div>
        <div className="lr-panel">
          <div className="lr-panel-header">
            <h3>{t('lobbyRoom.waiting.players', { count: totalParticipants })}</h3>
            <span className="lr-pill ready">{t('lobbyRoom.waiting.live')}</span>
          </div>
          <div className="lr-panel-body">
            {totalParticipants === 0 && (
              <div className="lr-player-row empty">{t('lobbyRoom.waiting.waitingPlayer')}</div>
            )}
            {connectedPlayers.map(p => (
              <div className="lr-player-row" key={p.player_id}>
                <span className="lr-pavatar">{initials(p.nickname)}</span>
                <span className="lr-player-name">{p.nickname}</span>
                {isHost && p.player_id !== youId ? (
                  <button type="button" className="hr-btn hr-btn-ghost lr-kick-btn" onClick={() => onKickPlayer(p.player_id)}>
                    {t('lobbyRoom.waiting.kick')}
                  </button>
                ) : (
                  <span className="lr-pill ready">{t('lobbyRoom.waiting.ready')}</span>
                )}
              </div>
            ))}
            {enabledAI.map(m => (
              <div className="lr-player-row" key={`ai-${m.id}`}>
                <ModelBadge name={m.name} size={28} />
                <span className="lr-player-name">
                  {m.name}
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--hr-muted)' }}>· {m.type}</span>
                </span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <LeagueBadge league={m.league} />
                  <span className="lr-pill ai">{t('common.ai')}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lr-panel" style={{ marginTop: 16 }}>
          <div className="lr-panel-header">
            <h3>{t('lobbyRoom.waiting.activity')}</h3>
          </div>
          <div className="lr-panel-body lr-activity-scroll">
            {activity.length === 0 && (
              <div className="lr-activity" style={{ fontStyle: 'italic' }}>{t('lobbyRoom.waiting.noActivity')}</div>
            )}
            {activity.map(a => (
              <div key={a.id} className="lr-activity">
                <strong>{a.actor}</strong> {activityVerbs[a.kind] ?? a.kind}
                <span className="time">{formatRelativeTime(a.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="lr-panel">
          <div className="lr-panel-header">
            <h3>{t('lobbyRoom.waiting.gameSettings')}</h3>
            {!isHost && <span style={{ fontSize: 11, color: 'var(--hr-muted)' }}>{t('lobbyRoom.waiting.hostOnly')}</span>}
          </div>
          <div className="lr-panel-body">
            <SettingRow
              label={t('lobbyRoom.waiting.roundCount')}
              options={ROUND_COUNT_OPTIONS}
              active={settings.round_count}
              disabled={!isHost}
              onChange={(v) => onChangeSetting('round_count', v)}
              renderOption={(v) => v}
            />
            <SettingRow
              label={t('lobbyRoom.waiting.roundDuration')}
              options={ROUND_DURATION_OPTIONS}
              active={settings.round_duration_sec}
              disabled={!isHost}
              onChange={(v) => onChangeSetting('round_duration_sec', v)}
              renderOption={(v) => `${v}s`}
            />
          </div>
        </div>

        {isHost ? (
          <div className="lr-start-card">
            <h4>{t('lobbyRoom.waiting.readyTitle')}</h4>
            <p>{t('lobbyRoom.waiting.readyDesc')}</p>
            <button onClick={onStart}>{t('lobbyRoom.waiting.startGame')}</button>
          </div>
        ) : (
          <div className="lr-start-card">
            <h4>{t('lobbyRoom.waiting.waitingTitle')}</h4>
            <p>{t('lobbyRoom.waiting.waitingDesc')}</p>
            <div className="wait">{t('lobbyRoom.waiting.waitingStatus')}</div>
          </div>
        )}
      </div>

      <div>
        <div className="lr-panel">
          <div className="lr-panel-header">
            <h3>{t('lobbyRoom.waiting.aiOpponents')}</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {lobbyLeague && <LeagueBadge league={lobbyLeague} />}
              <span style={{ fontSize: 12, color: 'var(--hr-muted)' }}>
                {t('lobbyRoom.waiting.activeCount', { active: aiActiveCount, total: availableAI.length })}
              </span>
            </div>
          </div>
          <div className="lr-panel-body">
            {availableAI.length === 0 && (
              <div className="lr-player-row empty">{t('lobbyRoom.waiting.modelsLoading')}</div>
            )}
            {availableAI.map(m => {
              const on = !!aiModels[m.id]
              return (
                <div className="lr-model-row" key={m.id}>
                  <ModelBadge name={m.name} size={32} />
                  <div className="lr-model-info">
                    <div className="n">{m.name}</div>
                    <div className="t">{m.type}</div>
                  </div>
                  <button
                    type="button"
                    className={`lr-toggle${on ? ' on' : ''}${isHost ? '' : ' disabled'}`}
                    aria-label={t(on ? 'lobbyRoom.waiting.aiToggleOn' : 'lobbyRoom.waiting.aiToggleOff', { name: m.name })}
                    onClick={() => onToggleAI(m.id, !on)}
                    disabled={!isHost}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="lr-preview">
          <img src="/assets/landing-page-house-img.png" alt={t('lobbyRoom.waiting.sampleListing')} />
          <div className="cap">
            <strong>{t('lobbyRoom.waiting.sampleListing')}</strong>
            {t('lobbyRoom.waiting.sampleListingMeta')}
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, options, active, disabled, onChange, renderOption }) {
  return (
    <div className="lr-setting-row">
      <span className="label">{label}</span>
      <div className="lr-chip-group">
        {options.map(o => (
          <button
            key={o}
            className={`lr-chip${o === active ? ' active' : ''}${disabled ? ' disabled' : ''}`}
            onClick={() => !disabled && onChange?.(o)}
            disabled={disabled}
            type="button"
          >
            {renderOption ? renderOption(o) : o}
          </button>
        ))}
      </div>
    </div>
  )
}

function RoundScreen({ data, guess, setGuess, submitted, onSubmit, players, nickname, submittedPlayerIds }) {
  const { t, formatCurrency } = useLocale()
  const { property } = data

  const handleAddGuess = (amount) => {
    const current = parseFloat(guess) || 0
    setGuess(String(current + amount))
  }

  const handleClearGuess = () => {
    setGuess('')
  }

  const fields = [
    { l: t('lobbyRoom.round.brutArea'), v: `${property.metrekare_brut} m²`, icon: 'ruler' },
    property.metrekare_net > 0 ? { l: t('lobbyRoom.round.netArea'), v: `${property.metrekare_net} m²`, icon: 'ruler' } : null,
    { l: t('lobbyRoom.round.roomCount'), v: property.oda_salon, icon: 'bed' },
    property.banyo_sayisi ? { l: t('lobbyRoom.round.bathroom'), v: property.banyo_sayisi, icon: 'bed' } : null,
    { l: t('lobbyRoom.round.age'), v: property.bina_yasi, icon: 'building' },
    { l: t('lobbyRoom.round.floor'), v: `${property.kat} / ${property.kat_sayisi}`, icon: 'floor' },
    { l: t('lobbyRoom.round.heating'), v: property.isitma, icon: 'heater' },
  ].filter(Boolean)

  return (
    <div className="lr-round-grid">
      <div>
        <div className="lr-property">
          <div className="lr-property-map">
            <DistrictMap ilce={property.ilce} mahalle={property.mahalle} />
          </div>
          <div className="lr-property-body">
            <div className="lr-location">
              <Icon name="pin" size={16} />
              {property.mahalle}, {property.ilce} / {property.il}
            </div>
            <div className="lr-specs">
              {fields.map(f => (
                <div className="lr-spec" key={f.l}>
                  <span className="lr-spec-icon"><Icon name={f.icon} size={16} /></span>
                  <div className="l">{f.l}</div>
                  <div className="v">{f.v ?? '-'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="lr-guess-card">
          <h4>{t('lobbyRoom.round.yourTurn')}</h4>
          <p className="sub">{t('lobbyRoom.round.guessPrompt')}</p>
          {!submitted ? (
            <form onSubmit={onSubmit}>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={guess}
                  onChange={e => setGuess(e.target.value)}
                  placeholder={t('lobbyRoom.round.amountPlaceholder')}
                  min="1"
                  className="lr-guess-input"
                />
                {parseFloat(guess) > 0 && (
                  <div className="lr-guess-live-badge">
                    {formatCurrency(parseFloat(guess))}
                  </div>
                )}
              </div>
              <div className="lr-quick-grid">
                <button type="button" className="lr-quick" onClick={() => handleAddGuess(100_000)}>+100K</button>
                <button type="button" className="lr-quick" onClick={() => handleAddGuess(250_000)}>+250K</button>
                <button type="button" className="lr-quick" onClick={() => handleAddGuess(500_000)}>+500K</button>
                <button type="button" className="lr-quick lr-quick-clear" onClick={handleClearGuess}>{t('lobbyRoom.round.clear')}</button>
                <button type="button" className="lr-quick" onClick={() => handleAddGuess(1_000_000)}>+1M</button>
                <button type="button" className="lr-quick" onClick={() => handleAddGuess(2_000_000)}>+2M</button>
                <button type="button" className="lr-quick" onClick={() => handleAddGuess(5_000_000)}>+5M</button>
                <button type="button" className="lr-quick" onClick={() => handleAddGuess(10_000_000)}>+10M</button>
              </div>
              <button type="submit" className="hr-btn hr-btn-primary hr-btn-lg" style={{ width: '100%', marginTop: 12 }}>
                <Icon name="send" size={16} />
                {t('lobbyRoom.round.submitGuess')}
              </button>
              <div className="lr-tip">{t('lobbyRoom.round.tip')}</div>
            </form>
          ) : (
            <div className="lr-submitted">{t('lobbyRoom.round.submitted')}</div>
          )}
        </div>

        <div className="lr-progress">
          <h4>{t('lobbyRoom.round.liveProgress')}</h4>
          {(players.length ? players.filter(p => p.connected !== false) : [{ player_id: 'self', nickname }]).map(p => {
            const hasSubmitted = submittedPlayerIds?.has(p.player_id) || (p.nickname === nickname && submitted)
            return (
            <div className="lr-player-row" key={p.player_id}>
              <span className="lr-pavatar">{initials(p.nickname)}</span>
              <span className="lr-player-name">{p.nickname}</span>
              <span className={`lr-pill ${hasSubmitted ? 'ready' : 'waiting'}`}>
                {hasSubmitted ? t('lobbyRoom.round.sent') : t('lobbyRoom.round.thinking')}
              </span>
            </div>
            )
          })}
          <div className="lr-think">
            <span className="dots"><span /><span /><span /></span>
            {t('lobbyRoom.round.aiThinking')}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultScreen({ data, property, nickname, totalRounds, voteState, voted, onVoteNext, players, youId }) {
  const { t, formatCurrency, formatPercent, formatNumber } = useLocale()
  const { round, actual_price, player_results = [], ai_predictions = {} } = data

  const allPreds = useMemo(() => [
    ...player_results.map(p => ({
      name: p.nickname,
      type: 'player',
      price: p.guess,
      dev: p.deviation_pct,
      points: p.points_earned,
      hasSubmitted: p.guess > 0,
    })),
    ...Object.entries(ai_predictions).map(([name, pred]) => ({
      name: name.toUpperCase(),
      type: 'ai',
      price: pred.price_try,
      dev: pred.deviation_pct,
      points: pred.points_earned,
      hasSubmitted: pred.price_try > 0,
    })),
  ].sort((a, b) => {
    if (a.hasSubmitted !== b.hasSubmitted) {
      return a.hasSubmitted ? -1 : 1
    }
    return Math.abs(a.dev ?? 0) - Math.abs(b.dev ?? 0)
  }), [player_results, ai_predictions])

  const hasAnyWinner = allPreds[0]?.hasSubmitted
  const winnerName = allPreds[0]?.name ?? '-'
  const winnerType = allPreds[0]?.type ?? 'player'
  const isWinner = hasAnyWinner && winnerType === 'player' && winnerName === nickname
  const meResult = player_results.find(p => p.nickname === nickname)

  const opponent = allPreds.length > 1
    ? (allPreds[0].name === nickname && allPreds[0].type === 'player' ? allPreds[1] : allPreds[0])
    : null
  const hasOpponent = opponent && opponent.hasSubmitted

  const avgDev = allPreds.filter(p => p.hasSubmitted).length
    ? (allPreds.filter(p => p.hasSubmitted).reduce((s, p) => s + Math.abs(p.dev ?? 0), 0) / allPreds.filter(p => p.hasSubmitted).length).toFixed(2)
    : '-'
  const bestDev = hasAnyWinner && allPreds[0]?.dev?.toFixed?.(2) ? allPreds[0].dev.toFixed(2) : '-'
  const totalPts = player_results.reduce((s, p) => s + (p.points_earned ?? 0), 0)

  const isFinalRound = totalRounds && round >= totalRounds
  const votedIds = new Set(voteState.voted ?? [])
  const neededIds = new Set(voteState.needed ?? [])
  const voteParticipants = players.filter(
    p => p.connected !== false && (votedIds.has(p.player_id) || neededIds.has(p.player_id))
  )
  const votedCount = voteParticipants.filter(p => votedIds.has(p.player_id)).length
  const totalParticipants = voteParticipants.length
  const youVoted = voted || (youId && votedIds.has(youId))

  return (
    <>
      <div className="lr-result-grid">
        <div>
          <div className="lr-property">
            {property && (
              <div className="lr-property-map">
                <DistrictMap ilce={property.ilce} mahalle={property.mahalle} />
              </div>
            )}
            <div className="lr-property-body">
              <div className="lr-location">
                <Icon name="pin" size={16} />
                {t('lobbyRoom.result.roundResult', { round })}
              </div>
              <div className="lr-actual">
                {t('lobbyRoom.result.actualPrice')} <span className="v">{formatCurrency(actual_price)}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="lr-winbanner">
            <h2>
              {!hasAnyWinner
                ? t('lobbyRoom.result.noWinner')
                : isWinner
                  ? t('lobbyRoom.result.youWon')
                  : winnerType === 'ai'
                    ? t('lobbyRoom.result.aiWon', { name: winnerName })
                    : t('lobbyRoom.result.playerWon', { name: winnerName })}
            </h2>
            <div className="sub">{t('lobbyRoom.result.closest')}</div>
          </div>

          {hasOpponent ? (
            <div className="lr-vs">
              <div className={`lr-vs-card you ${isWinner ? 'winner-card' : ''}`}>
                <div className="n">{nickname}</div>
                <div className="g">{meResult && meResult.guess > 0 ? formatCurrency(meResult.guess) : '-'}</div>
                <div className="d">
                  {meResult && meResult.guess > 0 ? `${formatPercent(meResult.deviation_pct)} ${t('lobbyRoom.result.deviation')}` : t('lobbyRoom.result.noGuess')}
                  {meResult && ` · +${meResult.points_earned}p`}
                </div>
              </div>
              <div className="sep">VS</div>
              <div className={`lr-vs-card ${!isWinner ? 'winner-card' : ''}`}>
                <div className="n">
                  {opponent.name}
                  <span className="tag">{opponent.type === 'ai' ? t('common.ai') : t('common.player')}</span>
                </div>
                <div className="g">{formatCurrency(opponent.price)}</div>
                <div className="d">{formatPercent(opponent.dev, { minimumFractionDigits: 2 })} {t('lobbyRoom.result.deviation')} · +{opponent.points ?? 0}p</div>
              </div>
            </div>
          ) : (
            <div className="lr-vs-single">
              <div className={`lr-vs-card you ${isWinner ? 'winner-card' : ''}`} style={{ margin: '16px auto 0', maxWidth: '320px' }}>
                <div className="n">{nickname}</div>
                <div className="g">{meResult && meResult.guess > 0 ? formatCurrency(meResult.guess) : '-'}</div>
                <div className="d">
                  {meResult && meResult.guess > 0 ? `${formatPercent(meResult.deviation_pct)} ${t('lobbyRoom.result.deviation')}` : t('lobbyRoom.result.noGuess')}
                  {meResult && ` · +${meResult.points_earned}p`}
                </div>
              </div>
            </div>
          )}

          <div className="lr-summary">
            <div><div className="l">{t('lobbyRoom.result.averageDeviation')}</div><div className="v">{avgDev === '-' ? avgDev : formatPercent(Number(avgDev), { minimumFractionDigits: 2 })}</div></div>
            <div><div className="l">{t('lobbyRoom.result.best')}</div><div className="v">{bestDev === '-' ? bestDev : formatPercent(Number(bestDev), { minimumFractionDigits: 2 })}</div></div>
            <div><div className="l">{t('lobbyRoom.result.totalPoints')}</div><div className="v">+{formatNumber(totalPts)}</div></div>
          </div>
        </div>

        <div>
          <div className="lr-panel">
            <div className="lr-panel-header"><h3>{t('lobbyRoom.result.allGuesses')}</h3></div>
            <div className="lr-panel-body">
              {allPreds.map((p, i) => (
                <div className={`lr-pred-row${p.name === nickname && p.type === 'player' ? ' me-row' : ''}`} key={`${p.type}-${p.name}-${i}`}>
                  {p.type === 'ai'
                    ? <ModelBadge name={p.name} size={26} />
                    : <span className="lr-pavatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(p.name)}</span>}
                  <span className="nm">
                    {p.name}
                    <span className="tag">{p.type === 'ai' ? t('common.ai') : t('common.player')}</span>
                  </span>
                  <span className="pr">{p.hasSubmitted ? formatCurrency(p.price) : '-'}</span>
                  <span className={`dv ${!p.hasSubmitted ? '' : Math.abs(p.dev ?? 0) < 5 ? 'good' : 'bad'}`}>
                    {p.hasSubmitted ? formatPercent(p.dev, { minimumFractionDigits: 2 }) : '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!isFinalRound && (
        <div className="lr-vote-card">
          <div className="lr-vote-head">
            <div>
              <h4>{t('lobbyRoom.result.nextRound')}</h4>
              <p>{t('lobbyRoom.result.waitingPlayers')}</p>
            </div>
            <button
              type="button"
              className={`hr-btn ${youVoted ? 'hr-btn-outline' : 'hr-btn-primary'}`}
              onClick={onVoteNext}
              disabled={youVoted}
            >
              {youVoted ? t('lobbyRoom.result.ready') : t('lobbyRoom.result.nextRoundButton')}
            </button>
          </div>
          <div className="lr-vote-progress">
            <div className="lr-vote-count">
              {t('lobbyRoom.result.readyPlayers')}: <strong>{votedCount} / {totalParticipants}</strong>
            </div>
            <div className="lr-vote-chips">
              {voteParticipants.map(p => {
                const ok = votedIds.has(p.player_id)
                return (
                  <span key={p.player_id} className={`lr-vote-chip${ok ? ' ok' : ''}`}>
                    <span className="lr-pavatar" style={{ width: 22, height: 22, fontSize: 9 }}>{initials(p.nickname)}</span>
                    {p.nickname}
                    {ok && <span className="check">✓</span>}
                  </span>
                )
              })}
              {totalParticipants === 0 && <span className="lr-vote-empty">{t('lobbyRoom.waiting.waitingPlayer')}</span>}
            </div>
          </div>
        </div>
      )}

      <div className="lr-result-bottom">
        <div className="lr-dots">
          {Array.from({ length: totalRounds || round }, (_, i) => {
            const n = i + 1
            const cls = n < round ? 'done' : n === round ? 'curr' : ''
            return <span key={n} className={cls}>{n}</span>
          })}
        </div>
        {isFinalRound && (
          <span className="lr-final-pending">{t('lobbyRoom.result.finalPreparing')}</span>
        )}
      </div>
    </>
  )
}

function FinalLeaderboard({ data, roundHistory, onExit, isHost, onCloseRoom }) {
  const { t, formatCurrency, formatNumber, formatPercent } = useLocale()
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0)
  const players = data?.players ?? []
  const top3 = players.slice(0, 3)
  const rest = players.slice(3)

  const rd = roundHistory[currentRoundIdx]
  const sorted = rd ? [...(rd.player_results ?? [])].sort((a, b) => {
    const aSub = a.guess > 0
    const bSub = b.guess > 0
    if (aSub !== bSub) {
      return aSub ? -1 : 1
    }
    return a.deviation_pct - b.deviation_pct
  }) : []
  const aiEntries = rd ? Object.entries(rd.ai_predictions ?? {}) : []

  return (
    <div className="lr-final">
      <h2>{t('lobbyRoom.final.title')}</h2>
      {top3.length > 0 && (
        <div className="lr-podium">
          {[1, 0, 2].map(i => {
            const p = top3[i]
            if (!p) return <div key={i} />
            const cls = i === 0 ? 'first animate-podium' : i === 1 ? 'second animate-podium' : 'third animate-podium'
            return (
              <div className={`lr-podium-step ${cls}`} key={p.player_id}>
                <div className="rank">{p.rank}</div>
                <div className="nick">
                  {p.is_ai && <span className="lr-ai-badge">{t('common.ai')}</span>}
                  {p.nickname}{p.rank === 1 ? ' 👑' : ''}
                </div>
                <div className="score">{formatNumber(p.score)} {t('lobbyRoom.final.points')}</div>
              </div>
            )
          })}
        </div>
      )}

      <div className="lr-final-list">
        {rest.map(p => (
          <div className="lr-final-row" key={p.player_id}>
            <span className="rk">#{p.rank}</span>
            <span className="nick">
              {p.is_ai && <span className="lr-ai-badge">{t('common.ai')}</span>}
              {p.nickname}
            </span>
            <span className="sc">{formatNumber(p.score)}p</span>
          </div>
        ))}
      </div>

      {roundHistory.length > 0 && rd && (
        <div className="lr-round-breakdown">
          <h3 className="lr-breakdown-title">{t('lobbyRoom.final.roundSummaries')}</h3>

          <div className="lr-slider-nav">
            <button
              type="button"
              className="hr-btn hr-btn-outline lr-slider-btn"
              onClick={() => setCurrentRoundIdx(i => Math.max(0, i - 1))}
              disabled={currentRoundIdx === 0}
            >
              ◀
            </button>
            <span className="lr-slider-title">{t('lobbyRoom.final.roundSummary', { round: rd.round })}</span>
            <button
              type="button"
              className="hr-btn hr-btn-outline lr-slider-btn"
              onClick={() => setCurrentRoundIdx(i => Math.min(roundHistory.length - 1, i + 1))}
              disabled={currentRoundIdx === roundHistory.length - 1}
            >
              ▶
            </button>
          </div>

          <div className="lr-round-card animate-round-card">
            <div className="lr-round-card-header">
              <span className="lr-round-label">{t('lobbyRoom.final.round')} {rd.round}</span>
              <span className="lr-round-price">{t('lobbyRoom.final.actualPrice')}: <strong>{formatCurrency(rd.actual_price)}</strong></span>
            </div>

            <div className="lr-breakdown-section">
              <div className="lr-breakdown-section-title">{t('lobbyRoom.final.players')}</div>
              <div className="lr-breakdown-table">
                <div className="lr-breakdown-row lr-breakdown-header">
                  <span>{t('common.player')}</span>
                  <span>{t('lobbyRoom.final.guess')}</span>
                  <span>{t('lobbyRoom.final.deviation')}</span>
                  <span>{t('lobbyRoom.final.pointsColumn')}</span>
                </div>
                {sorted.map((pr, idx) => (
                  <div className={`lr-breakdown-row${idx === 0 && pr.guess > 0 ? ' winner' : ''}`} key={pr.player_id}>
                    <span className="lr-breakdown-nick">
                      {idx < 3 && pr.guess > 0 && <span className="lr-breakdown-medal">{ROUND_MEDALS[idx]}</span>}
                      {pr.nickname}
                    </span>
                    <span>{pr.guess > 0 ? formatCurrency(pr.guess) : '-'}</span>
                    <span className={`lr-deviation${idx === 0 && pr.guess > 0 ? ' best' : ''}`}>
                      {pr.guess > 0 ? formatPercent(pr.deviation_pct, { minimumFractionDigits: 1 }) : '-'}
                    </span>
                    <span className="lr-points">{pr.points_earned > 0 ? `+${pr.points_earned}` : '0'}</span>
                  </div>
                ))}
              </div>
            </div>

            {aiEntries.length > 0 && (
              <div className="lr-breakdown-section">
                <div className="lr-breakdown-section-title">{t('lobbyRoom.final.modelPredictions')}</div>
                <div className="lr-breakdown-table">
                  <div className="lr-breakdown-row lr-breakdown-header">
                    <span>{t('lobbyRoom.final.model')}</span>
                    <span>{t('lobbyRoom.final.guess')}</span>
                    <span>{t('lobbyRoom.final.deviation')}</span>
                    <span>{t('lobbyRoom.final.pointsColumn')}</span>
                  </div>
                  {aiEntries.map(([model, pred]) => (
                    <div className="lr-breakdown-row ai" key={model}>
                      <span className="lr-breakdown-nick lr-ai-model">{model}</span>
                      <span>{formatCurrency(pred.price_try)}</span>
                      <span className="lr-deviation">{formatPercent(pred.deviation_pct, { minimumFractionDigits: 1 })}</span>
                      <span className="lr-points">{pred.points_earned > 0 ? `+${pred.points_earned}` : '0'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lr-slider-dots">
            {roundHistory.map((_, idx) => (
              <button
                type="button"
                key={idx}
                className={`lr-slider-dot${idx === currentRoundIdx ? ' active' : ''}`}
                onClick={() => setCurrentRoundIdx(idx)}
                aria-label={t('lobbyRoom.final.roundSummary', { round: idx + 1 })}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
        {isHost && (
          <button type="button" className="hr-btn hr-btn-outline" onClick={onCloseRoom}>{t('common.actions.closeRoom')}</button>
        )}
        <button type="button" className="hr-btn hr-btn-primary" onClick={onExit}>{t('common.actions.backToLobby')}</button>
      </div>
    </div>
  )
}
