const LOCALE_CODES = {
  tr: 'tr-TR',
  en: 'en-US',
}

export function getLocaleCode(locale) {
  return LOCALE_CODES[locale] ?? LOCALE_CODES.tr
}

export function formatNumber(locale, value, options = {}) {
  if (value == null || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat(getLocaleCode(locale), options).format(value)
}

export function formatCurrency(locale, value, options = {}) {
  if (value == null || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat(getLocaleCode(locale), {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
    ...options,
  }).format(value)
}

export function formatPercent(locale, value, options = {}) {
  if (value == null || Number.isNaN(value)) return '-'
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = minimumFractionDigits,
    signed = false,
  } = options

  const absValue = Math.abs(value)
  const formatted = formatNumber(locale, absValue, {
    minimumFractionDigits,
    maximumFractionDigits,
  })

  if (signed && value > 0) return `+${formatted}%`
  if (signed && value < 0) return `-${formatted}%`
  return `${value < 0 ? '-' : ''}${formatted}%`
}

export function formatDate(locale, value, options = {}) {
  if (!value) return '-'
  return new Intl.DateTimeFormat(getLocaleCode(locale), options).format(new Date(value))
}

export function formatRelativeTime(locale, value, now = Date.now()) {
  if (!value) return ''

  const target = typeof value === 'number' ? value : new Date(value).getTime()
  const diff = target - now
  const absDiff = Math.abs(diff)
  const formatter = new Intl.RelativeTimeFormat(getLocaleCode(locale), { numeric: 'auto' })

  if (absDiff < 10_000) {
    return locale === 'tr' ? 'az once' : 'just now'
  }
  if (absDiff < 60_000) {
    return formatter.format(Math.round(diff / 1000), 'second')
  }
  if (absDiff < 3_600_000) {
    return formatter.format(Math.round(diff / 60_000), 'minute')
  }
  if (absDiff < 86_400_000) {
    return formatter.format(Math.round(diff / 3_600_000), 'hour')
  }
  return formatter.format(Math.round(diff / 86_400_000), 'day')
}
