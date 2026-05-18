import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { wsUrl } from '../lib/api'
import AppShell from '../components/AppShell'
import { Icon, ModelBadge } from '../components/icons'
import './LobbyRoom.css'

const ROUND_COUNT_OPTIONS = [3, 6]
const ROUND_DURATION_OPTIONS = [15, 30]
const ACTIVITY_MAX = 20

const ACTIVITY_VERBS = {
  joined: 'lobiye katıldı',
  rejoined: 'lobiye geri döndü',
  left: 'lobiden ayrıldı',
  ready: 'oyunu başlattı',
  settings_changed: 'oyun ayarlarını güncelledi',
  ai_toggled: 'AI rakiplerini güncelledi',
  submitted: 'tahminini gönderdi',
  voted_next: 'sonraki tura hazır',
  round_advanced: 'sonraki tura geçildi',
}

const fmt = (n) => n?.toLocaleString('tr-TR') ?? '—'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function relativeTime(ts) {
  if (!ts) return ''
  const diff = Math.max(0, Date.now() - ts)
  if (diff < 10_000) return 'az önce'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}sn önce`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}dk önce`
  return `${Math.floor(diff / 3_600_000)}sa önce`
}

export default function LobbyRoom() {
  const { id: lobbyId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const fallbackNick = user?.displayName || user?.email?.split('@')[0] || 'Oyuncu'
  const nickname = state?.nickname ?? fallbackNick

  const [screen, setScreen] = useState('waiting')
  const [players, setPlayers] = useState([])
  const [roundData, setRoundData] = useState(null)
  const [resultData, setResultData] = useState(null)
  const [leaderboardData, setLeaderboardData] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [guess, setGuess] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef(null)

  // Lobby state hydrated from the server.
  const [settings, setSettings] = useState({ round_count: 3, round_duration_sec: 15 })
  const [aiModels, setAIModels] = useState({})
  const [availableAI, setAvailableAI] = useState([])
  const [hostId, setHostId] = useState(null)
  const [youId, setYouId] = useState(null)
  const [activity, setActivity] = useState([])
  const [voteState, setVoteState] = useState({ round: 0, voted: [], needed: [] })
  const [voted, setVoted] = useState(false)
  const [error, setError] = useState(null)

  const isHost = !!youId && youId === hostId

  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!user) return
    user.getIdToken().then(token => setUrl(wsUrl(lobbyId, token)))
  }, [user, lobbyId])

  const pushActivity = useCallback((entry) => {
    setActivity(prev => [entry, ...prev].slice(0, ACTIVITY_MAX))
  }, [])

  const onMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'LOBBY_STATE': {
        const p = msg.payload || {}
        setHostId(p.host_id ?? null)
        setYouId(p.you_id ?? null)
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
          if (prev.find(p => p.player_id === id)) {
            return prev.map(p => p.player_id === id ? { ...p, connected: true, nickname: msg.payload.nickname ?? p.nickname } : p)
          }
          return [...prev, { ...msg.payload, connected: true }]
        })
        break
      case 'PLAYER_LEFT':
        setPlayers(prev => {
          const id = msg.payload?.player_id
          if (!id) return prev
          // Mark disconnected during a game; drop entirely during waiting.
          return prev.map(p => p.player_id === id ? { ...p, connected: false } : p)
        })
        break
      case 'SETTINGS_UPDATED':
        if (msg.payload?.settings) setSettings(msg.payload.settings)
        if (msg.payload?.ai_models) setAIModels(msg.payload.ai_models)
        break
      case 'LOBBY_ACTIVITY':
        pushActivity({
          id: `${msg.payload?.ts ?? Date.now()}-${msg.payload?.actor_id ?? ''}-${msg.payload?.kind ?? ''}-${Math.random().toString(36).slice(2, 6)}`,
          kind: msg.payload?.kind ?? '',
          actor: msg.payload?.actor_nickname ?? 'Sistem',
          ts: msg.payload?.ts ?? Date.now(),
        })
        break
      case 'ROUND_START':
        clearInterval(timerRef.current)
        setRoundData(msg.payload)
        setSubmitted(false)
        setGuess('')
        setScreen('round')
        setTimeLeft(msg.payload.time_limit_sec)
        setVoted(false)
        setVoteState({ round: 0, voted: [], needed: [] })
        break
      case 'ROUND_RESULT':
        clearInterval(timerRef.current)
        setResultData(msg.payload)
        setScreen('result')
        setVoted(false)
        break
      case 'ROUND_VOTE_STATE':
        setVoteState({
          round: msg.payload?.round ?? 0,
          voted: msg.payload?.voted ?? [],
          needed: msg.payload?.needed ?? [],
        })
        break
      case 'LEADERBOARD':
        setLeaderboardData(msg.payload)
        setScreen('leaderboard')
        break
      case 'ERROR':
        setError(msg.payload?.message ?? 'Bir hata oluştu')
        setTimeout(() => setError(null), 4000)
        break
      default:
        break
    }
  }, [pushActivity])

  const { connected, send } = useWebSocket(url, onMessage)

  const joinedRef = useRef(false)
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
    if (screen !== 'round') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => (t <= 1 ? 0 : t - 1))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [roundData?.round, screen])

  // Keep activity timestamps fresh.
  const [, forceRerender] = useState(0)
  useEffect(() => {
    const i = setInterval(() => forceRerender(x => x + 1), 15_000)
    return () => clearInterval(i)
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

  if (!user) {
    navigate('/login')
    return null
  }

  const subnavRound = screen === 'round' && roundData
    ? { label: 'Tur', value: `${roundData.round} / ${roundData.total_rounds}` }
    : screen === 'result' && resultData
      ? { label: 'Tur', value: `${resultData.round}` }
      : null

  const aiActiveCount = availableAI.filter(m => aiModels[m.id]).length

  return (
    <AppShell>
      <div className="lr-subnav">
        <div className="lr-subnav-item">Oda <strong>{lobbyId}</strong></div>
        <div className="lr-subnav-item">Mod <strong>Multiplayer</strong></div>
        {subnavRound && <div className="lr-subnav-item">{subnavRound.label} <strong>{subnavRound.value}</strong></div>}
        {screen === 'round' && (
          <div className="lr-subnav-item">Süre <strong style={{ color: timeLeft <= 10 ? '#fca5a5' : '#fff' }}>{timeLeft}s</strong></div>
        )}
        <div className="lr-subnav-item">Host <strong>{
          (hostId && players.find(p => p.player_id === hostId)?.nickname) || (isHost ? nickname : '—')
        }</strong></div>
        <div className="lr-subnav-item">Oyuncular <strong>{players.filter(p => p.connected !== false).length} / 8</strong></div>
        <div className="lr-subnav-spacer" />
        <span className={`lr-conn ${connected ? 'ok' : 'bad'}`}>
          {connected ? 'Bağlı' : 'Bağlanılıyor…'}
        </span>
        {/* "Oyundan Çık" just disconnects the WS — the server keeps your slot
            (and score) so navigating back to /lobby/<id> reconnects you. */}
        <button className="hr-btn hr-btn-danger" onClick={() => navigate('/lobby')}>
          Oyundan Çık
        </button>
      </div>

      {error && <div className="lr-error">{error}</div>}

      {screen === 'waiting' && (
        <WaitingScreen
          players={players}
          isHost={isHost}
          onStart={handleStartGame}
          settings={settings}
          onChangeSetting={handleUpdateSetting}
          availableAI={availableAI}
          aiModels={aiModels}
          aiActiveCount={aiActiveCount}
          onToggleAI={handleToggleAI}
          activity={activity}
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
        />
      )}
      {screen === 'result' && resultData && (
        <ResultScreen
          data={resultData}
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
        <FinalLeaderboard data={leaderboardData} onExit={() => navigate('/lobby')} />
      )}
    </AppShell>
  )
}

function WaitingScreen({
  players, isHost, onStart, settings, onChangeSetting,
  availableAI, aiModels, aiActiveCount, onToggleAI, activity,
}) {
  const connectedPlayers = players.filter(p => p.connected !== false)
  return (
    <div className="lr-wait-grid">
      <div>
        <div className="lr-panel">
          <div className="lr-panel-header">
            <h3>Oyuncular ({connectedPlayers.length})</h3>
            <span className="lr-pill ready">Canlı</span>
          </div>
          <div className="lr-panel-body">
            {connectedPlayers.length === 0 && (
              <div className="lr-player-row empty">Oyuncu bekleniyor…</div>
            )}
            {connectedPlayers.map(p => (
              <div className="lr-player-row" key={p.player_id}>
                <span className="lr-pavatar">{initials(p.nickname)}</span>
                <span className="lr-player-name">{p.nickname}</span>
                <span className="lr-pill ready">Hazır</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lr-panel" style={{ marginTop: 16 }}>
          <div className="lr-panel-header">
            <h3>Lobi Aktivitesi</h3>
          </div>
          <div className="lr-panel-body">
            {activity.length === 0 && (
              <div className="lr-activity" style={{ fontStyle: 'italic' }}>Henüz aktivite yok.</div>
            )}
            {activity.map(a => (
              <div key={a.id} className="lr-activity">
                <strong>{a.actor}</strong> {ACTIVITY_VERBS[a.kind] ?? a.kind}
                <span className="time">{relativeTime(a.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="lr-panel">
          <div className="lr-panel-header">
            <h3>Oyun Ayarları</h3>
            {!isHost && <span style={{ fontSize: 11, color: 'var(--hr-muted)' }}>Sadece host değiştirebilir</span>}
          </div>
          <div className="lr-panel-body">
            <SettingRow
              label="Tur Sayısı"
              options={ROUND_COUNT_OPTIONS}
              active={settings.round_count}
              disabled={!isHost}
              onChange={(v) => onChangeSetting('round_count', v)}
              renderOption={(v) => v}
            />
            <SettingRow
              label="Tur Süresi"
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
            <h4>Hazır mısın?</h4>
            <p>Tüm oyuncular katıldıktan sonra oyunu başlat.</p>
            <button onClick={onStart}>▶ Oyuna Başla</button>
          </div>
        ) : (
          <div className="lr-start-card">
            <h4>Host'u bekliyoruz</h4>
            <p>Oyun ayarları tamamlandığında host oyunu başlatacak.</p>
            <div className="wait">Bekleniyor…</div>
          </div>
        )}
      </div>

      <div>
        <div className="lr-panel">
          <div className="lr-panel-header">
            <h3>AI Rakipleri</h3>
            <span style={{ fontSize: 12, color: 'var(--hr-muted)' }}>
              {aiActiveCount} / {availableAI.length} aktif
            </span>
          </div>
          <div className="lr-panel-body">
            {availableAI.length === 0 && (
              <div className="lr-player-row empty">Modeller yükleniyor…</div>
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
                    aria-label={`${m.name} ${on ? 'açık' : 'kapalı'}`}
                    onClick={() => onToggleAI(m.id, !on)}
                    disabled={!isHost}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="lr-preview">
          <img src="/assets/landing-page-house-img.png" alt="Sample listing" />
          <div className="cap">
            <strong>Örnek İlan</strong>
            120 m² · 3+1 · Kadıköy/İstanbul
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

function RoundScreen({ data, guess, setGuess, submitted, onSubmit, players, nickname }) {
  const { property } = data
  const fields = [
    { l: 'Alan', v: `${property.metrekare_brut} m²`, icon: 'ruler' },
    { l: 'Oda', v: property.oda_salon, icon: 'bed' },
    { l: 'Yaş', v: property.bina_yasi, icon: 'building' },
    { l: 'Kat', v: `${property.kat} / ${property.kat_sayisi}`, icon: 'floor' },
    { l: 'Isıtma', v: property.isitma, icon: 'heater' },
    { l: 'Balkon', v: property.balkon, icon: 'balcony' },
    { l: 'Asansör', v: property.asansor, icon: 'elevator' },
    { l: 'Otopark', v: property.otopark, icon: 'parking' },
  ]
  return (
    <div className="lr-round-grid">
      <div>
        <div className="lr-property">
          <img className="lr-property-img" src="/assets/landing-page-house-img.png" alt="Listing" />
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
                  <div className="v">{f.v ?? '—'}</div>
                </div>
              ))}
            </div>
            <button className="hr-btn hr-btn-outline" style={{ width: '100%' }}>
              <Icon name="map" size={16} />
              Haritada Göster
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="lr-guess-card">
          <h4>Sıra Sende!</h4>
          <p className="sub">Bu evin fiyatını tahmin et</p>
          {!submitted ? (
            <form onSubmit={onSubmit}>
              <input
                type="number"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="₺ Tutar gir"
                min="1"
                className="lr-guess-input"
              />
              <div className="lr-quick-row">
                {[1_000_000, 2_000_000, 5_000_000, 10_000_000].map(v => (
                  <button type="button" key={v} className="lr-quick" onClick={() => setGuess(String(v))}>
                    {v >= 10_000_000 ? '10M+' : `${v / 1_000_000}M`}
                  </button>
                ))}
              </div>
              <button type="submit" className="hr-btn hr-btn-primary hr-btn-lg" style={{ width: '100%' }}>
                <Icon name="send" size={16} />
                Tahmini Gönder
              </button>
              <div className="lr-tip">
                💡 İpucu: konum, alan, bina yaşı en yakın tahmini yapmana yardımcı olur.
              </div>
            </form>
          ) : (
            <div className="lr-submitted">✓ Tahminin gönderildi — sonuç bekleniyor…</div>
          )}
        </div>

        <div className="lr-progress">
          <h4>Canlı İlerleme</h4>
          {(players.length ? players.filter(p => p.connected !== false) : [{ player_id: 'self', nickname }]).map(p => (
            <div className="lr-player-row" key={p.player_id}>
              <span className="lr-pavatar">{initials(p.nickname)}</span>
              <span className="lr-player-name">{p.nickname}</span>
              <span className={`lr-pill ${p.nickname === nickname && submitted ? 'ready' : 'waiting'}`}>
                {p.nickname === nickname && submitted ? 'Gönderildi' : 'Düşünüyor'}
              </span>
            </div>
          ))}
          <div className="lr-think">
            <span className="dots"><span /><span /><span /></span>
            AI modelleri düşünüyor…
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultScreen({ data, nickname, totalRounds, voteState, voted, onVoteNext, players, youId }) {
  const { round, actual_price, player_results = [], ai_predictions = {} } = data
  const winner = player_results[0]
  const me = player_results.find(p => p.nickname === nickname) ?? player_results[0]
  const isWinner = winner?.nickname === nickname

  const allPreds = useMemo(() => [
    ...player_results.map(p => ({ name: p.nickname, type: 'Oyuncu', price: p.guess, dev: p.deviation_pct })),
    ...Object.entries(ai_predictions).map(([name, pred]) => ({
      name: name.toUpperCase(),
      type: 'AI',
      price: pred.price_try,
      dev: pred.deviation_pct,
    })),
  ].sort((a, b) => Math.abs(a.dev ?? 0) - Math.abs(b.dev ?? 0)), [player_results, ai_predictions])

  const avgDev = allPreds.length
    ? (allPreds.reduce((s, p) => s + Math.abs(p.dev ?? 0), 0) / allPreds.length).toFixed(2)
    : '—'
  const bestDev = allPreds[0]?.dev?.toFixed?.(2) ?? '—'
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
            <img className="lr-property-img" src="/assets/landing-page-house-img.png" alt="Listing" />
            <div className="lr-property-body">
              <div className="lr-location">
                <Icon name="pin" size={16} />
                Tur {round} sonucu
              </div>
              <div className="lr-actual">
                Gerçek Fiyat <span className="v">₺{fmt(actual_price)}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="lr-winbanner">
            <h2>{isWinner ? '🎉 Kazandın!' : `🏆 ${winner?.nickname ?? '—'} kazandı`}</h2>
            <div className="sub">Bu turda en yakın tahmini yaptı</div>
          </div>
          <div className="lr-vs">
            <div className="lr-vs-card you">
              <div className="n">{me?.nickname ?? 'Sen'}</div>
              <div className="g">₺{fmt(me?.guess)}</div>
              <div className="d">%{me?.deviation_pct ?? '—'} sapma · +{me?.points_earned ?? 0}p</div>
            </div>
            <div className="sep">VS</div>
            <div className="lr-vs-card">
              <div className="n">{winner?.nickname ?? '—'}</div>
              <div className="g">₺{fmt(winner?.guess)}</div>
              <div className="d">%{winner?.deviation_pct ?? '—'} sapma · +{winner?.points_earned ?? 0}p</div>
            </div>
          </div>
          <div className="lr-summary">
            <div><div className="l">Ort. Sapma</div><div className="v">%{avgDev}</div></div>
            <div><div className="l">En İyi</div><div className="v">%{bestDev}</div></div>
            <div><div className="l">Toplam Puan</div><div className="v">+{totalPts}</div></div>
          </div>
        </div>

        <div>
          <div className="lr-panel">
            <div className="lr-panel-header"><h3>Tüm Tahminler</h3></div>
            <div className="lr-panel-body">
              {allPreds.map((p, i) => (
                <div className="lr-pred-row" key={`${p.type}-${p.name}-${i}`}>
                  {p.type === 'AI'
                    ? <ModelBadge name={p.name} size={26} />
                    : <span className="lr-pavatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(p.name)}</span>}
                  <span className="nm">
                    {p.name}
                    <span className="tag">{p.type}</span>
                  </span>
                  <span className="pr">₺{fmt(p.price)}</span>
                  <span className={`dv ${Math.abs(p.dev ?? 0) < 5 ? 'good' : 'bad'}`}>
                    %{p.dev?.toFixed?.(2) ?? p.dev}
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
              <h4>Sonraki Tur</h4>
              <p>Hazır olan tüm oyuncular bekleniyor.</p>
            </div>
            <button
              type="button"
              className={`hr-btn ${youVoted ? 'hr-btn-outline' : 'hr-btn-primary'}`}
              onClick={onVoteNext}
              disabled={youVoted}
            >
              {youVoted ? '✓ Hazırsın' : 'Sonraki Tur'}
            </button>
          </div>
          <div className="lr-vote-progress">
            <div className="lr-vote-count">
              Hazır oyuncular: <strong>{votedCount} / {totalParticipants}</strong>
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
              {totalParticipants === 0 && <span className="lr-vote-empty">Oyuncu bekleniyor…</span>}
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
          <span className="lr-final-pending">Final sıralaması hazırlanıyor…</span>
        )}
      </div>
    </>
  )
}

function FinalLeaderboard({ data, onExit }) {
  const players = data?.players ?? []
  const top3 = players.slice(0, 3)
  const rest = players.slice(3)
  return (
    <div className="lr-final">
      <h2>🏆 Oyun Bitti — Final Sıralaması</h2>
      {top3.length > 0 && (
        <div className="lr-podium">
          {[1, 0, 2].map(i => {
            const p = top3[i]
            if (!p) return <div key={i} />
            const cls = i === 0 ? 'first' : i === 1 ? 'second' : 'third'
            return (
              <div className={`lr-podium-step ${cls}`} key={p.player_id}>
                <div className="rank">{p.rank}</div>
                <div className="nick">{p.nickname}{p.rank === 1 ? ' 👑' : ''}</div>
                <div className="score">{fmt(p.score)} puan</div>
              </div>
            )
          })}
        </div>
      )}
      <div className="lr-final-list">
        {rest.map(p => (
          <div className="lr-final-row" key={p.player_id}>
            <span className="rk">#{p.rank}</span>
            <span className="nick">{p.nickname}</span>
            <span className="sc">{fmt(p.score)} p</span>
          </div>
        ))}
      </div>
      <button className="hr-btn hr-btn-primary hr-btn-lg" onClick={onExit}>
        Lobiye Dön
      </button>
    </div>
  )
}
