import { createContext, useContext } from 'react'

export const LocaleContext = createContext(null)

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('useLocale must be used within LocaleProvider')
  return context
}
