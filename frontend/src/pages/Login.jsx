import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { Icon } from '../components/icons'
import './Login.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MODE_CONTENT = {
  login: {
    title: "House Royale'a Giriş",
    subtitle: 'Hesabına erişmek için bilgilerini gir.',
    submitLabel: 'Giriş Yap',
    loadingLabel: 'Giriş yapılıyor...',
  },
  register: {
    title: "House Royale'a Kayıt",
    subtitle: 'Yeni hesabını oluştur ve tahmin turlarına başla.',
    submitLabel: 'Kayıt Ol',
    loadingLabel: 'Kayıt oluşturuluyor...',
  },
  reset: {
    title: 'Şifreni Sıfırla',
    subtitle: 'Kayıtlı e-posta adresini gir, sıfırlama bağlantısını hemen gönderelim.',
    submitLabel: 'Sıfırlama Bağlantısı Gönder',
    loadingLabel: 'Bağlantı gönderiliyor...',
  },
}

const FIREBASE_AUTH_MESSAGES = {
  'auth/email-already-in-use': 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.',
  'auth/invalid-credential': 'E-posta veya şifre hatalı.',
  'auth/invalid-email': 'Geçerli bir e-posta adresi gir.',
  'auth/network-request-failed': 'Ağ bağlantısı kurulamadı. Bağlantını kontrol edip tekrar dene.',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar dene.',
  'auth/user-not-found': 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.',
  'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
}

function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function validateEmail(value) {
  const normalized = normalizeEmail(value)
  if (!normalized) return 'E-posta adresi gerekli.'
  if (!EMAIL_PATTERN.test(normalized)) return 'Geçerli bir e-posta adresi gir.'
  return ''
}

function validatePassword(value) {
  if (!value) return 'Şifre gerekli.'
  if (value.length < 6) return 'Şifre en az 6 karakter olmalı.'
  return ''
}

function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) return 'Şifre tekrar gerekli.'
  if (password !== confirmPassword) return 'Şifreler eşleşmiyor.'
  return ''
}

