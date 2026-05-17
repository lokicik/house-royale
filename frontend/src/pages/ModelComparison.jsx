import AppShell from '../components/AppShell'
import './ModelComparison.css'

const MODELS = [
  { name: 'Custom ANN', type: 'Neural Network', mae: 92430, mape: 2.34, r2: 0.91, resp: 124, win: 62.4, score: 1182, best: true },
  { name: 'Hybrid Model', type: 'Ensemble', mae: 98120, mape: 2.48, r2: 0.89, resp: 168, win: 59.1, score: 1140 },
  { name: 'MLP Model', type: 'Neural Network', mae: 110450, mape: 2.89, r2: 0.86, resp: 102, win: 54.8, score: 1024 },
  { name: 'CNN Model', type: 'Vision', mae: 122340, mape: 3.12, r2: 0.84, resp: 245, win: 49.3, score: 968 },
  { name: 'Transformer', type: 'LLM', mae: 138290, mape: 3.62, r2: 0.80, resp: 412, win: 44.2, score: 912 },
  { name: 'Tree Ensemble', type: 'XGBoost', mae: 145780, mape: 3.91, r2: 0.77, resp: 88, win: 41.5, score: 870 },
]
const STATS = [
  { l: 'MAE', v: '92.430', d: '-%4.1', dir: 'up' },
  { l: 'MAPE', v: '%2.34', d: '-%0.32', dir: 'up' },
  { l: 'R²', v: '0.912', d: '+0.04', dir: 'up' },
  { l: 'Yanıt Süresi', v: '124ms', d: '-22ms', dir: 'up' },
  { l: 'Toplam Tahmin', v: '15.840', d: '+1.240', dir: 'up' },
  { l: 'Kazanma', v: '%62.4', d: '+%2.1', dir: 'up' },
]
const INSIGHTS = [
  { tag: 'En İyi', title: 'Custom ANN', desc: 'Tüm metriklerde en üstte. Son 30 günde sürekli birinci.' },
  { tag: 'En Doğru', title: 'Hybrid Model', desc: 'En düşük MAPE değeriyle en doğru fiyat tahmini.' },
  { tag: 'En Hızlı', title: 'Tree Ensemble', desc: 'Sadece 88ms ortalama yanıt süresi.' },
  { tag: 'En Çok Gelişen', title: 'Transformer', desc: 'Son haftada %12 daha iyi performans.' },
]

const RADAR_AXES = ['Doğruluk', 'Hız', 'Tutarlılık', 'Sağlamlık', 'Maliyet']
const RADAR_DATA = [
  { name: 'Custom ANN', color: '#2563eb', values: [0.92, 0.7, 0.88, 0.85, 0.6] },
  { name: 'Hybrid Model', color: '#10b981', values: [0.88, 0.55, 0.82, 0.78, 0.5] },
  { name: 'Tree Ensemble', color: '#f59e0b', values: [0.74, 0.92, 0.7, 0.65, 0.85] },
]
const BAR_METRICS = ['MAPE', 'R²', 'Kazanma', 'Hız']
const BAR_DATA = [
  { name: 'Custom ANN', color: '#2563eb', values: [0.93, 0.91, 0.62, 0.78] },
  { name: 'Hybrid Model', color: '#10b981', values: [0.88, 0.89, 0.59, 0.62] },
  { name: 'Tree Ensemble', color: '#f59e0b', values: [0.71, 0.77, 0.41, 0.95] },
]

function radarPoints(values, cx, cy, r) {
  const n = values.length
  return values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const x = cx + Math.cos(angle) * r * v
    const y = cy + Math.sin(angle) * r * v
    return `${x},${y}`
  }).join(' ')
}

