import { useEffect } from 'react'
import AppShell from '../components/AppShell'
import ParticleBanner from '../components/ParticleBanner'
import { Icon, ModelBadge } from '../components/icons'
import './ModelComparison.css'

const MODELS = [
  { name: 'ResNet Pro (model_0)', type: 'Deep MLP (ResNet)', mae: 936591, r2: 0.4924, resp: 82, params: '318K', trainTime: 120, accuracy: 0.4924 },
  { name: 'MLP Pro Plus Max (model_1)', type: 'Deep MLP', mae: 802674, r2: 0.5415, resp: 72, params: '314K', trainTime: 95, accuracy: 0.5415, best: true },
  { name: 'MLP Pro Plus (model_2)', type: 'Deep MLP', mae: 879489, r2: 0.5440, resp: 65, params: '312K', trainTime: 85, accuracy: 0.5440 },
  { name: 'MLP Pro (model_3)', type: 'MLP', mae: 943059, r2: 0.4938, resp: 58, params: '100K', trainTime: 50, accuracy: 0.4938 },
  { name: 'MLP Plus (model_4)', type: 'MLP', mae: 1104506, r2: 0.3398, resp: 52, params: '90K', trainTime: 42, accuracy: 0.3398 },
  { name: 'MLP Lite (model_5)', type: 'MLP', mae: 1053857, r2: 0.4223, resp: 45, params: '70K', trainTime: 35, accuracy: 0.4223 },
  { name: 'Mini MLP (model_6)', type: 'MLP', mae: 1264643, r2: 0.2108, resp: 38, params: '5K', trainTime: 20, accuracy: 0.2108 },
  { name: 'Tiny MLP (model_7)', type: 'MLP', mae: 1162655, r2: 0.2987, resp: 33, params: '2K', trainTime: 12, accuracy: 0.2987 },
  { name: 'Stub MLP (model_8)', type: 'MLP', mae: 1357356, r2: -0.0930, resp: 28, params: '<1K', trainTime: 8, accuracy: -0.0930 }
]

const STATS = [
  { l: 'MAE', v: '802.674 ₺', sub: 'En iyi model (model_1)' },
  { l: 'RMSE', v: '1.187.755 ₺', sub: 'En iyi model (model_1)' },
  { l: 'R²', v: '0.544', sub: 'En yüksek (model_2)' },
  { l: 'Yanıt Süresi', v: '28ms', sub: 'En hızlı (model_8)' },
  { l: 'Parametreler', v: '318K', sub: 'En büyük model (model_0)' },
]


