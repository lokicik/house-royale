import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContextValue'
import { useLocale } from '../contexts/localeContextValue'
import LocaleToggle from './LocaleToggle'
import ThemeToggle from './ThemeToggle'
import './AppShell.css'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const { t } = useLocale()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const navRef = useRef(null)
  const [pill, setPill] = useState({ left: 0, width: 0, opacity: 0 })
  const [pillReady, setPillReady] = useState(false)

  const tabs = [
    { to: '/lobby', label: t('common.tabs.lobby') },
    { to: '/leaderboard', label: t('common.tabs.leaderboard') },
    { to: '/model-comparison', label: t('common.tabs.modelComparison') },
  ]
  const displayName = user?.displayName || user?.email?.split('@')[0] || t('common.guest')

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const activeEl = nav.querySelector('.hr-tab.active')
    if (activeEl) setPill({ left: activeEl.offsetLeft, width: activeEl.offsetWidth, opacity: 1 })
    requestAnimationFrame(() => setPillReady(true))
  }, [])

  useEffect(() => {
    if (!pillReady) return
    const nav = navRef.current
    if (!nav) return
    const activeEl = nav.querySelector('.hr-tab.active')
    if (activeEl) {
      setPill({ left: activeEl.offsetLeft, width: activeEl.offsetWidth, opacity: 1 })
    } else {
      setPill(p => ({ ...p, opacity: 0 }))
    }
  }, [pathname, pillReady])

  useEffect(() => {
    function onClick(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
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

          <nav className="hr-tabs" ref={navRef}>
            <span
              className={`hr-tab-pill${pillReady ? ' ready' : ''}`}
              style={{ left: pill.left, width: pill.width, opacity: pill.opacity }}
            />
            {tabs.map(tab => {
              const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`)
              return (
                <Link key={tab.to} to={tab.to} className={`hr-tab${active ? ' active' : ''}`}>
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          <LocaleToggle />
          <ThemeToggle className="hr-theme-toggle" />

          <div className="hr-user" ref={menuRef}>
            <button className="hr-user-btn" onClick={() => setOpen(prev => !prev)}>
              <span className="hr-avatar">{initials(displayName)}</span>
              <span className="hr-user-name">{displayName}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {open && (
              <div className="hr-menu">
                <button onClick={() => { setOpen(false); navigate('/profile') }}>{t('common.userMenu.profile')}</button>
                <button className="danger" onClick={handleLogout}>{t('common.userMenu.logout')}</button>
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
              <Link to="/lobby">{t('common.tabs.lobby')}</Link>
              <Link to="/leaderboard">{t('common.tabs.leaderboard')}</Link>
              <Link to="/model-comparison">{t('common.tabs.modelComparison')}</Link>
            </nav>
          </div>
          <div className="hr-footer-bar">
            <span>{t('common.footer.copyright')}</span>
            <div className="legal">
              <Link to="/privacy">{t('common.footer.privacy')}</Link>
              <Link to="/terms">{t('common.footer.terms')}</Link>
              <Link to="/cookies">{t('common.footer.cookies')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
