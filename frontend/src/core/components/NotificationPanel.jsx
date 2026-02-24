import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, CheckCheck, Trash2, RefreshCw, AlertCircle, Info, CheckCircle, Zap } from 'lucide-react'
import apiClient from '../services/apiClient.js'
import { useNotificationStore } from '../store/appStore.js'
import { useOrg } from '../hooks/useOrg.js'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function NotifIcon({ type }) {
  const base = 'w-4 h-4 shrink-0'
  if (type === 'error' || type === 'alert')   return <AlertCircle className={`${base} text-red-400`} />
  if (type === 'success')                     return <CheckCircle  className={`${base} text-green-400`} />
  if (type === 'salesforce')                  return <Zap          className={`${base} text-sky-400`} />
  return <Info className={`${base} text-indigo-400`} />
}

export default function NotificationPanel() {
  const { activeOrgId } = useOrg()
  const { notifications, markRead, markAllRead, removeNotification, clearAll } = useNotificationStore()

  const [open, setOpen] = useState(false)
  const [sfNotifs, setSfNotifs] = useState([])
  const [sfLoading, setSfLoading] = useState(false)
  const panelRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchSfNotifs = useCallback(async () => {
    if (!activeOrgId) return
    setSfLoading(true)
    try {
      const { data } = await apiClient.get(`/notifications?orgId=${activeOrgId}`)
      setSfNotifs(Array.isArray(data?.notifications) ? data.notifications : [])
    } catch {
      setSfNotifs([])
    } finally { setSfLoading(false) }
  }, [activeOrgId])

  // Fetch SF notifications when panel opens
  useEffect(() => {
    if (open) fetchSfNotifs()
  }, [open, fetchSfNotifs])

  const unreadCount = notifications.filter(n => !n.read).length

  // Merge: internal OrgForge notifs + SF notifs
  const allItems = [
    ...notifications.map(n => ({
      id: `of-${n.id}`,
      subject: n.title || n.type || 'Notification',
      body: n.message || '',
      date: n.createdAt || new Date().toISOString(),
      read: !!n.read,
      type: n.type || 'info',
      source: 'orgforge',
      _internal: n,
    })),
    ...sfNotifs.map(n => ({
      id: `sf-${n.id}`,
      subject: n.subject || 'Salesforce Notification',
      body: n.body || '',
      date: n.date,
      read: !!n.read,
      type: 'salesforce',
      source: 'salesforce',
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`p-2 rounded-lg transition-colors relative ${
          open ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col max-h-[520px]">

          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Mark all read"
                  className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={fetchSfNotifs} disabled={sfLoading} title="Refresh"
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40">
                <RefreshCw className={`w-3.5 h-3.5 ${sfLoading ? 'animate-spin' : ''}`} />
              </button>
              {allItems.length > 0 && (
                <button onClick={() => { clearAll(); setSfNotifs([]) }} title="Clear all"
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {allItems.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">All caught up!</p>
                <p className="text-xs text-slate-600 mt-1">No notifications right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {allItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.source === 'orgforge' && item._internal) markRead(item._internal.id)
                    }}
                    className={`px-4 py-3 flex items-start gap-3 cursor-default transition-colors hover:bg-slate-800/60 ${
                      !item.read ? 'bg-indigo-500/5' : ''
                    }`}
                  >
                    {/* Unread dot */}
                    <div className="mt-1 shrink-0">
                      {!item.read
                        ? <span className="w-2 h-2 rounded-full bg-indigo-400 block" />
                        : <span className="w-2 h-2 block" />
                      }
                    </div>

                    <NotifIcon type={item.type} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-medium leading-snug truncate ${item.read ? 'text-slate-300' : 'text-white'}`}>
                          {item.subject}
                        </p>
                        <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">{timeAgo(item.date)}</span>
                      </div>
                      {item.body && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.body}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          item.source === 'salesforce'
                            ? 'bg-sky-500/15 text-sky-400'
                            : 'bg-slate-700 text-slate-500'
                        }`}>
                          {item.source === 'salesforce' ? 'Salesforce' : 'OrgForge'}
                        </span>
                      </div>
                    </div>

                    {item.source === 'orgforge' && item._internal && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeNotification(item._internal.id) }}
                        className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors mt-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {allItems.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-700 shrink-0">
              <p className="text-[11px] text-slate-600 text-center">
                {allItems.length} notification{allItems.length !== 1 ? 's' : ''} ·{' '}
                {sfNotifs.length > 0 ? `${sfNotifs.length} from Salesforce` : 'Salesforce up to date'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
