import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { wsUrl } from '../lib/api'
import AppShell from '../components/AppShell'
import './LobbyRoom.css'

const MOCK_OPPONENTS = [
  { name: 'Custom ANN', type: 'Neural Network', on: true },
  { name: 'Hybrid Model', type: 'Ensemble', on: true },
  { name: 'MLP Model', type: 'Neural Network', on: true },
  { name: 'CNN Model', type: 'Vision', on: false },
  { name: 'Transformer Model', type: 'LLM', on: false },
  { name: 'Tree Ensemble', type: 'XGBoost', on: true },
]
const MOCK_ACTIVITY = [
  { who: 'Ahmet', what: 'lobi̇ye katıldı', time: '2dk önce' },
  { who: 'Eda', what: 'hazır', time: '1dk önce' },
  { who: 'Sistem', what: 'ev veri seti güncellendi', time: '30sn önce' },
  { who: 'Player_03', what: 'lobi̇ye katıldı', time: '15sn önce' },
]
const fmt = (n) => n?.toLocaleString('tr-TR') ?? '—'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function LobbyRoom() {
  const { id: lobbyId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const nickname = state?.nickname ?? user?.displayName ?? 'Misafir'
  const isHost = state?.isHost ?? false

  const [screen, setScreen] = useState('waiting')
  const [players, setPlayers] = useState([])
  const [roundData, setRoundData] = useState(null)
  const [resultData, setResultData] = useState(null)
  const [leaderboardData, setLeaderboardData] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [guess, setGuess] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef(null)

  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!user) return
    user.getIdToken().then(token => setUrl(wsUrl(lobbyId, token)))
  }, [user, lobbyId])

  const onMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'PLAYER_JOINED':
        setPlayers(prev => {
          if (prev.find(p => p.player_id === msg.payload?.player_id)) return prev
          return [...prev, msg.payload]
        })
        break
      case 'ROUND_START':
        clearInterval(timerRef.current)
        setRoundData(msg.payload)
        setSubmitted(false)
        setGuess('')
        setScreen('round')
        setTimeLeft(msg.payload.time_limit_sec)
        break
      case 'ROUND_RESULT':
        clearInterval(timerRef.current)
        setResultData(msg.payload)
        setScreen('result')
        break
      case 'LEADERBOARD':
        setLeaderboardData(msg.payload)
        setScreen('leaderboard')
        break
      default:
        break
    }
  }, [])

  const { connected, send } = useWebSocket(url, onMessage)

  const joinedRef = useRef(false)
  useEffect(() => {
    if (connected && !joinedRef.current) {
      joinedRef.current = true
      send('JOIN', { nickname })
    }
  }, [connected, nickname, send])

  useEffect(() => {
    if (screen !== 'round') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => (t <= 1 ? 0 : t - 1))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [roundData?.round, screen])

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

  if (!user) {
    navigate('/login')
    return null
  }

  const subnavRound = screen === 'round' && roundData
    ? { label: 'Tur', value: `${roundData.round} / ${roundData.total_rounds}` }
    : screen === 'result' && resultData
      ? { label: 'Tur', value: `${resultData.round}` }
      : null

  return (
    <AppShell>
      <div className="lr-subnav">
        <div className="lr-subnav-item">Oda <strong>{lobbyId}</strong></div>
        <div className="lr-subnav-item">Mod <strong>Multiplayer</strong></div>
        {subnavRound && <div className="lr-subnav-item">{subnavRound.label} <strong>{subnavRound.value}</strong></div>}
        {screen === 'round' && (
          <div className="lr-subnav-item">Süre <strong style={{ color: timeLeft <= 10 ? '#fca5a5' : '#fff' }}>{timeLeft}s</strong></div>
        )}
        <div className="lr-subnav-item">Host <strong>{nickname}</strong></div>
        <div className="lr-subnav-item">Oyuncular <strong>{players.length} / 8</strong></div>
        <div className="lr-subnav-spacer" />
        <span className={`lr-conn ${connected ? 'ok' : 'bad'}`}>
          {connected ? 'Bağlı' : 'Bağlanılıyor…'}
        </span>
        <button className="hr-btn hr-btn-danger" onClick={() => navigate('/lobby')}>
          Oyundan Çık
        </button>
      </div>

      {screen === 'waiting' && (
        <WaitingScreen
          players={players}
          isHost={isHost}
          onStart={handleStartGame}
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
        <ResultScreen data={resultData} nickname={nickname} />
      )}
      {screen === 'leaderboard' && leaderboardData && (
        <FinalLeaderboard data={leaderboardData} onExit={() => navigate('/lobby')} />
      )}
    </AppShell>
  )
}

