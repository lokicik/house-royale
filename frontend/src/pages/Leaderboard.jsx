import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { Icon, ModelBadge } from '../components/icons'
import { useAuth } from '../contexts/AuthContext'
import { getLeaderboard } from '../lib/api'
import './Leaderboard.css'

const ACHIEVEMENTS = [
  { title: 'Keskin Nişancı', desc: '%1 sapma altında tahmin yap', icon: 'target' },
  { title: 'İstikrarlı', desc: '7 gün üst üste oyna', icon: 'flame' },
  { title: 'AI Avcısı', desc: 'AI modellerine karşı 10 galibiyet', icon: 'robot' },
  { title: 'Mükemmeliyetçi', desc: 'Tam tahminle 1 tur kazan', icon: 'gem' },
]

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

export default function Leaderboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('Genel')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getLeaderboard()
      .then(d => { setRows(d.entries ?? []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const filtered = rows.filter(r => {
    if (tab === 'Oyuncular') return !r.is_ai
    if (tab === 'AI Modelleri') return r.is_ai
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
          <div className="lb-tabs">
            {['Genel', 'Oyuncular', 'AI Modelleri'].map(t => (
              <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
            ))}
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
              Henüz tamamlanmış oyun yok. İlk oyunu sen oyna!
            </div>
          )}

          {filtered.length > 0 && (
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Sıra</th>
                  <th>İsim</th>
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

      <div className="lb-achievements">
        {ACHIEVEMENTS.map(a => (
          <div className="lb-ach" key={a.title}>
            <div className="ico"><Icon name={a.icon} size={22} /></div>
            <h4>{a.title}</h4>
            <p>{a.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 8 }}>
        <button className="hr-btn hr-btn-outline">Tüm Başarıları Gör</button>
      </div>
    </AppShell>
  )
}
