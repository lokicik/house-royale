import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { LocaleProvider } from '../contexts/LocaleContext'
import LobbyRoom from './LobbyRoom'

void React

const mockUseAuth = vi.fn()
const mockUseWebSocket = vi.fn()
const mockProbeLobbyAccess = vi.fn()
const mockWsUrl = vi.fn(() => 'ws://example.test/lobby')

vi.mock('../contexts/authContextValue', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: (...args) => mockUseWebSocket(...args),
}))

vi.mock('../lib/api', () => ({
  probeLobbyAccess: (...args) => mockProbeLobbyAccess(...args),
  wsUrl: (...args) => mockWsUrl(...args),
}))

vi.mock('../components/AppShell', () => ({
  default: ({ children }) => <div data-testid="app-shell">{children}</div>,
}))

vi.mock('../components/icons', () => ({
  Icon: () => <span data-testid="icon" />,
  ModelBadge: ({ name }) => <span>{name}</span>,
}))

vi.mock('../components/DistrictMap', () => ({
  default: () => <div data-testid="district-map" />,
}))

function LobbyLocationProbe() {
  const location = useLocation()
  return (
    <div data-testid="lobby-destination">
      {location.state?.notice ?? ''}
    </div>
  )
}

describe('LobbyRoom terminal redirects', () => {
  beforeEach(() => {
    window.localStorage.setItem('house-royale-locale', 'tr')
    mockProbeLobbyAccess.mockReset()
    mockWsUrl.mockClear()
    mockUseAuth.mockReturnValue({
      user: {
        uid: 'user-1',
        displayName: 'Lokman',
        email: 'lokman@example.com',
        getIdToken: vi.fn().mockResolvedValue('token-1'),
      },
    })
  })

  it('redirects to /lobby once when terminal state is reported', async () => {
    const disconnect = vi.fn()
    mockUseWebSocket.mockReturnValue({
      connected: false,
      connectionState: 'terminal',
      connectionError: null,
      connectionErrorCode: null,
      terminalState: {
        terminal: true,
        errorCode: 'removed_from_lobby',
        message: 'Host seni odadan çıkardı.',
      },
      send: vi.fn(),
      disconnect,
    })

    render(
      <LocaleProvider>
        <MemoryRouter initialEntries={[{ pathname: '/lobby/ROOM42', state: { nickname: 'Lokman' } }]}>
          <Routes>
            <Route path="/lobby/:id" element={<LobbyRoom />} />
            <Route path="/lobby" element={<LobbyLocationProbe />} />
          </Routes>
        </MemoryRouter>
      </LocaleProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('lobby-destination')).toHaveTextContent('Host seni odadan çıkardı.')
    })

    expect(disconnect).toHaveBeenCalledWith(false)
    expect(disconnect).toHaveBeenCalledTimes(1)
  })
})
