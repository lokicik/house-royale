import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { Icon } from '../components/icons'
import ThemeToggle from '../components/ThemeToggle'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="login-page">
      <aside className="login-left">
        <div className="login-left-top">
          <div className="login-brand">
            <span className="login-brand-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10h14V10" />
              </svg>
            </span>
            HOUSE ROYALE
          </div>
          <h1>Tekrar hoş geldin!</h1>
          <p className="lead">
            Yapay zeka fiyat tahmin turlarına katıl, en yakın tahmini sen yap ve sıralamada yüksel.
          </p>

          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-icon"><Icon name="trophy" size={18} /></span>
              <div>
                <strong>Yarış</strong>
                <span className="small">Diğer oyuncular ve AI'a karşı sırala</span>
              </div>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon"><Icon name="trend" size={18} /></span>
              <div>
                <strong>Gelişim</strong>
                <span className="small">İstatistiklerini ve hatalarını takip et</span>
              </div>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon"><Icon name="home" size={18} /></span>
              <div>
                <strong>Gerçek Veri</strong>
                <span className="small">Türkiye'den gerçek emlak ilanları</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="login-house">
            <img src="/assets/login-page-house-image.png" alt="Modern ev" onError={(e) => { e.currentTarget.src = '/assets/landing-page-house-img.png' }} />
          </div>
          <div className="login-mini-stats">
            <div className="login-mini-stat"><div className="v">1.250+</div><div className="l">Aktif Oyuncu</div></div>
            <div className="login-mini-stat"><div className="v">15.842</div><div className="l">Oynanan Tur</div></div>
            <div className="login-mini-stat"><div className="v">6</div><div className="l">AI Modeli</div></div>
          </div>
        </div>
      </aside>

      <section className="login-right">
        <div className="login-right-top">
          <ThemeToggle className="login-theme-toggle" />
          Burada yeni misin? <Link to="/login" className="login-forgot">Kayıt Ol</Link>
        </div>

        <div className="login-card">
          <div className="login-card-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l9-8 9 8" />
              <path d="M5 10v10h14V10" />
            </svg>
          </div>
          <h2>House Royale'a Giriş</h2>
          <p className="login-card-sub">Hesabına erişmek için bilgilerini gir.</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleEmailLogin}>
            <div className="login-field">
              <label htmlFor="email">E-posta</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="sen@ornek.com"
                required
                className="login-input"
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">Şifre</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="login-input"
              />
            </div>
            <div className="login-row-between">
              <a className="login-forgot" onClick={(e) => e.preventDefault()} href="#">
                Şifremi unuttum?
              </a>
            </div>
            <button type="submit" disabled={loading} className="login-primary-btn">
              {loading ? 'Giriş yapılıyor…' : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="lock" size={14} />
                  Giriş Yap
                </span>
              )}
            </button>
          </form>

          <div className="login-divider">veya devam et</div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="login-social-btn"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.3l-6.2-5.2C29 35.4 26.6 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C41.8 35.6 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Google ile devam et
          </button>

          <div className="login-safe">
            <Icon name="lock" size={14} />
            Verilerin güvenli ve şifrelenmiş.
          </div>
        </div>
      </section>
    </div>
  )
}
