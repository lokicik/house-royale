import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import ParticleBanner from '../components/ParticleBanner'
import { ModelBadge } from '../components/icons'
import { useAuth } from '../contexts/authContextValue'
import { useLocale } from '../contexts/localeContextValue'
import { getLeaderboard } from '../lib/api'
import './Leaderboard.css'

function medal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

function initials(name) {
  const parts = name.replace(/\s*\(.+\)/, '').trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function getRowLeague(row) {
  const raw = (row.league || '').toLowerCase()
  if (raw === 'diamond') return 'Diamond'
  if (raw === 'gold') return 'Gold'
  if (raw === 'bronze') return 'Bronze'
  return ''
}

function LeagueBadge({ league }) {
  const { t } = useLocale()
  if (!league) return <span style={{ color: 'var(--hr-muted)', fontSize: 12 }}>—</span>
  const labels = t('leaderboard.leagueLabels')
  const emojis = { Bronze: '🥉', Gold: '🥇', Diamond: '💎' }
  return (
    <span className={`lb-league-badge lb-league-${league.toLowerCase()}`}>
      <span style={{ marginRight: 4 }}>{emojis[league]}</span>
      {labels[league]}
    </span>
  )
}

export default function Leaderboard() {
  const { user } = useAuth()
  const { t, formatNumber, formatPercent, resolveError } = useLocale()
  const [tab, setTab] = useState('overall')
  const [leagueTab, setLeagueTab] = useState('All')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getLeaderboard()
      .then(data => {
        setRows(data.entries ?? [])
        setLoading(false)
      })
      .catch(err => {
        setError(resolveError(err, 'errors.codes.leaderboard_load_failed'))
        setLoading(false)
      })
  }, [resolveError])

  const tabLabels = useMemo(() => ([
    { id: 'overall', label: t('leaderboard.tabs.overall') },
    { id: 'players', label: t('leaderboard.tabs.players') },
    { id: 'ai', label: t('leaderboard.tabs.aiModels') },
  ]), [t])
  const leagues = useMemo(() => ([
    { id: 'All', name: t('leaderboard.leagues.all'), emoji: '🏆' },
    { id: 'Diamond', name: t('leaderboard.leagues.diamond'), emoji: '💎' },
    { id: 'Gold', name: t('leaderboard.leagues.gold'), emoji: '🥇' },
    { id: 'Bronze', name: t('leaderboard.leagues.bronze'), emoji: '🥉' },
  ]), [t])

  const filtered = rows.filter(row => {
    if (tab === 'players' && row.is_ai) return false
    if (tab === 'ai' && !row.is_ai) return false
    if (leagueTab !== 'All' && getRowLeague(row) !== leagueTab) return false
    return true
  })

  const me = rows.find(row => !row.is_ai && row.id === user?.uid)
  const topAI = rows.filter(row => row.is_ai).slice(0, 3)

  return (
    <AppShell>
      <ParticleBanner className="lb-header">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1>{t('leaderboard.header.title')}</h1>
          <p>{t('leaderboard.header.subtitle')}</p>
          <div className="lb-tabs-container">
            <div className="lb-tabs">
              {tabLabels.map(item => (
                <button key={item.id} className={item.id === tab ? 'active' : ''} onClick={() => setTab(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="lb-league-tabs">
              {leagues.map(league => (
                <button
                  key={league.id}
                  className={`lb-league-tab ${league.id === leagueTab ? 'active' : ''} ${league.id.toLowerCase()}`}
                  onClick={() => setLeagueTab(league.id)}
                >
                  <span style={{ marginRight: 4 }}>{league.emoji}</span>
                  {league.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ParticleBanner>

      <div className="lb-grid">
        <div className="lb-main">
          <div className="lb-toolbar">
            {loading
              ? <span>{t('leaderboard.toolbar.loading')}</span>
              : error
                ? <span style={{ color: 'var(--hr-danger)' }}>{error}</span>
                : <span>{t('leaderboard.toolbar.rankings', { count: formatNumber(filtered.length) })}</span>}
          </div>

          {!loading && !error && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--hr-muted)' }}>
              {t('leaderboard.toolbar.empty')}
            </div>
          )}

          {filtered.length > 0 && (
            <table className="lb-table">
              <thead>
                <tr>
                  <th>{t('leaderboard.table.rank')}</th>
                  <th>{t('leaderboard.table.name')}</th>
                  <th>{t('leaderboard.table.league')}</th>
                  <th>{t('leaderboard.table.type')}</th>
                  <th>{t('leaderboard.table.rounds')}</th>
                  <th>{t('leaderboard.table.averageError')}</th>
                  <th>{t('leaderboard.table.winRate')}</th>
                  <th>{t('leaderboard.table.score')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => (
                  <tr key={row.id} className={row.id === user?.uid ? 'you' : ''} style={{ '--row-i': index }}>
                    <td><span className="lb-rank">{medal(row.rank)}</span></td>
                    <td>
                      <div className="lb-name-cell">
                        {row.is_ai
                          ? <ModelBadge name={row.name} size={28} />
                          : <span className="av">{initials(row.name)}</span>}
                        {row.name}{row.id === user?.uid ? ` ${t('leaderboard.tags.you')}` : ''}
                      </div>
                    </td>
                    <td><LeagueBadge league={getRowLeague(row)} /></td>
                    <td><span className={`lb-tag${row.is_ai ? ' ai' : ''}`}>{row.is_ai ? t('leaderboard.tags.ai') : t('leaderboard.tags.player')}</span></td>
                    <td>{formatNumber(row.rounds)}</td>
                    <td>{formatPercent(row.avg_err, { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className="lb-progress"><div style={{ width: `${row.win_rate}%` }} /></span>
                      {formatPercent(row.win_rate, { minimumFractionDigits: 1 })}
                    </td>
                    <td><strong>{formatNumber(row.score)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="lb-side">
          <div className="lb-card">
            <h3>{t('leaderboard.summary.title')}</h3>
            {me ? (
              <>
                <div className="lb-overview">
                  <div className="rank-badge">#{me.rank}</div>
                  <div>
                    <div className="label">{t('leaderboard.summary.overallRank')}</div>
                    <div className="value">
                      {rows.length > 0 ? t('leaderboard.summary.topPercent', { value: Math.ceil(me.rank / rows.length * 100) }) : '—'}
                    </div>
                  </div>
                </div>
                <div className="lb-stat-grid">
                  <div className="lb-stat"><div className="l">{t('leaderboard.summary.rounds')}</div><div className="v">{formatNumber(me.rounds)}</div></div>
                  <div className="lb-stat"><div className="l">{t('leaderboard.summary.averageError')}</div><div className="v">{formatPercent(me.avg_err, { minimumFractionDigits: 2 })}</div></div>
                  <div className="lb-stat"><div className="l">{t('leaderboard.summary.winRate')}</div><div className="v">{formatPercent(me.win_rate, { minimumFractionDigits: 1 })}</div></div>
                  <div className="lb-stat"><div className="l">{t('leaderboard.summary.score')}</div><div className="v">{formatNumber(me.score)}</div></div>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--hr-muted)', fontSize: 13, padding: '12px 0' }}>
                {loading ? t('leaderboard.toolbar.loading') : t('leaderboard.summary.noGames')}
              </div>
            )}
          </div>

          <div className="lb-card">
            <h3>{t('leaderboard.topModels.title')}</h3>
            {topAI.length === 0 ? (
              <div style={{ color: 'var(--hr-muted)', fontSize: 13, padding: '8px 0' }}>
                {loading ? t('leaderboard.toolbar.loading') : t('leaderboard.topModels.empty')}
              </div>
            ) : topAI.map(row => (
              <div className="lb-mini-row" key={row.id}>
                <ModelBadge name={row.name} size={24} />
                <span className="nm">{row.name}</span>
                <span className="sc">{formatPercent(row.avg_err, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  )
}
