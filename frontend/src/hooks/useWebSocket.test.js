import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useWebSocket } from './useWebSocket'

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances = []

  constructor(url) {
    this.url = url
    this.readyState = FakeWebSocket.CONNECTING
    this.sent = []
    this.onopen = null
    this.onclose = null
    this.onerror = null
    this.onmessage = null
    FakeWebSocket.instances.push(this)
  }

  send(data) {
    this.sent.push(data)
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({})
  }

  open() {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.({})
  }

  fail() {
    this.onerror?.(new Event('error'))
  }

  serverClose() {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({})
  }
}

describe('useWebSocket', () => {
  const originalWebSocket = globalThis.WebSocket

  beforeEach(() => {
    FakeWebSocket.instances = []
    globalThis.WebSocket = FakeWebSocket
    vi.useFakeTimers()
  })

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket
  })

  it('reconnects after a transient disconnect when terminal probe says to continue', async () => {
    const resolveTerminalState = vi.fn().mockResolvedValue({ terminal: false })
    const { result } = renderHook(() => useWebSocket('ws://example.test/socket', vi.fn(), { resolveTerminalState }))

    expect(FakeWebSocket.instances).toHaveLength(1)

    await act(async () => {
      FakeWebSocket.instances[0].open()
    })

    expect(result.current.connected).toBe(true)
    expect(result.current.connectionState).toBe('connected')

    await act(async () => {
      FakeWebSocket.instances[0].serverClose()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(resolveTerminalState).toHaveBeenCalledTimes(1)
    expect(result.current.connectionState).toBe('reconnecting')

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('stops reconnecting and exposes terminal state when probe returns a terminal result', async () => {
    const resolveTerminalState = vi.fn().mockResolvedValue({
      terminal: true,
      errorCode: 'removed_from_lobby',
      message: 'Host seni odadan cikardi.',
    })

    const { result } = renderHook(() => useWebSocket('ws://example.test/socket', vi.fn(), { resolveTerminalState }))

    await act(async () => {
      FakeWebSocket.instances[0].open()
    })

    await act(async () => {
      FakeWebSocket.instances[0].serverClose()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.connectionState).toBe('terminal')

    expect(result.current.terminalState).toEqual({
      terminal: true,
      errorCode: 'removed_from_lobby',
      message: 'Host seni odadan cikardi.',
    })

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('does not reconnect after an intentional disconnect', async () => {
    const resolveTerminalState = vi.fn()
    const { result } = renderHook(() => useWebSocket('ws://example.test/socket', vi.fn(), { resolveTerminalState }))

    await act(async () => {
      FakeWebSocket.instances[0].open()
    })

    await act(async () => {
      result.current.disconnect(false)
    })

    expect(result.current.connectionState).toBe('idle')

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(resolveTerminalState).not.toHaveBeenCalled()
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('sends messages only while the socket is open', async () => {
    const { result } = renderHook(() => useWebSocket('ws://example.test/socket', vi.fn()))

    await act(async () => {
      result.current.send('JOIN', { nickname: 'Lokman' })
    })

    expect(FakeWebSocket.instances[0].sent).toEqual([])

    await act(async () => {
      FakeWebSocket.instances[0].open()
    })

    await act(async () => {
      result.current.send('JOIN', { nickname: 'Lokman' })
    })

    expect(FakeWebSocket.instances[0].sent).toEqual([
      JSON.stringify({ type: 'JOIN', payload: { nickname: 'Lokman' } }),
    ])
  })
})
