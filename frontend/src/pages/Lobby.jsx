import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContextValue'
import { createLobby } from '../lib/api'
import AppShell from '../components/AppShell'
import { Icon } from '../components/icons'
import './Lobby.css'

export default function Lobby() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState(user?.displayName ?? '')
  const [joinId, setJoinId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  function handleJoin(e) {
    e.preventDefault()
    if (!joinId.trim() || !nickname.trim()) return
    navigate(`/lobby/${joinId.trim()}`, { state: { nickname: nickname.trim(), isHost: false } })
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
                placeholder="HR12JA"
                maxLength={10}
              />
            </div>
            <button
              type="submit"
              disabled={!joinId.trim() || !nickname.trim()}
              className="hr-btn hr-btn-outline hr-btn-lg"
              style={{ width: '100%' }}
            >
              Katıl
            </button>
          </form>
        </div>
      </div>

      <div className="lp-info-row">
        <div className="lp-info">
          <h3>Nasıl Oynanır?</h3>
          <p>Ev görselini ve detaylarını incele, fiyatını tahmin et, AI'a karşı yarış. En yakın tahmin tur puanlarını alır.</p>
        </div>
        <div className="lp-info">
          <h3>Bugünkü Liderler</h3>
          <ul className="lp-info-list">
            <li><span>🥇 Lokman</span><strong>1.250</strong></li>
            <li><span>🥈 Custom ANN</span><strong>1.182</strong></li>
            <li><span>🥉 Eda_98</span><strong>1.140</strong></li>
          </ul>
        </div>
        <div className="lp-info">
          <h3>Günün Modeli</h3>
          <p><strong style={{ color: 'var(--hr-text)' }}>Hybrid Model</strong> — Son 24 saatte %2.34 ortalama hata ile birinci sırada.</p>
        </div>
      </div>
    </AppShell>
  )
}
