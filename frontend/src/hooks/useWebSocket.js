import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_BACKOFF = 30_000
const BASE_DELAY = 1000

export function useWebSocket(url, onMessage, options = {}) {
  const { resolveTerminalState } = options

  const [connected, setConnected] = useState(false)
  const [connectionState, setConnectionState] = useState('idle')
  const [connectionError, setConnectionError] = useState(null)
  const [terminalState, setTerminalState] = useState(null)

  const wsRef = useRef(null)
  const onMessageRef = useRef(onMessage)
  const resolveTerminalStateRef = useRef(resolveTerminalState)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const shouldReconnectRef = useRef(true)
  const intentionalCloseRef = useRef(false)
  const attemptRef = useRef(0)
  const connectionStateRef = useRef('idle')

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    resolveTerminalStateRef.current = resolveTerminalState
  }, [resolveTerminalState])

  useEffect(() => {
    connectionStateRef.current = connectionState
  }, [connectionState])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const applyTerminalState = useCallback((state) => {
    shouldReconnectRef.current = false
    clearTimeout(retryTimerRef.current)
    retryTimerRef.current = null
    if (!mountedRef.current) return
    setConnected(false)
    setConnectionState('terminal')
    setConnectionError(null)
    setTerminalState(state)
  }, [])

  const disconnect = useCallback((reconnect = false) => {
    shouldReconnectRef.current = reconnect
    intentionalCloseRef.current = true
    clearTimeout(retryTimerRef.current)
    retryTimerRef.current = null
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (mountedRef.current) {
      setConnected(false)
      setConnectionState(reconnect ? 'reconnecting' : 'idle')
      if (!reconnect) {
        setConnectionError(null)
        setTerminalState(null)
      }
    }
  }, [])

  useEffect(() => {
    if (!url) return

    shouldReconnectRef.current = true
    intentionalCloseRef.current = false
    retryCountRef.current = 0

    function scheduleReconnect() {
      if (!shouldReconnectRef.current) return
      const delay = Math.min(BASE_DELAY * Math.pow(2, retryCountRef.current), MAX_BACKOFF)
      retryCountRef.current += 1
      if (mountedRef.current) {
        setConnectionState('reconnecting')
        setConnectionError('Baglanti kurulamadi. Tekrar deneniyor...')
      }
      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, delay)
    }

    async function probeTerminalState(expectedAttempt) {
      const resolver = resolveTerminalStateRef.current
      if (!resolver) return false
      try {
        const result = await resolver()
        if (!mountedRef.current || attemptRef.current !== expectedAttempt) {
          return true
        }
        if (result?.terminal) {
          applyTerminalState(result)
          return true
        }
      } catch {
        // Ignore probe failures and continue reconnecting.
      }
      return false
    }

    function connect() {
      if (!mountedRef.current || !shouldReconnectRef.current) return

      const attempt = ++attemptRef.current
      intentionalCloseRef.current = false
      setTerminalState(null)
      setConnectionError(null)
      setConnectionState(retryCountRef.current > 0 ? 'reconnecting' : 'connecting')

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current || attemptRef.current !== attempt) return
        retryCountRef.current = 0
        setTerminalState(null)
        setConnectionError(null)
        setConnected(true)
        setConnectionState('connected')
      }

      ws.onclose = async () => {
        if (!mountedRef.current || attemptRef.current !== attempt) return
        const intentional = intentionalCloseRef.current
        intentionalCloseRef.current = false
        setConnected(false)
        if (intentional) {
          if (connectionStateRef.current !== 'terminal') {
            setConnectionState('idle')
          }
          return
        }
        if (await probeTerminalState(attempt)) {
          return
        }
        scheduleReconnect()
      }

      ws.onerror = () => {
        if (!mountedRef.current || attemptRef.current !== attempt) return
        setConnected(false)
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          onMessageRef.current?.(msg)
        } catch {
          // Ignore malformed server messages.
        }
      }
    }

    connect()

    return () => {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
      retryCountRef.current = 0
      intentionalCloseRef.current = true
      if (wsRef.current) {
        wsRef.current.onopen = null
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.onmessage = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [url, applyTerminalState])

  const send = useCallback((type, payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  return { connected, connectionState, connectionError, terminalState, send, disconnect }
}
