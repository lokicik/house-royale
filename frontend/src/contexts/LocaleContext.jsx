import React, { useEffect, useMemo, useState } from 'react'
import { LocaleContext } from './localeContextValue'
import { messages } from '../i18n/messages'
import {
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatNumber as baseFormatNumber,
  formatPercent as baseFormatPercent,
  formatRelativeTime as baseFormatRelativeTime,
} from '../i18n/format'

void React

const STORAGE_KEY = 'house-royale-locale'
const SUPPORTED_LOCALES = new Set(['tr', 'en'])

function detectBrowserLocale() {
  if (typeof window === 'undefined') return 'tr'
  return window.navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'tr'
}

function getStoredLocale() {
  if (typeof window === 'undefined') return 'tr'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (SUPPORTED_LOCALES.has(stored)) return stored
  return detectBrowserLocale()
}

function getByPath(obj, path) {
  return path.split('.').reduce((value, segment) => value?.[segment], obj)
}

function interpolate(text, params) {
  if (typeof text !== 'string' || !params) return text
  return text.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? '')
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(getStoredLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  function setLocale(nextLocale) {
    const safeLocale = SUPPORTED_LOCALES.has(nextLocale) ? nextLocale : 'tr'
    setLocaleState(safeLocale)
  }

  const value = useMemo(() => {
    const dictionary = messages[locale] ?? messages.tr

    function hasTranslation(path) {
      return getByPath(dictionary, path) !== undefined
    }

    function t(path, params) {
      const raw = getByPath(dictionary, path)
      if (typeof raw === 'function') return raw(params)
      if (typeof raw === 'string') return interpolate(raw, params)
      return raw
    }

    function resolveError(error, fallbackKey = null) {
      if (error?.code) {
        const codeKey = `errors.codes.${error.code}`
        if (hasTranslation(codeKey)) return t(codeKey)
      }
      if (fallbackKey && hasTranslation(fallbackKey)) return t(fallbackKey)
      if (error?.message) return error.message
      return t('errors.generic')
    }

    return {
      locale,
      setLocale,
      t,
      resolveError,
      formatCurrency: (value, options) => baseFormatCurrency(locale, value, options),
      formatDate: (value, options) => baseFormatDate(locale, value, options),
      formatNumber: (value, options) => baseFormatNumber(locale, value, options),
      formatPercent: (value, options) => baseFormatPercent(locale, value, options),
      formatRelativeTime: (value, now) => baseFormatRelativeTime(locale, value, now),
    }
  }, [locale])

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}
