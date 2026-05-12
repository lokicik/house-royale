import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useWebSocket opens a WebSocket to `url` and calls `onMessage` for each
 * parsed JSON message. Returns { connected, send }.
 *
 * `onMessage` should be stable (use useCallback) to avoid reconnects.
 */
export function useWebSocket(url, onMessage) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!url) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        onMessageRef.current?.(msg)
      } catch (_) {}
    }

    return () => {
      ws.onopen = null
      ws.onclose = null
      ws.onerror = null
      ws.onmessage = null
      ws.close()
    }
  }, [url])

  const send = useCallback((type, payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  return { connected, send }
}
