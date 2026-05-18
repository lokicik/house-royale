import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContextValue'
import ThemeToggle from './ThemeToggle'
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
          <Link to="/lobby" style={{ textDecoration: 'none' }}>
            <img src="/house-royale-logo.png" alt="House Royale" className="hr-logo-img" />
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

          <ThemeToggle className="hr-theme-toggle" />

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
          <div className="hr-footer-main">
            <Link to="/lobby" style={{ textDecoration: 'none' }}>
              <img src="/house-royale-logo.png" alt="House Royale" className="hr-logo-img hr-logo-img--footer" />
            </Link>
            <nav className="hr-footer-nav">
              <Link to="/lobby">Lobi</Link>
              <Link to="/leaderboard">Liderlik</Link>
              <Link to="/model-comparison">Modeller</Link>
            </nav>
          </div>
          <div className="hr-footer-bar">
            <span>© 2026 House Royale. Tüm hakları saklıdır.</span>
            <div className="legal">
              <Link to="/privacy">Gizlilik</Link>
              <Link to="/terms">Şartlar</Link>
              <Link to="/cookies">Çerezler</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
