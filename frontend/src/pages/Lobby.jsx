import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContextValue'
import { useLocale } from '../contexts/localeContextValue'
import { createLobby, getLobby, getMyHistory, getMyLeague, getMyLobbies, getLeaderboard } from '../lib/api'
import AppShell from '../components/AppShell'
import ParticleBanner from '../components/ParticleBanner'
import { Icon } from '../components/icons'
import './Lobby.css'

const RANK_MEDALS = ['🥇', '🥈', '🥉']
const LEAGUE_EMOJI = { bronze: '🥉', gold: '🥇', diamond: '💎' }

function statusLabel(status, t) {
  if (status === 'waiting') return { text: t('lobby.status.waiting'), cls: 'lp-status-waiting' }
  if (status === 'playing') return { text: t('lobby.status.playing'), cls: 'lp-status-playing' }
  if (status === 'finished') return { text: t('lobby.status.finished'), cls: 'lp-status-finished' }
  return { text: status, cls: '' }
}

function roleLabel(role, t) {
  return role === 'host' ? t('lobby.roles.host') : t('lobby.roles.player')
}

function actionLabel(lobby, t) {
  if (lobby.status === 'finished') return t('lobby.actions.score')
  if (lobby.status === 'playing') return t('lobby.actions.resumeGame')
  return lobby.role === 'host' ? t('lobby.actions.goRoom') : t('lobby.actions.backToWaitingRoom')
}

