import AppShell from '../components/AppShell'
import { Icon, ModelBadge } from '../components/icons'
import './ModelComparison.css'

const MODELS = [
  { name: 'Custom ANN', type: 'Neural Network', mae: 92430, mape: 2.34, r2: 0.91, resp: 124, params: '2.3M', trainTime: 142, accuracy: 0.91, best: true },
  { name: 'Hybrid Model', type: 'Ensemble', mae: 98120, mape: 2.48, r2: 0.89, resp: 168, params: '4.1M', trainTime: 218, accuracy: 0.89 },
  { name: 'MLP Model', type: 'Neural Network', mae: 110450, mape: 2.89, r2: 0.86, resp: 102, params: '1.1M', trainTime: 89, accuracy: 0.86 },
  { name: 'CNN Model', type: 'Vision', mae: 122340, mape: 3.12, r2: 0.84, resp: 245, params: '5.8M', trainTime: 374, accuracy: 0.84 },
  { name: 'Transformer', type: 'LLM', mae: 138290, mape: 3.62, r2: 0.80, resp: 412, params: '12.4M', trainTime: 891, accuracy: 0.80 },
  { name: 'Tree Ensemble', type: 'XGBoost', mae: 145780, mape: 3.91, r2: 0.77, resp: 88, params: '0.3M', trainTime: 34, accuracy: 0.77 },
]

const STATS = [
  { l: 'MAE', v: '92.430', sub: 'En iyi model' },
  { l: 'MAPE', v: '%2.34', sub: 'En iyi model' },
  { l: 'R²', v: '0.912', sub: 'En yüksek' },
  { l: 'Yanıt Süresi', v: '88ms', sub: 'En hızlı' },
  { l: 'Parametreler', v: '12.4M', sub: 'En büyük model' },
  { l: 'Eğitim Süresi', v: '34s', sub: 'En hızlı eğitim' },
]

const INSIGHTS = [
  { tag: 'En İyi', title: 'Custom ANN', desc: 'Tüm metriklerde en üstte. En düşük MAE ve en yüksek R² değeri.' },
  { tag: 'En Doğru', title: 'Hybrid Model', desc: 'En düşük MAPE değeriyle en doğru fiyat tahmini.' },
  { tag: 'En Hızlı', title: 'Tree Ensemble', desc: 'Sadece 88ms ortalama çıkarım süresi, en hızlı model.' },
  { tag: 'En Verimli', title: 'MLP Model', desc: 'En iyi hız/doğruluk dengesiyle kaynak kullanımı en verimli.' },
]

const RADAR_AXES = ['Doğruluk', 'Hız', 'Tutarlılık', 'Sağlamlık', 'Verimlilik']
const RADAR_DATA = [
  { name: 'Custom ANN', color: '#2563eb', values: [0.92, 0.7, 0.88, 0.85, 0.6] },
  { name: 'Hybrid Model', color: '#10b981', values: [0.88, 0.55, 0.82, 0.78, 0.5] },
  { name: 'Tree Ensemble', color: '#f59e0b', values: [0.74, 0.92, 0.7, 0.65, 0.92] },
]
const BAR_METRICS = ['MAPE', 'R²', 'Hız', 'Doğruluk']
const BAR_DATA = [
  { name: 'Custom ANN', color: '#2563eb', values: [0.93, 0.91, 0.78, 0.91] },
  { name: 'Hybrid Model', color: '#10b981', values: [0.88, 0.89, 0.62, 0.89] },
  { name: 'Tree Ensemble', color: '#f59e0b', values: [0.71, 0.77, 0.95, 0.77] },
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
      </div>

      <div className="mc-stats">
        {STATS.map(s => (
          <div className="mc-stat" key={s.l}>
            <div className="l">{s.l}</div>
            <div className="v">{s.v}</div>
            <div className="sub" style={{ fontSize: 11, color: 'var(--hr-muted)', marginTop: 2 }}>{s.sub}</div>
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
                  <th>Params</th>
                  <th>Eğitim</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map(m => (
                  <tr key={m.name}>
                    <td>
                      <div className="mc-model-cell">
                        <ModelBadge name={m.name} size={28} />
                        <strong>{m.name}</strong>
                        {m.best && <span className="mc-best">EN İYİ</span>}
                      </div>
                    </td>
                    <td>{m.type}</td>
                    <td>{m.mae.toLocaleString('tr-TR')}</td>
                    <td>%{m.mape.toFixed(2)}</td>
                    <td>{m.r2.toFixed(2)}</td>
                    <td>{m.resp}ms</td>
                    <td>{m.params}</td>
                    <td>{m.trainTime}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="mc-card">
            <div className="mc-card-head">
              <h3>Metrik Karşılaştırma</h3>
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
        <h3><Icon name="brain" size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Modeller Hakkında</h3>
        <p>
          Bu sayfada House Royale altyapısında çalışan tüm yapay zeka modellerinin performans
          metrikleri karşılaştırılmaktadır. MAE ve MAPE düşük; R² yüksek ve yanıt süresi kısa
          olmalı. Tüm modeller aynı veri seti üzerinde değerlendirilir, bu sayede karşılaştırma adildir.
        </p>
      </div>
    </AppShell>
  )
}
