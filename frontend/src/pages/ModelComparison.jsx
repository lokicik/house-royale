import { useEffect } from 'react'
import AppShell from '../components/AppShell'
import ParticleBanner from '../components/ParticleBanner'
import { Icon, ModelBadge } from '../components/icons'
import { useLocale } from '../contexts/localeContextValue'
import './ModelComparison.css'

const MODELS = [
  { name: 'ResNet Pro (model_0)', type: 'Deep MLP (ResNet)', mae: 936591, r2: 0.4924, resp: 82, params: '318K' },
  { name: 'MLP Pro Plus Max (model_1)', type: 'Deep MLP', mae: 802674, r2: 0.5415, resp: 72, params: '314K', best: true },
  { name: 'MLP Pro Plus (model_2)', type: 'Deep MLP', mae: 879489, r2: 0.5440, resp: 65, params: '312K' },
  { name: 'MLP Pro (model_3)', type: 'MLP', mae: 943059, r2: 0.4938, resp: 58, params: '100K' },
  { name: 'MLP Plus (model_4)', type: 'MLP', mae: 1104506, r2: 0.3398, resp: 52, params: '90K' },
  { name: 'MLP Lite (model_5)', type: 'MLP', mae: 1053857, r2: 0.4223, resp: 45, params: '70K' },
  { name: 'Mini MLP (model_6)', type: 'MLP', mae: 1264643, r2: 0.2108, resp: 38, params: '5K' },
  { name: 'Tiny MLP (model_7)', type: 'MLP', mae: 1162655, r2: 0.2987, resp: 33, params: '2K' },
  { name: 'Stub MLP (model_8)', type: 'MLP', mae: 1357356, r2: -0.0930, resp: 28, params: '<1K' },
]

const RADAR_DATA = [
  { name: 'MLP Pro Plus Max (model_1)', color: '#2563eb', values: [0.90, 0.40, 0.88, 0.85, 0.50] },
  { name: 'MLP Pro (model_3)', color: '#10b981', values: [0.72, 0.65, 0.72, 0.68, 0.78] },
  { name: 'Stub MLP (model_8)', color: '#f59e0b', values: [0.02, 1.00, 0.28, 0.22, 1.00] },
]

const BAR_DATA = [
  { name: 'MLP Pro Plus Max (model_1)', color: '#2563eb', values: [1.0, 1.0, 0.40, 1.0] },
  { name: 'MLP Pro (model_3)', color: '#10b981', values: [0.85, 0.91, 0.65, 0.91] },
  { name: 'Stub MLP (model_8)', color: '#f59e0b', values: [0.0, 0.0, 1.0, 0.0] },
]

function radarPoints(values, cx, cy, radius) {
  const count = values.length
  return values.map((value, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2
    const x = cx + Math.cos(angle) * radius * value
    const y = cy + Math.sin(angle) * radius * value
    return `${x},${y}`
  }).join(' ')
}

