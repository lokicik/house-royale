import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { Icon } from '../components/icons'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isRegister = mode === 'register'

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleEmailAuth(e) {
    e.preventDefault()
    if (isRegister && password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
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
        <div className="login-brand">
          <img src="/house-royale-logo.png" alt="House Royale" className="login-brand-logo" />
          <span>House Royale</span>
        </div>

        <div className="login-left-content">
          <div className="login-copy">
            <h1>Tekrar hoş geldin!</h1>
            <p className="lead">
              Yolculuğuna devam et ve yapay zekaya karşı fiyat tahminlerinde öne geç.
            </p>
          </div>

          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-icon"><Icon name="trophy" size={30} /></span>
              <div>
                <strong>Yarış</strong>
                <span className="small">Gerçek oyuncular ve AI modellerine karşı tahmin yap.</span>
              </div>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon"><Icon name="trend" size={30} /></span>
              <div>
                <strong>Gelişim</strong>
                <span className="small">Doğruluğunu takip et ve sıralamada yüksel.</span>
              </div>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon"><Icon name="shield" size={30} /></span>
              <div>
                <strong>Gerçek Veri</strong>
                <span className="small">Türkiye'den gerçek emlak ilanlarıyla oyna.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-visual">
          <div className="login-house">
            <img src="/assets/login-page-house-image.png" alt="Modern ev" onError={(e) => { e.currentTarget.src = '/assets/landing-page-house-img.png' }} />
          </div>
          <div className="login-mini-stats">
            <div className="login-mini-stat">
              <Icon name="users" size={25} />
              <div className="v">1.250+</div>
              <div className="l">Aktif Oyuncu</div>
            </div>
            <div className="login-mini-stat">
              <Icon name="trophy" size={25} />
              <div className="v">15.842</div>
              <div className="l">Oynanan Tur</div>
            </div>
            <div className="login-mini-stat">
              <Icon name="brain" size={25} />
              <div className="v">6</div>
              <div className="l">AI Modeli</div>
            </div>
          </div>
        </div>
      </aside>

      <section className="login-right">
        <div className="login-right-top">
          <span>{isRegister ? 'Zaten hesabın var mı?' : 'Burada yeni misin?'}</span>
          <button
            type="button"
            className="login-link-btn"
            onClick={() => switchMode(isRegister ? 'login' : 'register')}
          >
            {isRegister ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </div>

        <div className="login-card">
          <div className="login-card-brand">
            <img src="/house-royale-logo.png" alt="House Royale" className="login-card-logo" />
          </div>
          <h2>{isRegister ? "House Royale'a Kayıt" : "House Royale'a Giriş"}</h2>
          <p className="login-card-sub">
            {isRegister ? 'Yeni hesabını oluştur ve tahmin turlarına başla.' : 'Hesabına erişmek için bilgilerini gir.'}
          </p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleEmailAuth} className="login-form">
            <div className="login-field">
              <label htmlFor="email">E-posta</label>
              <div className="login-input-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h16v12H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
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
            </div>

            <div className="login-field">
              <label htmlFor="password">Şifre</label>
              <div className="login-input-wrap">
                <Icon name="lock" size={22} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  minLength={6}
                  className="login-input"
                />
                <svg className="login-eye" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {isRegister && (
              <div className="login-field">
                <label htmlFor="confirmPassword">Şifre tekrar</label>
                <div className="login-input-wrap">
                  <Icon name="lock" size={22} />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="********"
                    required
                    minLength={6}
                    className="login-input"
                  />
                </div>
              </div>
            )}

            {!isRegister && (
              <div className="login-row-between">
                <a className="login-forgot" onClick={(e) => e.preventDefault()} href="#">
                  Şifremi unuttum?
                </a>
              </div>
            )}

            <button type="submit" disabled={loading} className="login-primary-btn">
              <Icon name="exit" size={20} />
              {loading ? (isRegister ? 'Kayıt oluşturuluyor...' : 'Giriş yapılıyor...') : (isRegister ? 'Kayıt Ol' : 'Giriş Yap')}
            </button>
          </form>

          <div className="login-divider">veya devam et</div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="login-social-btn"
          >
            <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.3l-6.2-5.2C29 35.4 26.6 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C41.8 35.6 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            {loading ? 'Google ile bağlanıyor...' : 'Google ile devam et'}
          </button>

          <div className="login-safe">
            <Icon name="shield" size={16} />
            Verilerin güvenli ve şifrelenmiş.
          </div>
        </div>
      </section>
    </div>
  )
}