function getFirebaseAuthMessage(error) {
  if (!error?.code) return 'İşlem sırasında beklenmeyen bir hata oluştu.'
  return FIREBASE_AUTH_MESSAGES[error.code] ?? 'İşlem tamamlanamadı. Lütfen tekrar dene.'
}

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  })

  const isRegister = mode === 'register'
  const isReset = mode === 'reset'
  const modeContent = MODE_CONTENT[mode]

  function clearFeedback() {
    setError('')
    setSuccessMessage('')
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    clearFeedback()
    setFieldErrors({
      email: '',
      password: '',
      confirmPassword: '',
    })
    setTouched({
      email: false,
      password: false,
      confirmPassword: false,
    })
  }

  function setFieldTouched(name) {
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  function handleEmailChange(event) {
    const nextEmail = event.target.value
    setEmail(nextEmail)
    clearFeedback()
    if (touched.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(nextEmail) }))
    }
  }

  function handleEmailBlur() {
    const normalizedEmail = normalizeEmail(email)
    setEmail(normalizedEmail)
    setFieldTouched('email')
    setFieldErrors((prev) => ({ ...prev, email: validateEmail(normalizedEmail) }))
  }

  function handlePasswordChange(event) {
    const nextPassword = event.target.value
    setPassword(nextPassword)
    clearFeedback()

    if (touched.password) {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(nextPassword) }))
    }

    if (touched.confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(nextPassword, confirmPassword),
      }))
    }
  }

  function handlePasswordBlur() {
    setFieldTouched('password')
    setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }))
  }

  function handleConfirmPasswordChange(event) {
    const nextConfirmPassword = event.target.value
    setConfirmPassword(nextConfirmPassword)
    clearFeedback()

    if (touched.confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(password, nextConfirmPassword),
      }))
    }
  }

  function handleConfirmPasswordBlur() {
    setFieldTouched('confirmPassword')
    setFieldErrors((prev) => ({
      ...prev,
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    }))
  }

  function validateCurrentForm() {
    const normalizedEmail = normalizeEmail(email)
    const nextErrors = {
      email: validateEmail(normalizedEmail),
      password: '',
      confirmPassword: '',
    }

    if (!isReset) {
      nextErrors.password = validatePassword(password)
    }

    if (isRegister) {
      nextErrors.confirmPassword = validateConfirmPassword(password, confirmPassword)
    }

    setEmail(normalizedEmail)
    setFieldErrors(nextErrors)
    setTouched({
      email: true,
      password: !isReset,
      confirmPassword: isRegister,
    })

    return {
      normalizedEmail,
      hasErrors: Object.values(nextErrors).some(Boolean),
    }
  }

  async function handleEmailAuth(event) {
    event.preventDefault()
    clearFeedback()

    const { normalizedEmail, hasErrors } = validateCurrentForm()
    if (hasErrors) return

    setLoading(true)

    try {
      if (isReset) {
        await sendPasswordResetEmail(auth, normalizedEmail)
        setSuccessMessage('Şifre sıfırlama bağlantısını e-posta adresine gönderdik.')
        return
      }

      if (isRegister) {
        await createUserWithEmailAndPassword(auth, normalizedEmail, password)
      } else {
        await signInWithEmailAndPassword(auth, normalizedEmail, password)
      }

      navigate('/lobby')
    } catch (err) {
      setError(getFirebaseAuthMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    clearFeedback()

    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/lobby')
    } catch (err) {
      setError(getFirebaseAuthMessage(err))
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
        <div className="login-card">
          <div className="login-card-brand">
            <img src="/house-royale-logo.png" alt="House Royale" className="login-card-logo" />
          </div>
          <h2>{modeContent.title}</h2>
          <p className="login-card-sub">{modeContent.subtitle}</p>

          {error && <div className="login-error" role="alert">{error}</div>}
          {successMessage && (
            <div className="login-success" role="status">
              <Icon name="check" size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="login-form" noValidate>
            <div className="login-field">
              <label htmlFor="email">E-posta</label>
              <div className={`login-input-wrap ${fieldErrors.email && touched.email ? 'is-invalid' : ''}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h16v12H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="sen@ornek.com"
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email && touched.email)}
                  aria-describedby={fieldErrors.email && touched.email ? 'email-error' : undefined}
                  className="login-input"
                />
              </div>
              {fieldErrors.email && touched.email && (
                <div id="email-error" className="login-field-error" role="alert">
                  {fieldErrors.email}
                </div>
              )}
            </div>

            {!isReset && (
              <div className="login-field">
                <label htmlFor="password">Şifre</label>
                <div className={`login-input-wrap ${fieldErrors.password && touched.password ? 'is-invalid' : ''}`}>
                  <Icon name="lock" size={22} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    placeholder="********"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    aria-invalid={Boolean(fieldErrors.password && touched.password)}
                    aria-describedby={fieldErrors.password && touched.password ? 'password-error' : undefined}
                    className="login-input"
                  />
                  <button
                    type="button"
                    className="login-visibility-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    aria-pressed={showPassword}
                  >
                    <svg className="login-eye" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                      {showPassword ? <path d="M4 4l16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : null}
                    </svg>
                  </button>
                </div>
                {fieldErrors.password && touched.password && (
                  <div id="password-error" className="login-field-error" role="alert">
                    {fieldErrors.password}
                  </div>
                )}
              </div>
            )}

            {isRegister && (
              <div className="login-field">
                <label htmlFor="confirmPassword">Şifre tekrar</label>
                <div className={`login-input-wrap ${fieldErrors.confirmPassword && touched.confirmPassword ? 'is-invalid' : ''}`}>
                  <Icon name="lock" size={22} />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    onBlur={handleConfirmPasswordBlur}
                    placeholder="********"
                    autoComplete="new-password"
                    aria-invalid={Boolean(fieldErrors.confirmPassword && touched.confirmPassword)}
                    aria-describedby={fieldErrors.confirmPassword && touched.confirmPassword ? 'confirm-password-error' : undefined}
                    className="login-input"
                  />
                  <button
                    type="button"
                    className="login-visibility-toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Şifre tekrarını gizle' : 'Şifre tekrarını göster'}
                    aria-pressed={showConfirmPassword}
                  >
                    <svg className="login-eye" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                      {showConfirmPassword ? <path d="M4 4l16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : null}
                    </svg>
                  </button>
                </div>
                {fieldErrors.confirmPassword && touched.confirmPassword && (
                  <div id="confirm-password-error" className="login-field-error" role="alert">
                    {fieldErrors.confirmPassword}
                  </div>
                )}
              </div>
            )}

            {mode === 'login' && (
              <div className="login-row-between">
                <button
                  type="button"
                  className="login-forgot"
                  onClick={() => switchMode('reset')}
                >
                  Şifremi unuttum?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="login-primary-btn">
              <Icon name={isReset ? 'send' : 'exit'} size={20} />
              {loading ? modeContent.loadingLabel : modeContent.submitLabel}
            </button>

            <div className="login-card-switch">
              {isReset ? (
                <>
                  <span>Şifreni hatırladın mı?</span>
                  <button
                    type="button"
                    className="login-link-inline"
                    onClick={() => switchMode('login')}
                  >
                    Girişe dön
                  </button>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Zaten hesabın var mı?' : 'Burada yeni misin?'}</span>
                  <button
                    type="button"
                    className="login-link-inline"
                    onClick={() => switchMode(isRegister ? 'login' : 'register')}
                  >
                    {isRegister ? 'Giriş Yap' : 'Kayıt Ol'}
                  </button>
                </>
              )}
            </div>
          </form>

          {!isReset && (
            <>
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
            </>
          )}

          <div className="login-safe">
            <Icon name="shield" size={16} />
            Verilerin güvenli ve şifrelenmiş.
          </div>
        </div>
      </section>
    </div>
  )
}