export default function ModelComparison() {
  const { t, formatNumber } = useLocale()
  const stats = t('modelComparison.stats')
  const featureLabels = t('modelComparison.featureLabels')
  const axes = t('modelComparison.axes')
  const metrics = ['MAE', 'R²', t('modelComparison.metrics.speed'), t('modelComparison.metrics.accuracy')]

  useEffect(() => {
    const elements = document.querySelectorAll('[data-chart]')
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      }),
      { threshold: 0.2 }
    )
    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <AppShell>
      <ParticleBanner className="mc-header">
        <div>
          <h1>{t('modelComparison.header.title')}</h1>
          <p>{t('modelComparison.header.subtitle')}</p>
        </div>
      </ParticleBanner>

      <div className="mc-stats">
        {stats.map(stat => (
          <div className="mc-stat" key={stat.l}>
            <div className="l">{stat.l}</div>
            <div className="v">{stat.v}</div>
            <div className="sub" style={{ fontSize: 11, color: 'var(--hr-muted)', marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="mc-grid">
        <div>
          <div className="mc-card">
            <div className="mc-card-head">
              <h3>{t('modelComparison.cards.modelPerformance')}</h3>
              <span style={{ fontSize: 12, color: 'var(--hr-muted)' }}>{t('modelComparison.cards.modelsCount', { count: MODELS.length })}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="mc-table">
                <thead>
                  <tr>
                    <th>{t('modelComparison.table.model')}</th>
                    <th>{t('modelComparison.table.type')}</th>
                    <th>{t('modelComparison.table.mae')}</th>
                    <th>{t('modelComparison.table.r2')}</th>
                    <th>{t('modelComparison.table.response')}</th>
                    <th>{t('modelComparison.table.params')}</th>
                  </tr>
                </thead>
                <tbody>
                  {MODELS.map(model => (
                    <tr key={model.name}>
                      <td>
                        <div className="mc-model-cell">
                          <ModelBadge name={model.name} size={28} />
                          <strong>{model.name}</strong>
                          {model.best && <span className="mc-best">{t('modelComparison.table.best')}</span>}
                        </div>
                      </td>
                      <td>{model.type}</td>
                      <td>{formatNumber(model.mae)}</td>
                      <td>{formatNumber(model.r2, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                      <td>{model.resp}ms</td>
                      <td>{model.params}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mc-card" style={{ marginTop: 16 }}>
            <div className="mc-card-head">
              <h3>{t('modelComparison.cards.featureImportance')}</h3>
            </div>
            <div className="mc-card-body">
              <p style={{ margin: '0 0 8px', color: 'var(--hr-muted)', fontSize: 13 }}>
                {t('modelComparison.cards.featureImportanceDesc')}
              </p>
              <svg className="mc-feature-importance" data-chart viewBox="0 0 450 220">
                <line x1="140" y1="10" x2="140" y2="200" stroke="var(--hr-border)" strokeWidth="1.5" />
                <text x="130" y="28" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">{featureLabels.grossArea}</text>
                <rect className="fi-bar" x="140" y="16" width="118" height="18" fill="#2563eb" rx="3" style={{ transitionDelay: '0ms' }} />
                <text x="264" y="29" fontSize="10" fontWeight="700" fill="#2563eb">%42.0</text>
                <text x="130" y="60" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">{featureLabels.location}</text>
                <rect className="fi-bar" x="140" y="48" width="73" height="18" fill="#06b6d4" rx="3" style={{ transitionDelay: '80ms' }} />
                <text x="219" y="61" fontSize="10" fontWeight="700" fill="#06b6d4">%26.0</text>
                <text x="130" y="92" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">{featureLabels.floorRatio}</text>
                <rect className="fi-bar" x="140" y="80" width="39" height="18" fill="#10b981" rx="3" style={{ transitionDelay: '160ms' }} />
                <text x="185" y="93" fontSize="10" fontWeight="700" fill="#10b981">%14.0</text>
                <text x="130" y="124" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">{featureLabels.rooms}</text>
                <rect className="fi-bar" x="140" y="112" width="25" height="18" fill="#8b5cf6" rx="3" style={{ transitionDelay: '240ms' }} />
                <text x="171" y="125" fontSize="10" fontWeight="700" fill="#8b5cf6">%9.0</text>
                <text x="130" y="156" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">{featureLabels.age}</text>
                <rect className="fi-bar" x="140" y="144" width="17" height="18" fill="#fbbf24" rx="3" style={{ transitionDelay: '320ms' }} />
                <text x="163" y="157" fontSize="10" fontWeight="700" fill="#fbbf24">%6.0</text>
                <text x="130" y="188" fontSize="10" fontWeight="600" textAnchor="end" fill="var(--hr-text)">{featureLabels.heating}</text>
                <rect className="fi-bar" x="140" y="176" width="8" height="18" fill="#f97316" rx="3" style={{ transitionDelay: '400ms' }} />
                <text x="154" y="189" fontSize="10" fontWeight="700" fill="#f97316">%3.0</text>
              </svg>
            </div>
          </div>

          <div className="mc-card" style={{ marginTop: 16 }}>
            <div className="mc-card-head">
              <h3>{t('modelComparison.cards.trainingStability')}</h3>
            </div>
            <div className="mc-card-body">
              <p style={{ margin: '0 0 8px', color: 'var(--hr-muted)', fontSize: 13 }}>
                {t('modelComparison.cards.trainingStabilityDesc')}
              </p>
              <svg className="mc-loss-chart" data-chart viewBox="0 0 450 220">
                <line x1="45" y1="30" x2="410" y2="30" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="45" y1="110" x2="410" y2="110" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="45" y1="190" x2="410" y2="190" stroke="var(--hr-border)" strokeWidth="1.5" />
                <text x="35" y="34" fontSize="8" textAnchor="end" fill="var(--hr-muted)">{t('modelComparison.lossChart.loss')}</text>
                <text x="35" y="114" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.5</text>
                <text x="35" y="194" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.0</text>
                <text x="45" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">Epoch 0</text>
                <text x="118" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">20</text>
                <text x="191" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">40</text>
                <text x="264" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">60</text>
                <text x="337" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">80</text>
                <text x="410" y="206" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">100</text>
                <path className="loss-line" d="M 45 33.2 L 81.5 70 L 118 81.2 L 154.5 84.4 L 191 86 L 227.5 86 L 264 87.6 L 337 86 L 410 87.6" fill="none" stroke="#f97316" strokeWidth="2.5" pathLength="1" style={{ transitionDelay: '0ms' }} />
                <path className="loss-line" d="M 45 38 L 81.5 70 L 118 102 L 154.5 126 L 191 142 L 227.5 154.8 L 264 161.2 L 337 167.6 L 410 170.8" fill="none" stroke="#10b981" strokeWidth="2.5" pathLength="1" style={{ transitionDelay: '200ms' }} />
                <path className="loss-line" d="M 45 46 L 81.5 110 L 118 150 L 154.5 170.8 L 191 177.2 L 227.5 182 L 264 183.6 L 337 185.2 L 410 186.8" fill="none" stroke="#2563eb" strokeWidth="2.5" pathLength="1" style={{ transitionDelay: '400ms' }} />
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
              <h3>{t('modelComparison.cards.metricComparison')}</h3>
            </div>
            <div className="mc-card-body">
              <svg className="mc-bar-chart" data-chart viewBox="0 0 320 390">
                <line x1="25" y1="40" x2="310" y2="40" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="25" y1="195" x2="310" y2="195" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <text x="18" y="43" fontSize="8" textAnchor="end" fill="var(--hr-muted)">1.0</text>
                <text x="18" y="198" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.5</text>
                <text x="18" y="353" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.0</text>
                <line x1="25" y1="35" x2="25" y2="350" stroke="var(--hr-border)" strokeWidth="1.5" />

                {metrics.map((metric, metricIndex) => {
                  const groupX = 35 + metricIndex * 70
                  return (
                    <g key={metric}>
                      {BAR_DATA.map((data, dataIndex) => {
                        const height = data.values[metricIndex] * 310
                        return (
                          <rect
                            key={data.name}
                            x={groupX + dataIndex * 14}
                            y={350 - height}
                            width={12}
                            height={height}
                            fill={data.color}
                            rx="2"
                            style={{ transitionDelay: `${(metricIndex * 3 + dataIndex) * 55}ms` }}
                          />
                        )
                      })}
                      <text x={groupX + 21} y={368} fontSize="10" textAnchor="middle" fill="var(--hr-muted)">{metric}</text>
                    </g>
                  )
                })}
                <line x1="20" y1="350" x2="310" y2="350" stroke="var(--hr-border)" strokeWidth="1.5" />
              </svg>
              <div className="mc-legend">
                {BAR_DATA.map(data => (
                  <span key={data.name} style={{ color: data.color }}>
                    <span style={{ color: 'var(--hr-text)' }}>{data.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mc-card" style={{ marginTop: 16 }}>
            <div className="mc-card-head">
              <h3>{t('modelComparison.cards.performanceRadar')}</h3>
            </div>
            <div className="mc-card-body">
              <svg className="mc-radar" data-chart viewBox="0 0 280 240">
                <g transform="translate(140 120)">
                  {[0.25, 0.5, 0.75, 1].map(scale => (
                    <polygon
                      key={scale}
                      points={Object.values(axes).map((_, index) => {
                        const angle = (Math.PI * 2 * index) / Object.keys(axes).length - Math.PI / 2
                        return `${Math.cos(angle) * 90 * scale},${Math.sin(angle) * 90 * scale}`
                      }).join(' ')}
                      fill="none"
                      stroke="var(--hr-border)"
                      strokeWidth="1"
                    />
                  ))}
                  {Object.values(axes).map((axis, index) => {
                    const angle = (Math.PI * 2 * index) / Object.keys(axes).length - Math.PI / 2
                    const x = Math.cos(angle) * 90
                    const y = Math.sin(angle) * 90
                    const labelX = Math.cos(angle) * 108
                    const labelY = Math.sin(angle) * 108
                    return (
                      <g key={axis}>
                        <line x1="0" y1="0" x2={x} y2={y} stroke="var(--hr-border)" strokeWidth="1" />
                        <text x={labelX} y={labelY + 4} fontSize="10" textAnchor="middle" fill="var(--hr-muted)">{axis}</text>
                      </g>
                    )
                  })}
                  {RADAR_DATA.map((data, index) => (
                    <polygon
                      key={data.name}
                      points={radarPoints(data.values, 0, 0, 90)}
                      fill={data.color}
                      fillOpacity="0.18"
                      stroke={data.color}
                      strokeWidth="2"
                      className="radar-poly"
                      style={{ transitionDelay: `${index * 120}ms` }}
                    />
                  ))}
                </g>
              </svg>
              <div className="mc-legend">
                {RADAR_DATA.map(data => (
                  <span key={data.name} style={{ color: data.color }}>
                    <span style={{ color: 'var(--hr-text)' }}>{data.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mc-card" style={{ marginTop: 16 }}>
            <div className="mc-card-head">
              <h3>{t('modelComparison.cards.speedAccuracy')}</h3>
            </div>
            <div className="mc-card-body">
              <svg className="mc-scatter" data-chart viewBox="0 0 320 220">
                <line x1="40" y1="25" x2="300" y2="25" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="40" y1="93" x2="300" y2="93" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="40" y1="169" x2="300" y2="169" stroke="var(--hr-border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="40" y1="20" x2="40" y2="185" stroke="var(--hr-border)" strokeWidth="1.5" />
                <line x1="35" y1="180" x2="305" y2="180" stroke="var(--hr-border)" strokeWidth="1.5" />
                <text x="32" y="28" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.6 (R²)</text>
                <text x="32" y="96" fontSize="8" textAnchor="end" fill="var(--hr-muted)">0.3</text>
                <text x="32" y="172" fontSize="8" textAnchor="end" fill="var(--hr-muted)">-0.1</text>
                <text x="60" y="195" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">28ms</text>
                <text x="153" y="195" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">52ms</text>
                <text x="270" y="195" fontSize="8" textAnchor="middle" fill="var(--hr-muted)">82ms</text>
                <text x="170" y="210" fontSize="9" textAnchor="middle" fontWeight="600" fill="var(--hr-muted)">{t('modelComparison.scatter.inferenceSpeed')}</text>
                <path d="M 60 171 L 79 90 L 126 65 L 177 50 L 204 40" fill="none" stroke="var(--hr-blue)" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.6" />
                {[
                  { cx: 60, cy: 171, fill: '#f97316', label: 'model_8', ly: 163 },
                  { cx: 79, cy: 90, fill: '#f97316', label: 'model_7', ly: 82 },
                  { cx: 99, cy: 108, fill: '#f97316', label: 'model_6', ly: 100 },
                  { cx: 126, cy: 65, fill: '#fbbf24', label: 'model_5', ly: 57 },
                  { cx: 153, cy: 82, fill: '#fbbf24', label: 'model_4', ly: 74 },
                  { cx: 177, cy: 50, fill: '#fbbf24', label: 'model_3', ly: 42 },
                  { cx: 204, cy: 40, fill: '#06b6d4', label: 'model_2', ly: 32 },
                  { cx: 231, cy: 40, fill: '#06b6d4', label: 'model_1', ly: 32 },
                  { cx: 270, cy: 50, fill: '#06b6d4', label: 'model_0', ly: 42 },
                ].map((point, index) => (
                  <g key={point.label}>
                    <circle cx={point.cx} cy={point.cy} r="5" fill={point.fill} className="sc-dot" style={{ transitionDelay: `${index * 60}ms` }} />
                    <text x={point.cx} y={point.ly} fontSize="7" textAnchor="middle" fontWeight="bold" fill="var(--hr-text)">{point.label}</text>
                  </g>
                ))}
              </svg>

              <div className="mc-legend" style={{ marginTop: 12 }}>
                <span style={{ color: '#06b6d4' }}><span style={{ color: 'var(--hr-text)' }}>{t('modelComparison.legend.diamondLeague')}</span></span>
                <span style={{ color: '#fbbf24' }}><span style={{ color: 'var(--hr-text)' }}>{t('modelComparison.legend.goldLeague')}</span></span>
                <span style={{ color: '#f97316' }}><span style={{ color: 'var(--hr-text)' }}>{t('modelComparison.legend.bronzeLeague')}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mc-about">
        <h3><Icon name="brain" size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {t('modelComparison.cards.about')}</h3>
        <p>{t('modelComparison.cards.aboutText')}</p>
      </div>
    </AppShell>
  )
}
