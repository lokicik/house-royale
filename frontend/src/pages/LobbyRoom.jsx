import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { wsUrl } from '../lib/api'

// screen: 'waiting' | 'round' | 'result' | 'leaderboard'

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

  // Get a fresh Firebase ID token asynchronously; only then open the WS.
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

  // Send JOIN once connected
  const joinedRef = useRef(false)
  useEffect(() => {
    if (connected && !joinedRef.current) {
      joinedRef.current = true
      send('JOIN', { nickname })
    }
  }, [connected, nickname, send])

  // Countdown timer
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
    const price = parseFloat(guess.replace(/\./g, '').replace(',', '.'))
    if (!price || price <= 0) return
    send('SUBMIT_GUESS', { price_try: price })
    setSubmitted(true)
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <strong>Oda: </strong><code>{lobbyId}</code>
          <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: connected ? 'green' : 'red' }}>
            {connected ? '● Bağlı' : '○ Bağlantı kuruluyor…'}
          </span>
        </div>
        <button onClick={() => navigate('/lobby')} style={{ background: 'none', border: '1px solid #ccc', padding: '0.3rem 0.7rem', cursor: 'pointer' }}>
          ← Çık
        </button>
      </div>

      {screen === 'waiting' && (
        <WaitingScreen
          players={players}
          isHost={isHost}
          lobbyId={lobbyId}
          onStart={handleStartGame}
        />
      )}

      {screen === 'round' && roundData && (
        <RoundScreen
          data={roundData}
          timeLeft={timeLeft}
          guess={guess}
          setGuess={setGuess}
          submitted={submitted}
          onSubmit={handleSubmitGuess}
        />
      )}

      {screen === 'result' && resultData && (
        <ResultScreen data={resultData} />
      )}

      {screen === 'leaderboard' && leaderboardData && (
        <LeaderboardScreen data={leaderboardData} onExit={() => navigate('/lobby')} />
      )}
    </div>
  )
}

function WaitingScreen({ players, isHost, lobbyId, onStart }) {
  return (
    <div>
      <h2>Bekleme Odası</h2>
      <p style={{ fontSize: '0.85rem', color: '#555' }}>
        Oda kodunu arkadaşlarınla paylaş: <strong>{lobbyId}</strong>
      </p>
      <h3>Oyuncular ({players.length})</h3>
      <ul style={{ paddingLeft: '1.2rem' }}>
        {players.map(p => (
          <li key={p.player_id}>{p.nickname}</li>
        ))}
        {players.length === 0 && <li style={{ color: '#888' }}>Henüz kimse yok…</li>}
      </ul>
      {isHost && (
        <button
          onClick={onStart}
          style={{ marginTop: '1.5rem', padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer' }}
        >
          Oyunu Başlat
        </button>
      )}
      {!isHost && <p style={{ color: '#888' }}>Host oyunu başlatmasını bekle…</p>}
    </div>
  )
}

function RoundScreen({ data, timeLeft, guess, setGuess, submitted, onSubmit }) {
  const { round, total_rounds, property } = data
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <strong>Tur {round} / {total_rounds}</strong>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: timeLeft <= 10 ? 'red' : 'inherit' }}>
          ⏱ {timeLeft}s
        </span>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>{property.mahalle}, {property.ilce} / {property.il}</h3>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {[
              ['Alan', `${property.metrekare_brut} m²`],
              ['Oda', property.oda_salon],
              ['Bina Yaşı', property.bina_yasi],
              ['Kat', `${property.kat} / ${property.kat_sayisi}`],
              ['Isıtma', property.isitma],
              ['Balkon', property.balkon],
              ['Asansör', property.asansor],
              ['Otopark', property.otopark],
            ].map(([label, value]) => (
              <tr key={label}>
                <td style={{ padding: '0.3rem 0.5rem', color: '#555', width: '40%' }}>{label}</td>
                <td style={{ padding: '0.3rem 0.5rem', fontWeight: 500 }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!submitted ? (
        <form onSubmit={onSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="number"
            value={guess}
            onChange={e => setGuess(e.target.value)}
            placeholder="Tahmininiz (TL)"
            min="1"
            style={{ flex: 1, padding: '0.6rem', fontSize: '1rem' }}
          />
          <button type="submit" style={{ padding: '0.6rem 1.2rem', fontSize: '1rem', cursor: 'pointer' }}>
            Gönder
          </button>
        </form>
      ) : (
        <p style={{ color: 'green', fontWeight: 600 }}>✓ Tahmininiz gönderildi. Sonuç bekleniyor…</p>
      )}
    </div>
  )
}

function ResultScreen({ data }) {
  const { round, actual_price, player_results, ai_predictions } = data
  const fmt = (n) => n?.toLocaleString('tr-TR') ?? '—'

  return (
    <div>
      <h2>Tur {round} Sonucu</h2>
      <p style={{ fontSize: '1.1rem' }}>
        Gerçek Fiyat: <strong>{fmt(actual_price)} ₺</strong>
      </p>

      <h3>Oyuncular</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd' }}>
            {['Oyuncu', 'Tahmin', 'Sapma %', 'Puan'].map(h => (
              <th key={h} style={{ padding: '0.4rem', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {player_results?.map((r, i) => (
            <tr key={r.player_id} style={{ background: i === 0 ? '#f0fff0' : 'transparent', borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.4rem' }}>{r.nickname} {i === 0 ? '🏆' : ''}</td>
              <td style={{ padding: '0.4rem' }}>{fmt(r.guess)} ₺</td>
              <td style={{ padding: '0.4rem' }}>%{r.deviation_pct}</td>
              <td style={{ padding: '0.4rem', fontWeight: 700 }}>+{r.points_earned}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>AI Tahminleri</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd' }}>
            {['Model', 'Tahmin', 'Sapma %'].map(h => (
              <th key={h} style={{ padding: '0.4rem', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(ai_predictions ?? {}).map(([name, pred]) => (
            <tr key={name} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.4rem', textTransform: 'uppercase', fontWeight: 600 }}>{name}</td>
              <td style={{ padding: '0.4rem' }}>{fmt(pred.price_try)} ₺</td>
              <td style={{ padding: '0.4rem' }}>%{pred.deviation_pct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LeaderboardScreen({ data, onExit }) {
  const fmt = (n) => n?.toLocaleString('tr-TR') ?? '—'
  return (
    <div>
      <h2>🏆 Oyun Bitti — Final Sıralaması</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd' }}>
            {['Sıra', 'Oyuncu', 'Toplam Puan'].map(h => (
              <th key={h} style={{ padding: '0.5rem', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.players?.map(p => (
            <tr key={p.player_id} style={{ borderBottom: '1px solid #eee', background: p.rank === 1 ? '#fffbe6' : 'transparent' }}>
              <td style={{ padding: '0.5rem', fontWeight: 700 }}>{p.rank}</td>
              <td style={{ padding: '0.5rem' }}>{p.nickname} {p.rank === 1 ? '👑' : ''}</td>
              <td style={{ padding: '0.5rem', fontWeight: 700 }}>{fmt(p.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={onExit} style={{ padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer' }}>
        Lobiye Dön
      </button>
    </div>
  )
}
