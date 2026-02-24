import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '../store/appStore.js'

class WebSocketClient {
  constructor() {
    this.client = null
    this.subscriptions = new Map()
  }

  connect() {
    if (this.client?.connected) return
    const token = useAuthStore.getState().token
    this.client = new Client({
      webSocketFactory: () => new SockJS(import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/ws` : '/ws'),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('[WS] Connected')
        this.subscriptions.forEach((cb, topic) => this._doSubscribe(topic, cb))
      },
      onDisconnect: () => console.log('[WS] Disconnected'),
      onStompError: (f) => console.error('[WS] STOMP error', f),
    })
    this.client.activate()
  }

  _doSubscribe(topic, cb) {
    if (!this.client?.connected) return null
    return this.client.subscribe(topic, (msg) => {
      try { cb(JSON.parse(msg.body)) } catch { cb(msg.body) }
    })
  }

  subscribe(topic, cb) {
    this.subscriptions.set(topic, cb)
    if (this.client?.connected) return this._doSubscribe(topic, cb)
    this.connect()
    return null
  }

  unsubscribe(topic) { this.subscriptions.delete(topic) }

  disconnect() {
    this.client?.deactivate()
    this.subscriptions.clear()
  }
}

export const wsClient = new WebSocketClient()
export default wsClient
