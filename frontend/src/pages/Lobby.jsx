import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createLobby } from '../lib/api'

export default function Lobby() {
  const { user, logout } = useAuth()
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

  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Lobi</h1>
        <button onClick={logout} style={{ background: 'none', border: '1px solid #ccc', padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
          Çıkış
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Takma Ad</label>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="Takma adınız"
          maxLength={20}
          style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', boxSizing: 'border-box' }}
        />
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleCreate} style={{ marginBottom: '2rem' }}>
        <button
          type="submit"
          disabled={loading || !nickname.trim()}
          style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', cursor: 'pointer' }}
        >
          {loading ? 'Oluşturuluyor…' : 'Yeni Oda Oluştur'}
        </button>
      </form>

      <hr style={{ margin: '1.5rem 0' }} />

      <form onSubmit={handleJoin}>
        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Oda Kodunu Gir</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={joinId}
            onChange={e => setJoinId(e.target.value)}
            placeholder="Oda kodu"
            style={{ flex: 1, padding: '0.5rem', fontSize: '1rem' }}
          />
          <button
            type="submit"
            disabled={!joinId.trim() || !nickname.trim()}
            style={{ padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer' }}
          >
            Katıl
          </button>
        </div>
      </form>
    </div>
  )
}
