import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { Icon, ModelBadge } from '../components/icons'
import { useAuth } from '../contexts/authContextValue'
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

// League comes from the backend as "bronze" | "gold" | "diamond". Normalize
// to title-case so it matches the tab IDs and LeagueBadge labels. Rows that
// pre-date the league field will have an empty string and are filtered out
// of league-specific tabs.
function getRowLeague(row) {
  const raw = (row.league || '').toLowerCase()
  if (raw === 'diamond') return 'Diamond'
  if (raw === 'gold') return 'Gold'
  if (raw === 'bronze') return 'Bronze'
  return ''
}

function LeagueBadge({ league }) {
  if (!league) return <span style={{ color: 'var(--hr-muted)', fontSize: 12 }}>—</span>
  const labels = { Bronze: 'Bronz', Gold: 'Altın', Diamond: 'Elmas' }
  const emojis = { Bronze: '🥉', Gold: '🥇', Diamond: '💎' }
  return (
    <span className={`lb-league-badge lb-league-${league.toLowerCase()}`}>
      <span style={{ marginRight: 4 }}>{emojis[league]}</span>
      {labels[league]}
    </span>
  )
}

const LEAGUES = [
  { id: 'All', name: 'Tüm Ligler', emoji: '🏆' },
  { id: 'Diamond', name: 'Elmas', emoji: '💎' },
  { id: 'Gold', name: 'Altın', emoji: '🥇' },
  { id: 'Bronze', name: 'Bronz', emoji: '🥉' }
]

export default function Leaderboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('Genel')
  const [leagueTab, setLeagueTab] = useState('All')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getLeaderboard()
      .then(d => { setRows(d.entries ?? []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const filtered = rows.filter(r => {
    if (tab === 'Oyuncular' && r.is_ai) return false
    if (tab === 'AI Modelleri' && !r.is_ai) return false

    if (leagueTab !== 'All' && getRowLeague(r) !== leagueTab) return false
    return true
  })

  const me = rows.find(r => !r.is_ai && r.id === user?.uid)
  const topAI = rows.filter(r => r.is_ai).slice(0, 3)

  return (
    <AppShell>
      <div className="lb-header">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1>Liderlik Tablosu</h1>
          <p>En iyi oyuncuları ve AI modellerini gör. Hedef #1.</p>
          <div className="lb-tabs-container">
            <div className="lb-tabs">
              {['Genel', 'Oyuncular', 'AI Modelleri'].map(t => (
                <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
            <div className="lb-league-tabs">
              {LEAGUES.map(l => (
                <button
                  key={l.id}
                  className={`lb-league-tab ${l.id === leagueTab ? 'active' : ''} ${l.id.toLowerCase()}`}
                  onClick={() => setLeagueTab(l.id)}
                >
                  <span style={{ marginRight: 4 }}>{l.emoji}</span>
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lb-grid">
        <div className="lb-main">
          <div className="lb-toolbar">
            {loading
              ? <span>Yükleniyor…</span>
              : error
                ? <span style={{ color: 'var(--hr-danger)' }}>{error}</span>
                : <span>{filtered.length} sıralama</span>
            }
          </div>

          {!loading && !error && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--hr-muted)' }}>
              Henüz bu ligde veya kategoride tamamlanmış oyun yok.
            </div>
          )}

          {filtered.length > 0 && (
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Sıra</th>
                  <th>İsim</th>
                  <th>Lig</th>
                  <th>Tip</th>
                  <th>Tur</th>
                  <th>Ort. Hata</th>
                  <th>Kazanma</th>
                  <th>Puan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className={r.id === user?.uid ? 'you' : ''}>
                    <td><span className="lb-rank">{medal(r.rank)}</span></td>
                    <td>
                      <div className="lb-name-cell">
                        {r.is_ai
                          ? <ModelBadge name={r.name} size={28} />
                          : <span className="av">{initials(r.name)}</span>}
                        {r.name}{r.id === user?.uid ? ' (Sen)' : ''}
                      </div>
                    </td>
                    <td><LeagueBadge league={getRowLeague(r)} /></td>
                    <td><span className={`lb-tag${r.is_ai ? ' ai' : ''}`}>{r.is_ai ? 'AI' : 'Oyuncu'}</span></td>
                    <td>{r.rounds}</td>
                    <td>%{r.avg_err.toFixed(2)}</td>
                    <td>
                      <span className="lb-progress"><div style={{ width: `${r.win_rate}%` }} /></span>
                      %{r.win_rate.toFixed(1)}
                    </td>
                    <td><strong>{r.score.toLocaleString('tr-TR')}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="lb-side">
          <div className="lb-card">
            <h3>Senin Özetin</h3>
            {me ? (
              <>
                <div className="lb-overview">
                  <div className="rank-badge">#{me.rank}</div>
                  <div>
                    <div className="label">Genel Sıralama</div>
                    <div className="value">{rows.length > 0 ? `Üst %${Math.ceil(me.rank / rows.length * 100)}` : '—'}</div>
                  </div>
                </div>
                <div className="lb-stat-grid">
                  <div className="lb-stat"><div className="l">Tur</div><div className="v">{me.rounds}</div></div>
                  <div className="lb-stat"><div className="l">Ort. Hata</div><div className="v">%{me.avg_err.toFixed(2)}</div></div>
                  <div className="lb-stat"><div className="l">Kazanma</div><div className="v">%{me.win_rate.toFixed(1)}</div></div>
                  <div className="lb-stat"><div className="l">Puan</div><div className="v">{me.score.toLocaleString('tr-TR')}</div></div>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--hr-muted)', fontSize: 13, padding: '12px 0' }}>
                {loading ? 'Yükleniyor…' : 'Henüz bir oyun oynamadın.'}
              </div>
            )}
          </div>

          <div className="lb-card">
            <h3>En İyi AI Modelleri</h3>
            {topAI.length === 0 ? (
              <div style={{ color: 'var(--hr-muted)', fontSize: 13, padding: '8px 0' }}>
                {loading ? 'Yükleniyor…' : 'Henüz AI verisi yok.'}
              </div>
            ) : topAI.map(r => (
              <div className="lb-mini-row" key={r.id}>
                <ModelBadge name={r.name} size={24} />
                <span className="nm">{r.name}</span>
                <span className="sc">%{r.avg_err.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  )
}
