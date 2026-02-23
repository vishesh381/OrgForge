import { useEffect, useRef } from 'react'
import wsClient from '../services/wsClient.js'

export function useWebSocket(topic, onMessage) {
  const cbRef = useRef(onMessage)
  cbRef.current = onMessage

  useEffect(() => {
    if (!topic) return
    wsClient.subscribe(topic, (data) => cbRef.current(data))
    return () => wsClient.unsubscribe(topic)
  }, [topic])
}
