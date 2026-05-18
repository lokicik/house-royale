import { useState } from 'react'
import AppShell from '../components/AppShell'
import { Icon, ModelBadge } from '../components/icons'
import './Leaderboard.css'

const ROWS = [
  { rank: 1, name: 'Lokman (You)', type: 'Oyuncu', rounds: 128, avgErr: 2.14, winRate: 68, score: 1250, you: true },
  { rank: 2, name: 'Custom ANN', type: 'AI', rounds: 132, avgErr: 2.34, winRate: 62, score: 1182 },
  { rank: 3, name: 'Hybrid Model', type: 'AI', rounds: 132, avgErr: 2.48, winRate: 59, score: 1140 },
  { rank: 4, name: 'Eda_98', type: 'Oyuncu', rounds: 96, avgErr: 2.91, winRate: 54, score: 1062 },
  { rank: 5, name: 'MLP Model', type: 'AI', rounds: 132, avgErr: 3.12, winRate: 51, score: 1024 },
  { rank: 6, name: 'Ahmet_K', type: 'Oyuncu', rounds: 88, avgErr: 3.41, winRate: 48, score: 968 },
  { rank: 7, name: 'CNN Model', type: 'AI', rounds: 132, avgErr: 3.62, winRate: 44, score: 912 },
  { rank: 8, name: 'Su_06', type: 'Oyuncu', rounds: 72, avgErr: 3.88, winRate: 41, score: 870 },
  { rank: 9, name: 'Transformer', type: 'AI', rounds: 132, avgErr: 4.11, winRate: 38, score: 820 },
  { rank: 10, name: 'Player_433', type: 'Oyuncu', rounds: 64, avgErr: 4.56, winRate: 33, score: 754 },
]
const ACHIEVEMENTS = [
  { title: 'Keskin Nişancı', desc: '%1 sapma altında tahmin yap', icon: 'target' },
  { title: 'İstikrarlı', desc: '7 gün üst üste oyna', icon: 'flame' },
  { title: 'AI Avcısı', desc: 'AI modellerine karşı 10 galibiyet', icon: 'robot' },
  { title: 'Mükemmeliyetçi', desc: 'Tam tahminle 1 tur kazan', icon: 'gem' },
]
const SPARK = [62, 68, 65, 72, 78, 74, 80, 84, 82, 86, 90, 88, 92]

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
  const [tab, setTab] = useState('Genel')

  const maxScore = Math.max(...ROWS.map(r => r.score))
  const max = Math.max(...SPARK)
  const min = Math.min(...SPARK)
  const points = SPARK.map((v, i) => {
    const x = (i / (SPARK.length - 1)) * 280
    const y = 90 - ((v - min) / (max - min)) * 80
    return `${x},${y}`
  }).join(' ')

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
            <span>{ROWS.length} sıralama</span>
            <select defaultValue="Tüm Zamanlar">
              <option>Tüm Zamanlar</option>
              <option>Bu Hafta</option>
              <option>Bu Ay</option>
            </select>
          </div>
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
              {ROWS.map(r => (
                <tr key={r.rank} className={r.you ? 'you' : ''}>
                  <td><span className="lb-rank">{medal(r.rank)}</span></td>
                  <td>
                    <div className="lb-name-cell">
                      {r.type === 'AI'
                        ? <ModelBadge name={r.name} size={28} />
                        : <span className="av">{initials(r.name)}</span>}
                      {r.name}
                    </div>
                  </td>
                  <td><span className={`lb-tag${r.type === 'AI' ? ' ai' : ''}`}>{r.type}</span></td>
                  <td>{r.rounds}</td>
                  <td>%{r.avgErr.toFixed(2)}</td>
                  <td>
                    <span className="lb-progress"><div style={{ width: `${r.winRate}%` }} /></span>
                    %{r.winRate}
                  </td>
                  <td><strong>{r.score.toLocaleString('tr-TR')}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="lb-pager">
            <span>1 - 10 / 142</span>
            <div className="lb-page-dots">
              <button className="active">1</button>
              <button>2</button>
              <button>3</button>
              <button>›</button>
            </div>
          </div>
        </div>

        <aside className="lb-side">
          <div className="lb-card">
            <h3>Senin Özetin</h3>
            <div className="lb-overview">
              <div className="rank-badge">#1</div>
              <div>
                <div className="label">Genel Sıralama</div>
                <div className="value">Üst %1 oyuncu</div>
              </div>
            </div>
            <div className="lb-stat-grid">
              <div className="lb-stat"><div className="l">Tur</div><div className="v">128</div></div>
              <div className="lb-stat"><div className="l">Ort. Hata</div><div className="v">%2.14</div></div>
              <div className="lb-stat"><div className="l">Kazanma</div><div className="v">%68</div></div>
              <div className="lb-stat"><div className="l">Puan</div><div className="v">1.250</div></div>
            </div>
          </div>

          <div className="lb-card">
            <h3>Zaman İçinde Performans</h3>
            <svg className="lb-chart" viewBox="0 0 280 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lb-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,100 ${points} 280,100`} fill="url(#lb-grad)" />
              <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="280" cy={90 - ((SPARK[SPARK.length - 1] - min) / (max - min)) * 80} r="3" fill="#2563eb" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--hr-muted)', marginTop: 6 }}>
              <span>30 gün önce</span>
              <span style={{ color: 'var(--hr-success)', fontWeight: 600 }}>+%18</span>
            </div>
          </div>

          <div className="lb-card">
            <h3>En İyi AI Modelleri</h3>
            {ROWS.filter(r => r.type === 'AI').slice(0, 3).map(r => (
              <div className="lb-mini-row" key={r.name}>
                <ModelBadge name={r.name} size={24} />
                <span className="nm">{r.name}</span>
                <span className="sc">%{r.avgErr.toFixed(2)}</span>
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
