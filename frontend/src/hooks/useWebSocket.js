import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_BACKOFF = 30_000
const BASE_DELAY = 1000

export function useWebSocket(url, onMessage) {
  const [connected, setConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const wsRef = useRef(null)
  const onMessageRef = useRef(onMessage)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!url) return

    function connect() {
      if (!mountedRef.current) return

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        retryCountRef.current = 0
        setConnectionError(null)
        setConnected(true)
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setConnected(false)
        scheduleReconnect()
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setConnected(false)
        setConnectionError('Bağlantı kurulamadı. Tekrar deneniyor…')
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

    function scheduleReconnect() {
      const delay = Math.min(BASE_DELAY * Math.pow(2, retryCountRef.current), MAX_BACKOFF)
      retryCountRef.current += 1
      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, delay)
    }

    connect()

    return () => {
      clearTimeout(retryTimerRef.current)
      retryCountRef.current = 0
      if (wsRef.current) {
        wsRef.current.onopen = null
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.onmessage = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [url])

  const send = useCallback((type, payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  return { connected, connectionError, send }
}
