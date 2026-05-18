import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContextValue'
import { createLobby, getLobby, getMyLobbies, getMyHistory, getLeaderboard } from '../lib/api'
import AppShell from '../components/AppShell'
import { Icon } from '../components/icons'
import './Lobby.css'

const RANK_MEDALS = ['🥇', '🥈', '🥉']

function statusLabel(status) {
  if (status === 'waiting') return { text: 'Bekliyor', cls: 'lp-status-waiting' }
  if (status === 'playing') return { text: 'Oynuyor', cls: 'lp-status-playing' }
  return { text: status, cls: '' }
}

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (diff < 60) return `${diff}sn önce`
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`
  return `${Math.floor(diff / 3600)}sa önce`
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Lobby() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState(user?.displayName ?? '')
  const [joinId, setJoinId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [myLobbies, setMyLobbies] = useState([])
  const [gameHistory, setGameHistory] = useState([])
  const [leaderboard, setLeaderboard] = useState([])

  useEffect(() => {
    if (!user) return
    user.getIdToken().then(idToken => {
      getMyLobbies(user, idToken).then(data => setMyLobbies(Array.isArray(data) ? data : [])).catch(() => {})
      getMyHistory(user, idToken).then(data => setGameHistory(data?.records ?? [])).catch(() => {})
    })
    getLeaderboard().then(data => setLeaderboard(data?.entries ?? [])).catch(() => {})
  }, [user])

  async function handleCreate(e) {
    e.preventDefault()
    if (!nickname.trim()) return
    setLoading(true)
    setError('')
    try {
      const idToken = await user.getIdToken()
      const lobby = await createLobby(user, idToken, nickname.trim())
      navigate(`/lobby/${lobby.id}`, { state: { nickname: nickname.trim(), isHost: true } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    const code = joinId.trim()
    if (!code || !nickname.trim()) return
    setLoading(true)
    setError('')
    try {
      await getLobby(code)
      navigate(`/lobby/${code}`, { state: { nickname: nickname.trim(), isHost: false } })
    } catch (err) {
      setError('Oda bulunamadı. Kodu kontrol et ve tekrar dene.')
    } finally {
      setLoading(false)
    }
  }

  const displayName = nickname || user?.displayName || user?.email?.split('@')[0] || 'Oyuncu'

  return (
    <AppShell>
      <div className="lp-header">
        <div>
          <h1>Hoş geldin, {displayName} 👋</h1>
          <p>Bir oda oluştur ve arkadaşlarını davet et ya da var olan bir odaya katıl.</p>
        </div>
      </div>

      {error && <div className="lp-error">{error}</div>}

      <div className="lp-grid">
        <div className="lp-card">
          <div className="lp-card-icon"><Icon name="sparkle" size={22} /></div>
          <h2>Yeni Oda Oluştur</h2>
          <p className="lp-card-desc">Hızlı bir oda aç, kodunu paylaş, oyunu yönet.</p>
          <form onSubmit={handleCreate}>
            <div className="lp-field">
              <label htmlFor="nick-create">Takma Ad</label>
              <input
                id="nick-create"
                className="lp-input"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Takma adın"
                maxLength={20}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !nickname.trim()}
              className="hr-btn hr-btn-primary hr-btn-lg"
              style={{ width: '100%' }}
            >
              {loading ? 'Oluşturuluyor…' : 'Oda Oluştur'}
            </button>
          </form>
        </div>

        <div className="lp-card">
          <div className="lp-card-icon"><Icon name="users" size={22} /></div>
          <h2>Mevcut Odaya Katıl</h2>
          <p className="lp-card-desc">Arkadaşından aldığın oda kodunu gir.</p>
          <form onSubmit={handleJoin}>
            <div className="lp-field">
              <label htmlFor="nick-join">Takma Ad</label>
              <input
                id="nick-join"
                className="lp-input"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Takma adın"
                maxLength={20}
              />
            </div>
            <div className="lp-field">
              <label htmlFor="code">Oda Kodu</label>
              <input
                id="code"
                className="lp-input code"
                value={joinId}
                onChange={e => setJoinId(e.target.value.toUpperCase())}
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
              {loading ? 'Kontrol ediliyor…' : 'Katıl'}
            </button>
          </form>
        </div>
      </div>

      {myLobbies.length > 0 && (
        <div className="lp-active-lobbies">
          <h3>Aktif Odalarım</h3>
          <ul className="lp-lobby-list">
            {myLobbies.map(lobby => {
              const s = statusLabel(lobby.status)
              return (
                <li key={lobby.id} className="lp-lobby-row">
                  <span className="lp-lobby-code">{lobby.id}</span>
                  <span className={`lp-status-badge ${s.cls}`}>{s.text}</span>
                  <span className="lp-lobby-meta">{lobby.player_count} oyuncu · {timeAgo(lobby.created_at)}</span>
                  <button
                    className="hr-btn hr-btn-outline"
                    onClick={() => navigate(`/lobby/${lobby.id}`, { state: { nickname: nickname.trim() || displayName, isHost: true } })}
                  >
                    Odaya Git →
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="lp-info-row">
        <div className="lp-info">
          <h3>Nasıl Oynanır?</h3>
          <p>Ev görselini ve detaylarını incele, fiyatını tahmin et, AI'a karşı yarış. En yakın tahmin tur puanlarını alır.</p>
        </div>
        <div className="lp-info">
          <h3>Liderler</h3>
          {leaderboard.length === 0 ? (
            <p className="lp-empty">Henüz kayıtlı oyun yok.</p>
          ) : (
            <ul className="lp-info-list">
              {leaderboard.slice(0, 3).map((entry, i) => (
                <li key={entry.id}>
                  <span>{RANK_MEDALS[i] ?? `#${entry.rank}`} {entry.name}</span>
                  <strong>{entry.score.toLocaleString('tr-TR')}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="lp-info">
          <h3>Oyun Geçmişim</h3>
          {gameHistory.length === 0 ? (
            <p className="lp-empty">Henüz tamamlanmış oyunun yok.</p>
          ) : (
            <ul className="lp-history-list">
              {gameHistory.slice(0, 5).map((rec, i) => (
                <li key={i} className="lp-history-row">
                  <span className="lp-history-rank">{RANK_MEDALS[rec.rank - 1] ?? `#${rec.rank}`}</span>
                  <span className="lp-history-info">
                    <span className="lp-history-nickname">{rec.nickname}</span>
                    <span className="lp-history-date">{formatDate(rec.finished_at)}</span>
                  </span>
                  <strong className="lp-history-score">{rec.score}p</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}