export default function Lobby() {
  const { user } = useAuth()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { t, resolveError, formatDate, formatNumber, formatRelativeTime } = useLocale()
  const [nickname, setNickname] = useState(user?.displayName ?? '')
  const [joinId, setJoinId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [myLobbies, setMyLobbies] = useState([])
  const [gameHistory, setGameHistory] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [myLeague, setMyLeague] = useState(null)

  useEffect(() => {
    if (!user) return
    user.getIdToken().then(idToken => {
      getMyLobbies(user, idToken).then(data => setMyLobbies(Array.isArray(data) ? data : [])).catch(() => {})
      getMyHistory(user, idToken).then(data => setGameHistory(data?.records ?? [])).catch(() => {})
      getMyLeague(user, idToken).then(data => setMyLeague(data)).catch(() => {})
    })
    getLeaderboard().then(data => setLeaderboard(data?.entries ?? [])).catch(() => {})
  }, [user])

  async function handleCreate(event) {
    event.preventDefault()
    if (!nickname.trim()) return
    setLoading(true)
    setError('')
    try {
      const idToken = await user.getIdToken()
      const lobby = await createLobby(user, idToken, nickname.trim())
      navigate(`/lobby/${lobby.id}`, { state: { nickname: nickname.trim(), isHost: true } })
    } catch (err) {
      setError(resolveError(err, 'errors.codes.lobby_create_failed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(event) {
    event.preventDefault()
    const code = joinId.trim()
    if (!code || !nickname.trim()) return
    setLoading(true)
    setError('')
    try {
      const idToken = await user.getIdToken()
      await getLobby(user, idToken, code)
      navigate(`/lobby/${code}`, { state: { nickname: nickname.trim(), isHost: false } })
    } catch (err) {
      setError(resolveError(err, 'errors.codes.lobby_access_failed'))
    } finally {
      setLoading(false)
    }
  }

  const displayName = nickname || user?.displayName || user?.email?.split('@')[0] || t('common.player')
  const notice = state?.notice ?? ''
  const leagueLabels = t('lobby.leagueLabels')
  const topLeaders = useMemo(() => leaderboard.slice(0, 3), [leaderboard])

  return (
    <AppShell>
      <ParticleBanner className="lp-header">
        <div>
          <h1>{t('lobby.welcome.title', { name: displayName })}</h1>
          <p>{t('lobby.welcome.subtitle')}</p>
        </div>
        {myLeague?.league && (
          <div className={`lp-league-card lp-league-${myLeague.league}`}>
            <div className="lp-league-emoji">{LEAGUE_EMOJI[myLeague.league] ?? '🏷️'}</div>
            <div className="lp-league-info">
              <div className="lp-league-name">{leagueLabels[myLeague.league] ?? myLeague.league} {t('lobby.welcome.leagueSuffix')}</div>
              <div className="lp-league-lp">{myLeague.lp ?? 0} / {myLeague.promote_at ?? 100} LP</div>
              <div className="lp-league-bar">
                <div
                  className="lp-league-bar-fill"
                  style={{ width: `${Math.max(0, Math.min(100, (myLeague.lp ?? 0) / (myLeague.promote_at ?? 100) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </ParticleBanner>

      {notice && <div className="lp-notice">{notice}</div>}
      {error && <div className="lp-error">{error}</div>}

      <div className="lp-grid">
        <div className="lp-card" style={{ '--i': 0 }}>
          <div className="lp-card-icon"><Icon name="sparkle" size={22} /></div>
          <h2>{t('lobby.cards.createTitle')}</h2>
          <p className="lp-card-desc">{t('lobby.cards.createDesc')}</p>
          <form onSubmit={handleCreate}>
            <div className="lp-field">
              <label htmlFor="nick-create">{t('lobby.fields.nickname')}</label>
              <input
                id="nick-create"
                className="lp-input"
                value={nickname}
                onChange={event => setNickname(event.target.value)}
                placeholder={t('lobby.fields.nicknamePlaceholder')}
                maxLength={20}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !nickname.trim()}
              className="hr-btn hr-btn-primary hr-btn-lg"
              style={{ width: '100%' }}
            >
              {loading ? t('lobby.actions.creatingRoom') : t('lobby.actions.createRoom')}
            </button>
          </form>
        </div>

        <div className="lp-card" style={{ '--i': 1 }}>
          <div className="lp-card-icon"><Icon name="users" size={22} /></div>
          <h2>{t('lobby.cards.joinTitle')}</h2>
          <p className="lp-card-desc">{t('lobby.cards.joinDesc')}</p>
          <form onSubmit={handleJoin}>
            <div className="lp-field">
              <label htmlFor="nick-join">{t('lobby.fields.nickname')}</label>
              <input
                id="nick-join"
                className="lp-input"
                value={nickname}
                onChange={event => setNickname(event.target.value)}
                placeholder={t('lobby.fields.nicknamePlaceholder')}
                maxLength={20}
              />
            </div>
            <div className="lp-field">
              <label htmlFor="code">{t('lobby.fields.roomCode')}</label>
              <input
                id="code"
                className="lp-input code"
                value={joinId}
                onChange={event => setJoinId(event.target.value.toUpperCase())}
                placeholder="ABC234"
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !joinId.trim() || !nickname.trim()}
              className="hr-btn hr-btn-outline hr-btn-lg"
              style={{ width: '100%' }}
            >
              {loading ? t('lobby.actions.checking') : t('lobby.actions.join')}
            </button>
          </form>
        </div>
      </div>

      {myLobbies.length > 0 && (
        <div className="lp-active-lobbies">
          <h3>{t('lobby.sections.activeRooms')}</h3>
          <ul className="lp-lobby-list">
            {myLobbies.map((lobby, index) => {
              const status = statusLabel(lobby.status, t)
              return (
                <li key={lobby.id} className="lp-lobby-row" style={{ '--i': index }}>
                  <span className="lp-lobby-code">{lobby.id}</span>
                  <span className={`lp-status-badge ${status.cls}`}>{status.text}</span>
                  <span className="lp-status-badge lp-status-role">{roleLabel(lobby.role, t)}</span>
                  <span className="lp-lobby-meta">{t('lobby.playerCount', { count: lobby.player_count })} · {formatRelativeTime(lobby.created_at)}</span>
                  <button
                    className="hr-btn hr-btn-outline"
                    onClick={() => navigate(`/lobby/${lobby.id}`, {
                      state: {
                        nickname: nickname.trim() || displayName,
                        isHost: lobby.role === 'host',
                      },
                    })}
                  >
                    {actionLabel(lobby, t)} →
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="lp-info-row">
        <div className="lp-info" style={{ '--i': 0 }}>
          <h3>{t('lobby.sections.howToPlay')}</h3>
          <p>{t('lobby.sections.howToPlayDesc')}</p>
        </div>
        <div className="lp-info" style={{ '--i': 1 }}>
          <h3>{t('lobby.sections.leaders')}</h3>
          {topLeaders.length === 0 ? (
            <p className="lp-empty">{t('lobby.empty.noGames')}</p>
          ) : (
            <ul className="lp-info-list">
              {topLeaders.map((entry, index) => (
                <li key={entry.id}>
                  <span>{RANK_MEDALS[index] ?? `#${entry.rank}`} {entry.name}</span>
                  <strong>{formatNumber(entry.score)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="lp-info" style={{ '--i': 2 }}>
          <h3>{t('lobby.sections.myHistory')}</h3>
          {gameHistory.length === 0 ? (
            <p className="lp-empty">{t('lobby.empty.noCompletedGames')}</p>
          ) : (
            <ul className="lp-history-list">
              {gameHistory.slice(0, 5).map((record, index) => (
                <li key={`${record.lobby_id}-${record.finished_at}`} className="lp-history-row" style={{ '--i': index }}>
                  <span className="lp-history-rank">{RANK_MEDALS[record.rank - 1] ?? `#${record.rank}`}</span>
                  <span className="lp-history-info">
                    <span className="lp-history-nickname">{record.nickname}</span>
                    <span className="lp-history-date">{formatDate(record.finished_at, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span>
                  </span>
                  <strong className="lp-history-score">{formatNumber(record.score)}p</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}