const RADAR_AXES = ['Doğruluk', 'Hız', 'Tutarlılık', 'Sağlamlık', 'Verimlilik']
const RADAR_DATA = [
  { name: 'MLP Pro Plus Max (model_1)', color: '#2563eb', values: [0.90, 0.40, 0.88, 0.85, 0.50] },
  { name: 'MLP Pro (model_3)', color: '#10b981', values: [0.72, 0.65, 0.72, 0.68, 0.78] },
  { name: 'Stub MLP (model_8)', color: '#f59e0b', values: [0.02, 1.00, 0.28, 0.22, 1.00] },
]
const BAR_METRICS = ['MAE', 'R²', 'Hız', 'Doğruluk']
const BAR_DATA = [
  { name: 'MLP Pro Plus Max (model_1)', color: '#2563eb', values: [1.0, 1.0, 0.40, 1.0] },
  { name: 'MLP Pro (model_3)', color: '#10b981', values: [0.85, 0.91, 0.65, 0.91] },
  { name: 'Stub MLP (model_8)', color: '#f59e0b', values: [0.0, 0.0, 1.0, 0.0] },
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
  useEffect(() => {
    const els = document.querySelectorAll('[data-chart]')
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) }
      }),
      { threshold: 0.2 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <AppShell>
      <ParticleBanner className="mc-header">
        <div>
          <h1>Model Karşılaştırma</h1>
          <p>Gerçek emlak fiyat tahmin performansını metrikler üzerinden karşılaştır.</p>
        </div>
      </ParticleBanner>

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
        <div>
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
                    <th>MAE (₺)</th>
                    <th>R²</th>
                    <th>Yanıt</th>
                    <th>Params</th>
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
                      <td>{m.mae != null ? m.mae.toLocaleString('tr-TR') : 'N/A'}</td>
                      <td>{m.r2 != null ? m.r2.toFixed(4) : 'N/A'}</td>
                      <td>{m.resp}ms</td>
                      <td>{m.params}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mc-card" style={{ marginTop: 16 }}>
            <div className="mc-card-head">
              <h3>Model Öznitelik Önem Dereceleri (Feature Importance)</h3>
            </div>
            <div className="mc-card-body">
              <p style={{ margin: '0 0 8px', color: 'var(--hr-muted)', fontSize: 13 }}>
                Modellerin fiyat tahminlerindeki öznitelik ağırlıklarıdır.
              </p>
              <svg className="mc-feature-importance" data-chart viewBox="0 0 450 220">
                <line x1="140" y1="10" x2="140" y2="200" stroke="var(--hr-border)" strokeWidth="1.5" />
                <text x="130" y="28" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">Net Alan (Metrekare)</text>
                <rect className="fi-bar" x="140" y="16" width="118" height="18" fill="#2563eb" rx="3" style={{ transitionDelay: '0ms' }} />
                <text x="264" y="29" fontSize="10" fontWeight="700" fill="#2563eb">%42.0</text>
                <text x="130" y="60" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">Lokasyon (Mahalle)</text>
                <rect className="fi-bar" x="140" y="48" width="73" height="18" fill="#06b6d4" rx="3" style={{ transitionDelay: '80ms' }} />
                <text x="219" y="61" fontSize="10" fontWeight="700" fill="#06b6d4">%26.0</text>
                <text x="130" y="92" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">Kat Oranı (Kat / Toplam)</text>
                <rect className="fi-bar" x="140" y="80" width="39" height="18" fill="#10b981" rx="3" style={{ transitionDelay: '160ms' }} />
                <text x="185" y="93" fontSize="10" fontWeight="700" fill="#10b981">%14.0</text>
                <text x="130" y="124" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">Oda &amp; Salon Sayısı</text>
                <rect className="fi-bar" x="140" y="112" width="25" height="18" fill="#8b5cf6" rx="3" style={{ transitionDelay: '240ms' }} />
                <text x="171" y="125" fontSize="10" fontWeight="700" fill="#8b5cf6">%9.0</text>
                <text x="130" y="156" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">Bina Yaşı</text>
                <rect className="fi-bar" x="140" y="144" width="17" height="18" fill="#fbbf24" rx="3" style={{ transitionDelay: '320ms' }} />
                <text x="163" y="157" fontSize="10" fontWeight="700" fill="#fbbf24">%6.0</text>
                <text x="130" y="188" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">Isıtma Türü</text>
                <rect className="fi-bar" x="140" y="176" width="8" height="18" fill="#f97316" rx="3" style={{ transitionDelay: '400ms' }} />
                <text x="154" y="189" fontSize="10" fontWeight="700" fill="#f97316">%3.0</text>
              </svg>
            </div>
          </div>

          <div className="mc-card" style={{ marginTop: 16 }}>
            <div className="mc-card-head">
              <h3>Model Eğitim Kararlılığı ve Kayıp Eğrisi (Loss Convergence)</h3>
            </div>
            <div className="mc-card-body">
              <p style={{ margin: '0 0 8px', color: 'var(--hr-muted)', fontSize: 13 }}>
                Modellerin 100 Epoch eğitim hata payı yakınsama eğrisidir.
              </p>
              <svg className="mc-loss-chart" data-chart viewBox="0 0 450 220">
                {/* Grid Lines */}
                <line x1="45" y1="30" x2="410" y2="30" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="45" y1="110" x2="410" y2="110" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="45" y1="190" x2="410" y2="190" stroke="var(--hr-border)" strokeWidth="1.5" />
                
                {/* Y-axis Labels */}
                <text x="35" y="34" fontSize="8" textAnchor="end" fill="var(--hr-muted)">1.0 (Kayıp)</text>
                <text x="35" y="114" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.5</text>
                <text x="35" y="194" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.0</text>

                {/* X-axis Labels */}
                <text x="45" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">Epoch 0</text>
                <text x="118" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">20</text>
                <text x="191" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">40</text>
                <text x="264" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">60</text>
                <text x="337" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">80</text>
                <text x="410" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">100</text>

                <path
                  className="loss-line"
                  d="M 45 33.2 L 81.5 70 L 118 81.2 L 154.5 84.4 L 191 86 L 227.5 86 L 264 87.6 L 337 86 L 410 87.6"
                  fill="none" stroke="#f97316" strokeWidth="2.5"
                  pathLength="1" style={{ transitionDelay: '0ms' }}
                />
                <path
                  className="loss-line"
                  d="M 45 38 L 81.5 70 L 118 102 L 154.5 126 L 191 142 L 227.5 154.8 L 264 161.2 L 337 167.6 L 410 170.8"
                  fill="none" stroke="#10b981" strokeWidth="2.5"
                  pathLength="1" style={{ transitionDelay: '200ms' }}
                />
                <path
                  className="loss-line"
                  d="M 45 46 L 81.5 110 L 118 150 L 154.5 170.8 L 191 177.2 L 227.5 182 L 264 183.6 L 337 185.2 L 410 186.8"
                  fill="none" stroke="#2563eb" strokeWidth="2.5"
                  pathLength="1" style={{ transitionDelay: '400ms' }}
                />
              </svg>
              <div className="mc-legend" style={{ marginTop: 8 }}>
                <span style={{ color: '#2563eb' }}><span style={{ color: 'var(--hr-text)' }}>MLP Pro Plus Max (model_1)</span></span>
                <span style={{ color: '#10b981' }}><span style={{ color: 'var(--hr-text)' }}>MLP Pro (model_3)</span></span>
                <span style={{ color: '#f97316' }}><span style={{ color: 'var(--hr-text)' }}>Stub MLP (model_8)</span></span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mc-card">
            <div className="mc-card-head">
              <h3>Metrik Karşılaştırma</h3>
            </div>
            <div className="mc-card-body">
              <svg className="mc-bar-chart" data-chart viewBox="0 0 320 390">
                {/* Horizontal Grid Lines */}
                <line x1="25" y1="40" x2="310" y2="40" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="25" y1="195" x2="310" y2="195" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                
                {/* Y-axis Labels */}
                <text x="18" y="43" fontSize="8" textAnchor="end" fill="var(--hr-muted)">1.0</text>
                <text x="18" y="198" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.5</text>
                <text x="18" y="353" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.0</text>

                {/* Y-axis Line */}
                <line x1="25" y1="35" x2="25" y2="350" stroke="var(--hr-border)" strokeWidth="1.5" />

                {BAR_METRICS.map((m, mi) => {
                  const groupX = 35 + mi * 70
                  return (
                    <g key={m}>
                      {BAR_DATA.map((d, di) => {
                        const h = d.values[mi] * 310
                        return (
                          <rect
                            key={d.name}
                            x={groupX + di * 14}
                            y={350 - h}
                            width={12}
                            height={h}
                            fill={d.color}
                            rx="2"
                            style={{ transitionDelay: `${(mi * 3 + di) * 55}ms` }}
                          />
                        )
                      })}
                      <text x={groupX + 21} y={368} fontSize="10" textAnchor="middle" fill="var(--hr-muted)">{m}</text>
                    </g>
                  )
                })}
                <line x1="20" y1="350" x2="310" y2="350" stroke="var(--hr-border)" strokeWidth="1.5" />
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
              <svg className="mc-radar" data-chart viewBox="0 0 280 240">
                <g transform="translate(140 120)">
                  {[0.25, 0.5, 0.75, 1].map(scale => (
                    <polygon
                      key={scale}
                      points={RADAR_AXES.map((_, i) => {
                        const angle = (Math.PI * 2 * i) / RADAR_AXES.length - Math.PI / 2
                        return `${Math.cos(angle) * 90 * scale},${Math.sin(angle) * 90 * scale}`
                      }).join(' ')}
                      fill="none"
                      stroke="var(--hr-border)"
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
                        <line x1="0" y1="0" x2={x} y2={y} stroke="var(--hr-border)" strokeWidth="1" />
                        <text x={lx} y={ly + 4} fontSize="10" textAnchor="middle" fill="var(--hr-muted)">{axis}</text>
                      </g>
                    )
                  })}
                  {RADAR_DATA.map((d, i) => (
                    <polygon
                      key={d.name}
                      points={radarPoints(d.values, 0, 0, 90)}
                      fill={d.color}
                      fillOpacity="0.18"
                      stroke={d.color}
                      strokeWidth="2"
                      className="radar-poly"
                      style={{ transitionDelay: `${i * 120}ms` }}
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

          <div className="mc-card" style={{ marginTop: 16 }}>
            <div className="mc-card-head">
              <h3>Hız ve Doğruluk Dengesi</h3>
            </div>
            <div className="mc-card-body">
              <svg className="mc-scatter" data-chart viewBox="0 0 320 220">
                {/* Y-axis grid lines (R2) */}
                <line x1="40" y1="25" x2="300" y2="25" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="40" y1="93" x2="300" y2="93" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="40" y1="169" x2="300" y2="169" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                
                {/* Axis lines */}
                <line x1="40" y1="20" x2="40" y2="185" stroke="var(--hr-border)" strokeWidth="1.5" />
                <line x1="35" y1="180" x2="305" y2="180" stroke="var(--hr-border)" strokeWidth="1.5" />

                {/* Y-axis labels */}
                <text x="32" y="28" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.6 (R²)</text>
                <text x="32" y="96" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.3</text>
                <text x="32" y="172" fontSize="8" textAnchor="end" fill="var(--hr-muted)">-0.1</text>

                {/* X-axis labels */}
                <text x="60" y="195" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">28ms</text>
                <text x="153" y="195" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">52ms</text>
                <text x="270" y="195" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">82ms</text>

                <text x="170" y="210" fontSize="9" textAnchor="middle" fontWeight="600" fill="var(--hr-muted)">Çıkarım Hızı (Response Time)</text>

                {/* Pareto Frontier Line */}
                <path
                  d="M 60 171 L 79 90 L 126 65 L 177 50 L 204 40"
                  fill="none"
                  stroke="var(--hr-blue)"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  opacity="0.6"
                />

                {/* All 9 points — cx from resp, cy from R² using cy=28+(0.6-r2)*205.7 */}
                {[
                  { cx: 60,  cy: 171, fill: '#f97316', label: 'model_8', ly: 163 },
                  { cx: 79,  cy: 90,  fill: '#f97316', label: 'model_7', ly: 82  },
                  { cx: 99,  cy: 108, fill: '#f97316', label: 'model_6', ly: 100 },
                  { cx: 126, cy: 65,  fill: '#fbbf24', label: 'model_5', ly: 57  },
                  { cx: 153, cy: 82,  fill: '#fbbf24', label: 'model_4', ly: 74  },
                  { cx: 177, cy: 50,  fill: '#fbbf24', label: 'model_3', ly: 42  },
                  { cx: 204, cy: 40,  fill: '#06b6d4', label: 'model_2', ly: 32  },
                  { cx: 231, cy: 40,  fill: '#06b6d4', label: 'model_1', ly: 32  },
                  { cx: 270, cy: 50,  fill: '#06b6d4', label: 'model_0', ly: 42  },
                ].map((pt, i) => (
                  <g key={pt.label}>
                    <circle cx={pt.cx} cy={pt.cy} r="5" fill={pt.fill} className="sc-dot" style={{ transitionDelay: `${i * 60}ms` }} />
                    <text x={pt.cx} y={pt.ly} fontSize="7" textAnchor="middle" fontWeight="bold" fill="var(--hr-text)">{pt.label}</text>
                  </g>
                ))}
              </svg>
              
              <div className="mc-legend" style={{ marginTop: 12 }}>
                <span style={{ color: '#06b6d4' }}><span style={{ color: 'var(--hr-text)' }}>Elmas Ligi</span></span>
                <span style={{ color: '#fbbf24' }}><span style={{ color: 'var(--hr-text)' }}>Altın Ligi</span></span>
                <span style={{ color: '#f97316' }}><span style={{ color: 'var(--hr-text)' }}>Bronz Ligi</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mc-about">
        <h3><Icon name="brain" size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Modeller Hakkında</h3>
        <p>
          Bu sayfada House Royale altyapısında çalışan tüm yapay zeka modellerinin performans
          metrikleri karşılaştırılmaktadır. MAE ve RMSE düşük; R² yüksek ve yanıt süresi kısa
          olmalı. Tüm modeller aynı veri seti üzerinde değerlendirilir, bu sayede karşılaştırma adildir.
        </p>
      </div>
    </AppShell>
  )
}
