import React from 'react'
import { useLocale } from '../contexts/localeContextValue'
import './LocaleToggle.css'

const OPTIONS = ['tr', 'en']

void React

export default function LocaleToggle({ className = '' }) {
  const { locale, setLocale, t } = useLocale()

  return (
    <div className={`locale-toggle ${className}`.trim()} aria-label="Language switcher">
      {OPTIONS.map(option => (
        <button
          key={option}
          type="button"
          className={`locale-toggle-btn${locale === option ? ' active' : ''}`}
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          aria-label={t(`common.locale.switchTo.${option}`)}
          title={t(`common.locale.switchTo.${option}`)}
        >
          {t(`common.locale.current.${option}`)}
        </button>
      ))}
    </div>
  )
}
