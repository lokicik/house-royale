const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

const PATHS = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  map: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  pin: <><path d="M12 22s8-7.58 8-13a8 8 0 1 0-16 0c0 5.42 8 13 8 13z" /><circle cx="12" cy="9" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  star: <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 17 5.5 21 7.5 13.5 2 9 9 9 12 2" />,
  chart: <><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path d="M4 6h4v3a2 2 0 0 1-4 0V6z" /><path d="M16 6h4v3a2 2 0 0 1-4 0V6z" /><path d="M10 14h4v3h-4z" /><path d="M7 21h10" /><path d="M12 17v4" /></>,
  shield: <path d="M12 2l8 4v6c0 5-4 9-8 10-4-1-8-5-8-10V6z" />,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  brain: <><path d="M9.5 3a3 3 0 0 0-3 3v.5A3 3 0 0 0 5 9a3 3 0 0 0 1.5 5.6V18a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" /><path d="M14.5 3a3 3 0 0 1 3 3v.5A3 3 0 0 1 19 9a3 3 0 0 1-1.5 5.6V18a3 3 0 0 1-6 0" /><path d="M9 11h.01M15 11h.01" /></>,
  bed: <><path d="M2 17v-4a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v4" /><path d="M2 20h20" /><path d="M6 10V7a2 2 0 0 1 2-2h3v5" /></>,
  ruler: <path d="M21 3 3 21l-3-3 18-18 3 3zM6 14l2 2M10 10l2 2M14 6l2 2" />,
  building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" /></>,
  floor: <><path d="M3 21h18" /><path d="M6 21V10l6-4 6 4v11" /><path d="M10 21v-6h4v6" /></>,
  heater: <><path d="M9 3v18M15 3v18" /><path d="M3 7c2 0 2 4 4 4s2-4 4-4 2 4 4 4 2-4 4-4" /></>,
  balcony: <><path d="M3 21h18M3 14h18" /><path d="M5 21V14M9 21v-7M12 21v-7M15 21v-7M19 21V14" /><path d="M5 14V8a7 7 0 0 1 14 0v6" /></>,
  elevator: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8l3-3 3 3M9 16l3 3 3-3" /><path d="M12 5v6M12 13v6" /></>,
  parking: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M10 17V7h3.5a3 3 0 0 1 0 6H10" /></>,
  send: <><path d="M22 2 11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  sparkle: <><path d="M12 3l1.5 5L19 9.5 13.5 11 12 16l-1.5-5L5 9.5 10.5 8 12 3z" /><path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z" /></>,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" fill="currentColor" /></>,
  flame: <path d="M12 2c1 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-5-1 3 1 4 1 4S9 8 12 2z" />,
  robot: <><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M12 2v4" /><circle cx="9" cy="13" r="1.2" fill="currentColor" /><circle cx="15" cy="13" r="1.2" fill="currentColor" /><path d="M9 17h6" /><path d="M2 14v3M22 14v3" /></>,
  gem: <><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M6 3l3 6h6l3-6" /><path d="M2 9h20" /></>,
  check: <><circle cx="12" cy="12" r="10" /><polyline points="8 12 11 15 16 9" /></>,
  trend: <><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></>,
  trendDown: <><polyline points="3 7 9 13 13 9 21 17" /><polyline points="14 17 21 17 21 10" /></>,
  play: <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />,
  arrow: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  exit: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  book: <><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" /><path d="M4 16a4 4 0 0 1 4-4h12" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
}

export function Icon({ name, size = 18, color, className, style }) {
  const path = PATHS[name]
  if (!path) return null
  return (
    <svg {...base(size)} className={className} style={{ color, ...style }}>
      {path}
    </svg>
  )
}

// Model identity — deterministic colored glyph per AI model name.
const PALETTE = [
  { color: '#2563eb', bg: '#dbeafe' },
  { color: '#10b981', bg: '#d1fae5' },
  { color: '#f59e0b', bg: '#fef3c7' },
  { color: '#8b5cf6', bg: '#ede9fe' },
  { color: '#ec4899', bg: '#fce7f3' },
  { color: '#06b6d4', bg: '#cffafe' },
]

const GLYPHS = ['grid', 'hex', 'tri', 'circles', 'star', 'tree']

function hash(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

function ModelGlyph({ kind, size = 16 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (kind) {
    case 'grid':
      return <svg {...props}><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>
    case 'hex':
      return <svg {...props}><polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></svg>
    case 'tri':
      return <svg {...props}><polygon points="12 3 22 21 2 21 12 3" /><line x1="12" y1="10" x2="12" y2="17" /></svg>
    case 'circles':
      return <svg {...props}><circle cx="8" cy="8" r="4" /><circle cx="16" cy="16" r="4" /><line x1="11" y1="11" x2="13" y2="13" /></svg>
    case 'star':
      return <svg {...props}><path d="M12 3v18M3 12h18M5 5l14 14M5 19L19 5" /></svg>
    case 'tree':
      return <svg {...props}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><line x1="6" y1="8.5" x2="11" y2="16" /><line x1="18" y1="8.5" x2="13" y2="16" /></svg>
    default:
      return null
  }
}

function modelIdentity(name) {
  const h = hash(name || 'model')
  const palette = PALETTE[h % PALETTE.length]
  const kind = GLYPHS[h % GLYPHS.length]
  return { ...palette, kind }
}

export function ModelBadge({ name, size = 32 }) {
  const { color, bg, kind } = modelIdentity(name)
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: bg,
        color,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <ModelGlyph kind={kind} size={Math.round(size * 0.55)} />
    </span>
  )
}
