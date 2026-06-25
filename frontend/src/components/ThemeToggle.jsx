import React from 'react'
import { Icon } from './icons'
import { useLocale } from '../contexts/localeContextValue'
import { useTheme } from '../contexts/themeContextValue'
import './ThemeToggle.css'

void React

export default function ThemeToggle({ className = '' }) {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useLocale()
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
  const label = nextTheme === 'dark' ? t('common.theme.dark') : t('common.theme.light')

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
