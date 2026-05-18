import { Icon } from './icons'
import { useTheme } from '../contexts/themeContextValue'
import './ThemeToggle.css'

export default function ThemeToggle({ className = '' }) {
  const { resolvedTheme, setTheme } = useTheme()
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
  const label = nextTheme === 'dark' ? 'Karanlık tema' : 'Aydınlık tema'

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      title={label}
    >
      <Icon name={resolvedTheme === 'dark' ? 'moon' : 'sun'} size={16} />
      <span>{label}</span>
    </button>
  )
}
