import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/lobby" replace />

  async function handleEmailLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/lobby')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/lobby')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '360px', margin: '6rem auto', padding: '2rem', textAlign: 'center' }}>
      <h1>Giriş Yap</h1>
      {error && <p style={{ color: 'red', fontSize: '0.875rem' }}>{error}</p>}
      <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="E-posta"
          required
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Şifre"
          required
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '0.75rem', fontSize: '1rem', cursor: 'pointer' }}>
          {loading ? 'Giriş yapılıyor…' : 'E-posta ile Giriş Yap'}
        </button>
      </form>
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{ padding: '0.75rem', fontSize: '1rem', cursor: 'pointer', width: '100%' }}
      >
        Google ile Giriş Yap
      </button>
    </div>
  )
}
