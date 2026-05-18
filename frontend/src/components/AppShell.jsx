import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AppShell.css'

const TABS = [
  { to: '/lobby', label: 'Lobi' },
  { to: '/leaderboard', label: 'Liderlik' },
  { to: '/model-comparison', label: 'Modeller' },
]

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Misafir'

  useEffect(() => {
    function onClick(e) {
      if (!menuRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="hr-shell">
      <header className="hr-nav">
        <div className="hr-nav-inner">
          <Link to="/lobby" className="hr-logo" style={{ textDecoration: 'none' }}>
            <span className="hr-logo-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10h14V10" />
              </svg>
            </span>
            HOUSE ROYALE
          </Link>

          <nav className="hr-tabs">
            {TABS.map(t => {
              const active = t.to === '/'
                ? false
                : pathname === t.to || pathname.startsWith(t.to + '/')
              return (
                <Link key={t.to} to={t.to} className={`hr-tab${active ? ' active' : ''}`}>
                  {t.label}
                </Link>
              )
            })}
          </nav>

          <div className="hr-user" ref={menuRef}>
            <button className="hr-user-btn" onClick={() => setOpen(o => !o)}>
              <span className="hr-avatar">{initials(displayName)}</span>
              <span className="hr-user-name">
                {displayName}
                <span className="hr-user-pill">Lv. 7</span>
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {open && (
              <div className="hr-menu">
                <button onClick={() => { setOpen(false); navigate('/lobby') }}>Lobi'ye dön</button>
                <button onClick={() => { setOpen(false); navigate('/leaderboard') }}>İstatistiklerim</button>
                <button className="danger" onClick={handleLogout}>Çıkış Yap</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="hr-main">{children}</main>

      <footer className="hr-footer">
        <div className="hr-footer-inner">
          <div className="hr-footer-top">
            <div className="hr-footer-brand-col">
              <div className="hr-footer-brand">
                <span className="hr-logo-mark">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11l9-8 9 8" />
                    <path d="M5 10v10h14V10" />
                  </svg>
                </span>
                HOUSE ROYALE
              </div>
              <p className="hr-footer-tag">
                Türkiye'nin gerçek emlak fiyat tahmin yarışı. AI modellerine karşı yarış, en yakın tahmini sen yap.
              </p>
              <div className="hr-socials">
                <a className="hr-social" href="#" aria-label="Twitter">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a className="hr-social" href="#" aria-label="GitHub">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.7.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.73 18.27.5 12 .5z" /></svg>
                </a>
                <a className="hr-social" href="#" aria-label="Discord">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                </a>
                <a className="hr-social" href="#" aria-label="Instagram">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <path d="M16 11.37a4 4 0 1 1-4.73-4.66 4 4 0 0 1 4.73 4.66z" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="hr-footer-col">
              <h4>Oyun</h4>
              <ul>
                <li><a onClick={(e) => { e.preventDefault(); navigate('/lobby') }}>Lobi</a></li>
                <li><a onClick={(e) => { e.preventDefault(); navigate('/leaderboard') }}>Liderlik</a></li>
                <li><a onClick={(e) => { e.preventDefault(); navigate('/model-comparison') }}>Modeller</a></li>
              </ul>
            </div>

            <div className="hr-footer-col">
              <h4>Topluluk</h4>
              <ul>
                <li><a href="#">Discord</a></li>
                <li><a href="#">Twitter</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Turnuvalar</a></li>
              </ul>
            </div>

            <div className="hr-footer-col">
              <h4>Şirket</h4>
              <ul>
                <li><a href="#">Hakkımızda</a></li>
                <li><a href="#">Kariyer</a></li>
                <li><a href="#">Basın</a></li>
                <li><a href="mailto:info@houseroyale.app">İletişim</a></li>
              </ul>
            </div>

            <div className="hr-newsletter">
              <h4>Güncel Kal</h4>
              <p>Yeni turlar, modeller ve haftalık liderlik özetleri.</p>
              <form className="hr-newsletter-form" onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="sen@ornek.com" />
                <button type="submit">Katıl</button>
              </form>
              <div className="hr-newsletter-note">Spam yok. İstediğinde aboneliği bırakabilirsin.</div>
            </div>
          </div>

          <div className="hr-footer-bar">
            <span>© 2026 House Royale. Tüm hakları saklıdır.</span>
            <div className="legal">
              <a href="#">Gizlilik</a>
              <a href="#">Şartlar</a>
              <a href="#">Çerezler</a>
            </div>
            <span className="hr-status-dot">Tüm sistemler çalışıyor</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
