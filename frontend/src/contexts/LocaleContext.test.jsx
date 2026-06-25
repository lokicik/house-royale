import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import Landing from '../pages/Landing'
import { ThemeProvider } from './ThemeContext'
import { useLocale } from './localeContextValue'
import { LocaleProvider } from './LocaleContext'

void React

function LocaleProbe() {
  const { locale, t } = useLocale()

  return (
    <>
      <span data-testid="locale">{locale}</span>
      <span>{t('landing.actions.playNow')}</span>
    </>
  )
}

function renderLanding() {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      </ThemeProvider>
    </LocaleProvider>,
  )
}

describe('LocaleProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('auto-detects English from the browser locale on first load', async () => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    })

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('locale')).toHaveTextContent('en')
      expect(screen.getByText('Play Now')).toBeInTheDocument()
      expect(document.documentElement.lang).toBe('en')
    })
  })

  it('persists manual locale switching from the landing navigation', async () => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'tr-TR',
    })

    renderLanding()

    expect(screen.getByText('Hemen Oyna')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Switch to English' })[0])

    await waitFor(() => {
      expect(screen.getByText('Play Now')).toBeInTheDocument()
      expect(window.localStorage.getItem('house-royale-locale')).toBe('en')
      expect(document.documentElement.lang).toBe('en')
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Türkçeye geç' })[0])

    await waitFor(() => {
      expect(screen.getByText('Hemen Oyna')).toBeInTheDocument()
      expect(window.localStorage.getItem('house-royale-locale')).toBe('tr')
      expect(document.documentElement.lang).toBe('tr')
    })
  })

  it('renders English landing copy from persisted locale state', async () => {
    window.localStorage.setItem('house-royale-locale', 'en')

    renderLanding()

    await waitFor(() => {
      expect(screen.getByText('Real estate price prediction game')).toBeInTheDocument()
      expect(screen.getByText('Guess the home price.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Privacy' })).toBeInTheDocument()
    })
  })
})
