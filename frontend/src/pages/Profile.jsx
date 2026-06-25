import { useEffect, useRef, useState } from 'react'
import { updateProfile } from 'firebase/auth'
import AppShell from '../components/AppShell'
import ParticleBanner from '../components/ParticleBanner'
import { useAuth } from '../contexts/authContextValue'
import { useLocale } from '../contexts/localeContextValue'
import { getLeaderboard, getMyHistory } from '../lib/api'
import './Profile.css'

const RANK_MEDALS = ['🥇', '🥈', '🥉']

function CountUp({ value, format = current => Math.round(current).toString(), duration = 750 }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (value == null) return
    cancelAnimationFrame(rafRef.current)
    const start = performance.now()
    const tick = now => {
      const progress = Math.min((now - start) / duration, 1)
      setDisplay(value * (1 - (1 - progress) ** 3))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return format(display)
}

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function Profile() {
  const { user } = useAuth()
  const { t, formatDate, formatNumber, formatPercent, resolveError } = useLocale()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [myStats, setMyStats] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const displayName = user?.displayName || user?.email?.split('@')[0] || t('common.guest')

  useEffect(() => {
    if (!user) return
    user.getIdToken().then(idToken => {
      setLoading(true)
      setError(null)
      Promise.all([
        getLeaderboard().then(data => ({ ok: true, data })).catch(err => ({ ok: false, err })),
        getMyHistory(user, idToken).then(data => ({ ok: true, data })).catch(err => ({ ok: false, err })),
      ]).then(([leaderboardRes, historyRes]) => {
        if (leaderboardRes.ok && leaderboardRes.data?.entries) {
          const me = leaderboardRes.data.entries.find(entry => !entry.is_ai && entry.id === user.uid)
          setMyStats(me ? { ...me, total: leaderboardRes.data.entries.length } : null)
        }
        if (historyRes.ok) {
          setHistory(historyRes.data?.records ?? [])
        }

        const failures = [
          !leaderboardRes.ok && resolveError(leaderboardRes.err, 'errors.codes.leaderboard_load_failed'),
          !historyRes.ok && resolveError(historyRes.err, 'errors.codes.history_load_failed'),
        ].filter(Boolean)

        if (failures.length) {
          setError(t('profile.errors.loadFailed', { details: failures.join(' · ') }))
        }

        setLoading(false)
      })
    }).catch(err => {
      setError(t('profile.errors.authFailed', { details: err?.message ?? err }))
      setLoading(false)
    })
  }, [resolveError, t, user])

  function startEditName() {
    setNameDraft(displayName)
    setNameError('')
    setEditingName(true)
  }

  async function saveName() {
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      setNameError(t('profile.errors.nameEmpty'))
      return
    }
    if (trimmed.length > 30) {
      setNameError(t('profile.errors.nameTooLong'))
      return
    }

    setSavingName(true)
    setNameError('')
    try {
      await updateProfile(user, { displayName: trimmed })
      setEditingName(false)
    } catch {
      setNameError(t('profile.errors.nameUpdateFailed'))
    } finally {
      setSavingName(false)
    }
  }

  function cancelEditName() {
    setEditingName(false)
    setNameError('')
  }

  const memberSince = user?.metadata?.creationTime
    ? formatDate(user.metadata.creationTime, { month: 'long', year: 'numeric' })
    : '—'

  return (
    <AppShell>
      <ParticleBanner className="pf-header">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1>{t('profile.title')}</h1>
          <p>{t('profile.subtitle')}</p>
        </div>
      </ParticleBanner>

      <div className="pf-grid">
        <aside className="pf-sidebar">
          <div className="pf-profile-card">
            <div className="pf-avatar-lg">{initials(displayName)}</div>

            {editingName ? (
              <div className="pf-name-edit">
                <input
                  className="pf-name-input"
                  value={nameDraft}
                  onChange={event => setNameDraft(event.target.value)}
                  maxLength={30}
                  autoFocus
                  onKeyDown={event => {
                    if (event.key === 'Enter') saveName()
                    if (event.key === 'Escape') cancelEditName()
                  }}
                />
                <div className="pf-name-actions">
                  <button className="hr-btn hr-btn-primary" onClick={saveName} disabled={savingName}>
                    {savingName ? t('profile.actions.saving') : t('profile.actions.save')}
                  </button>
                  <button className="hr-btn hr-btn-ghost" onClick={cancelEditName}>{t('profile.actions.cancel')}</button>
                </div>
                {nameError && <div className="pf-name-error">{nameError}</div>}
              </div>
            ) : (
              <div className="pf-name-row">
                <h2 className="pf-display-name">{displayName}</h2>
                <button className="pf-edit-btn" onClick={startEditName} title={t('profile.actions.editName')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            )}

            <div className="pf-email">{user?.email}</div>
            <div className="pf-member-since">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {t('profile.memberSince', { date: memberSince })}
            </div>
          </div>

          {myStats && (
            <div className="pf-stats-card">
              <h3>{t('profile.gameSummary.title')}</h3>
              <div className="pf-rank-row">
                <div className="pf-rank-badge">#{myStats.rank}</div>
                <div>
                  <div className="pf-label">{t('profile.gameSummary.overallRank')}</div>
                  <div className="pf-value">
                    {myStats.total > 0 ? t('profile.gameSummary.topPercent', { value: Math.ceil(myStats.rank / myStats.total * 100) }) : '—'}
                  </div>
                </div>
              </div>
              <div className="pf-stat-grid">
                <div className="pf-stat">
                  <div className="pf-stat-label">{t('profile.gameSummary.rounds')}</div>
                  <div className="pf-stat-value"><CountUp value={myStats.rounds} format={value => formatNumber(value)} /></div>
                </div>
                <div className="pf-stat">
                  <div className="pf-stat-label">{t('profile.gameSummary.averageError')}</div>
                  <div className="pf-stat-value"><CountUp value={myStats.avg_err} format={value => formatPercent(value, { minimumFractionDigits: 2 })} /></div>
                </div>
                <div className="pf-stat">
                  <div className="pf-stat-label">{t('profile.gameSummary.winRate')}</div>
                  <div className="pf-stat-value"><CountUp value={myStats.win_rate} format={value => formatPercent(value, { minimumFractionDigits: 1 })} /></div>
                </div>
                <div className="pf-stat">
                  <div className="pf-stat-label">{t('profile.gameSummary.score')}</div>
                  <div className="pf-stat-value"><CountUp value={myStats.score} format={value => formatNumber(value)} /></div>
                </div>
              </div>
            </div>
          )}
        </aside>

        <div className="pf-main">
          <div className="pf-section-card">
            <div className="pf-section-header">
              <h3>{t('profile.history.title')}</h3>
              {!loading && !error && <span className="pf-count">{t('profile.history.count', { count: formatNumber(history.length) })}</span>}
            </div>

            {loading ? (
              <div className="pf-empty">{t('profile.history.loading')}</div>
            ) : error ? (
              <div className="pf-empty" style={{ color: 'var(--hr-danger)' }}>{error}</div>
            ) : history.length === 0 ? (
              <div className="pf-empty">{t('profile.history.empty')}</div>
            ) : (
              <table className="pf-history-table">
                <thead>
                  <tr>
                    <th>{t('profile.history.rank')}</th>
                    <th>{t('profile.history.nickname')}</th>
                    <th>{t('profile.history.score')}</th>
                    <th>{t('profile.history.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(record => (
                    <tr key={`${record.lobby_id}-${record.finished_at}`}>
                      <td>
                        <span className="pf-history-rank">
                          {RANK_MEDALS[record.rank - 1] ?? `#${record.rank}`}
                        </span>
                      </td>
                      <td>{record.nickname}</td>
                      <td><strong>{formatNumber(record.score)}</strong></td>
                      <td className="pf-date">{formatDate(record.finished_at, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