export default function ModelComparison() {
  return (
    <AppShell>
      <div className="mc-header">
        <div>
          <h1>Model Karşılaştırma</h1>
          <p>Gerçek emlak fiyat tahmin performansını metrikler üzerinden karşılaştır.</p>
        </div>
        <div className="mc-filter">
          <select defaultValue="Tüm Modeller">
            <option>Tüm Modeller</option>
            <option>Sadece Aktif</option>
          </select>
          <select defaultValue="Son 30 Gün">
            <option>Son 7 Gün</option>
            <option>Son 30 Gün</option>
            <option>Son 90 Gün</option>
          </select>
        </div>
      </div>

      <div className="mc-stats">
        {STATS.map(s => (
          <div className="mc-stat" key={s.l}>
            <div className="l">{s.l}</div>
            <div className="v">{s.v}</div>
            <div className={`d ${s.dir}`}>↗ {s.d}</div>
          </div>
        ))}
      </div>

      <div className="mc-grid">
        <div className="mc-card">
          <div className="mc-card-head">
            <h3>Model Performans Karşılaştırma</h3>
            <span style={{ fontSize: 12, color: 'var(--hr-muted)' }}>{MODELS.length} model</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Tip</th>
                  <th>MAE</th>
                  <th>MAPE</th>
                  <th>R²</th>
                  <th>Yanıt</th>
                  <th>Kazanma</th>
                  <th>Puan</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map(m => (
                  <tr key={m.name}>
                    <td>
                      <div className="mc-model-cell">
                        <span className="mc-model-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="3" />
                            <path d="M9 9h6v6H9z" />
                          </svg>
                        </span>
                        <strong>{m.name}</strong>
                        {m.best && <span className="mc-best">EN İYİ</span>}
                      </div>
                    </td>
                    <td>{m.type}</td>
                    <td>{m.mae.toLocaleString('tr-TR')}</td>
                    <td>%{m.mape.toFixed(2)}</td>
                    <td>{m.r2.toFixed(2)}</td>
                    <td>{m.resp}ms</td>
                    <td>%{m.win.toFixed(1)}</td>
                    <td><strong>{m.score.toLocaleString('tr-TR')}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="mc-card">
            <div className="mc-card-head">
              <h3>Metric Karşılaştırma</h3>
            </div>
            <div className="mc-card-body">
              <svg className="mc-bar-chart" viewBox="0 0 320 200">
                {BAR_METRICS.map((m, mi) => {
                  const groupX = 30 + mi * 70
                  return (
                    <g key={m}>
                      {BAR_DATA.map((d, di) => {
                        const h = d.values[mi] * 140
                        return (
                          <rect
                            key={d.name}
                            x={groupX + di * 14}
                            y={170 - h}
                            width={12}
                            height={h}
                            fill={d.color}
                            rx="2"
                          />
                        )
                      })}
                      <text x={groupX + 21} y={188} fontSize="10" textAnchor="middle" fill="#64748b">{m}</text>
                    </g>
                  )
                })}
                <line x1="20" y1="170" x2="310" y2="170" stroke="#e5e7eb" strokeWidth="1" />
              </svg>
              <div className="mc-legend">
                {BAR_DATA.map(d => (
                  <span key={d.name} style={{ color: d.color }}>
                    <span style={{ color: 'var(--hr-text)' }}>{d.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mc-card" style={{ marginTop: 16 }}>
            <div className="mc-card-head">
              <h3>Performans Radarı</h3>
            </div>
            <div className="mc-card-body">
              <svg className="mc-radar" viewBox="0 0 280 240">
                <g transform="translate(140 120)">
                  {[0.25, 0.5, 0.75, 1].map(scale => (
                    <polygon
                      key={scale}
                      points={RADAR_AXES.map((_, i) => {
                        const angle = (Math.PI * 2 * i) / RADAR_AXES.length - Math.PI / 2
                        return `${Math.cos(angle) * 90 * scale},${Math.sin(angle) * 90 * scale}`
                      }).join(' ')}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  ))}
                  {RADAR_AXES.map((axis, i) => {
                    const angle = (Math.PI * 2 * i) / RADAR_AXES.length - Math.PI / 2
                    const x = Math.cos(angle) * 90
                    const y = Math.sin(angle) * 90
                    const lx = Math.cos(angle) * 108
                    const ly = Math.sin(angle) * 108
                    return (
                      <g key={axis}>
                        <line x1="0" y1="0" x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                        <text x={lx} y={ly + 4} fontSize="10" textAnchor="middle" fill="#64748b">{axis}</text>
                      </g>
                    )
                  })}
                  {RADAR_DATA.map(d => (
                    <polygon
                      key={d.name}
                      points={radarPoints(d.values, 0, 0, 90)}
                      fill={d.color}
                      fillOpacity="0.18"
                      stroke={d.color}
                      strokeWidth="2"
                    />
                  ))}
                </g>
              </svg>
              <div className="mc-legend">
                {RADAR_DATA.map(d => (
                  <span key={d.name} style={{ color: d.color }}>
                    <span style={{ color: 'var(--hr-text)' }}>{d.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mc-insights">
        {INSIGHTS.map(i => (
          <div className="mc-insight" key={i.title}>
            <span className="tag">{i.tag}</span>
            <h4>{i.title}</h4>
            <p>{i.desc}</p>
          </div>
        ))}
      </div>

      <div className="mc-about">
        <h3>Modeller Hakkında</h3>
        <p>
          Bu sayfada House Royale altyapısında çalışan tüm yapay zeka modellerinin son 30 günlük
          performans metriklerini görebilirsin. MAE ve MAPE düşük; R² ve kazanma oranı yüksek olmalı.
          Tüm modeller aynı tahmin setinde çalışır, bu sayede karşılaştırma adildir.
        </p>
      </div>
    </AppShell>
  )
}