function WaitingScreen({ players, isHost, onStart }) {
  return (
    <div className="lr-wait-grid">
      <div>
        <div className="lr-panel">
          <div className="lr-panel-header">
            <h3>Oyuncular ({players.length})</h3>
            <span className="lr-pill ready">Canlı</span>
          </div>
          <div className="lr-panel-body">
            {players.length === 0 && (
              <div className="lr-player-row empty">Oyuncu bekleniyor…</div>
            )}
            {players.map(p => (
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
            {MOCK_ACTIVITY.map((a, i) => (
              <div key={i} className="lr-activity">
                <strong>{a.who}</strong> {a.what}
                <span className="time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="lr-panel">
          <div className="lr-panel-header">
            <h3>Oyun Ayarları</h3>
            <button className="lr-chip">Sıfırla</button>
          </div>
          <div className="lr-panel-body">
            <SettingRow label="Tur Sayısı" options={['5', '10', '15']} active="10" />
            <SettingRow label="Tur Süresi" options={['30s', '60s', '90s']} active="60s" />
            <SettingRow label="Zorluk" options={['Kolay', 'Orta', 'Zor']} active="Orta" />
            <SettingRow label="Veri Tipi" options={['Görsel', 'Detay', 'Karışık']} active="Karışık" />
            <SettingRow label="Para Birimi" options={['₺', '$', '€']} active="₺" />
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
              {MOCK_OPPONENTS.filter(o => o.on).length} / {MOCK_OPPONENTS.length} aktif
            </span>
          </div>
          <div className="lr-panel-body">
            {MOCK_OPPONENTS.map(m => (
              <div className="lr-model-row" key={m.name}>
                <span className="lr-model-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <path d="M9 9h6v6H9z" />
                  </svg>
                </span>
                <div className="lr-model-info">
                  <div className="n">{m.name}</div>
                  <div className="t">{m.type}</div>
                </div>
                <button className={`lr-toggle${m.on ? ' on' : ''}`} aria-label="Toggle" />
              </div>
            ))}
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

function SettingRow({ label, options, active }) {
  return (
    <div className="lr-setting-row">
      <span className="label">{label}</span>
      <div className="lr-chip-group">
        {options.map(o => (
          <button key={o} className={`lr-chip${o === active ? ' active' : ''}`}>{o}</button>
        ))}
      </div>
    </div>
  )
}

function RoundScreen({ data, guess, setGuess, submitted, onSubmit, players, nickname }) {
  const { property } = data
  const fields = [
    { l: 'Alan', v: `${property.metrekare_brut} m²` },
    { l: 'Oda', v: property.oda_salon },
    { l: 'Yaş', v: property.bina_yasi },
    { l: 'Kat', v: `${property.kat} / ${property.kat_sayisi}` },
    { l: 'Isıtma', v: property.isitma },
    { l: 'Balkon', v: property.balkon },
    { l: 'Asansör', v: property.asansor },
    { l: 'Otopark', v: property.otopark },
  ]
  return (
    <div className="lr-round-grid">
      <div>
        <div className="lr-property">
          <img className="lr-property-img" src="/assets/landing-page-house-img.png" alt="Listing" />
          <div className="lr-property-body">
            <div className="lr-location">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {property.mahalle}, {property.ilce} / {property.il}
            </div>
            <div className="lr-specs">
              {fields.map(f => (
                <div className="lr-spec" key={f.l}>
                  <div className="l">{f.l}</div>
                  <div className="v">{f.v ?? '—'}</div>
                </div>
              ))}
            </div>
            <button className="hr-btn hr-btn-outline" style={{ width: '100%' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
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
          {(players.length ? players : [{ player_id: 'self', nickname }]).map(p => (
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

function ResultScreen({ data, nickname }) {
  const { round, actual_price, player_results = [], ai_predictions = {} } = data
  const winner = player_results[0]
  const me = player_results.find(p => p.nickname === nickname) ?? player_results[0]
  const isWinner = winner?.nickname === nickname

  const allPreds = [
    ...player_results.map(p => ({ name: p.nickname, type: 'Oyuncu', price: p.guess, dev: p.deviation_pct })),
    ...Object.entries(ai_predictions).map(([name, pred]) => ({
      name: name.toUpperCase(),
      type: 'AI',
      price: pred.price_try,
      dev: pred.deviation_pct,
    })),
  ].sort((a, b) => Math.abs(a.dev ?? 0) - Math.abs(b.dev ?? 0))

  const avgDev = allPreds.length
    ? (allPreds.reduce((s, p) => s + Math.abs(p.dev ?? 0), 0) / allPreds.length).toFixed(2)
    : '—'
  const bestDev = allPreds[0]?.dev?.toFixed?.(2) ?? '—'
  const totalPts = player_results.reduce((s, p) => s + (p.points_earned ?? 0), 0)

  return (
    <>
      <div className="lr-result-grid">
        <div>
          <div className="lr-property">
            <img className="lr-property-img" src="/assets/landing-page-house-img.png" alt="Listing" />
            <div className="lr-property-body">
              <div className="lr-location">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
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

      <div className="lr-result-bottom">
        <div className="lr-dots">
          {Array.from({ length: 10 }, (_, i) => {
            const n = i + 1
            const cls = n < round ? 'done' : n === round ? 'curr' : ''
            return <span key={n} className={cls}>{n}</span>
          })}
        </div>
        <button className="hr-btn hr-btn-primary">Sonraki Tur Bekleniyor…</button>
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
