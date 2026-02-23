import { useState } from 'react'
import { MessageSquarePlus, Trash2, MessageSquare } from 'lucide-react'

function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString()
}

export default function SessionList({ sessions, activeSessionId, onSelect, onCreate, onDelete }) {
  const [hoveredId, setHoveredId] = useState(null)

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700/50">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">Chats</span>
        </div>
        <button
          onClick={onCreate}
          title="New Chat"
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
        >
          <MessageSquarePlus size={16} />
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {sessions.length === 0 && (
          <div className="px-2 py-8 text-center">
            <p className="text-xs text-slate-500">No conversations yet.</p>
            <p className="text-xs text-slate-600 mt-1">Start a new chat above.</p>
          </div>
        )}

        {sessions.map((session) => {
          const isActive = session.id === activeSessionId
          const isHovered = hoveredId === session.id

          return (
            <div
              key={session.id}
              onClick={() => onSelect(session)}
              onMouseEnter={() => setHoveredId(session.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`
                group relative flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all
                ${isActive
                  ? 'bg-indigo-600/20 border border-indigo-500/30'
                  : 'hover:bg-slate-800/60 border border-transparent'}
              `}
            >
              <MessageSquare
                size={14}
                className={`mt-0.5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}
              />

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isActive ? 'text-indigo-200' : 'text-slate-300'}`}>
                  {session.title || 'New Chat'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {timeAgo(session.updatedAt || session.createdAt)}
                </p>
              </div>

              {/* Delete button — visible on hover */}
              {isHovered && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(session.id)
                  }}
                  className="flex-shrink-0 p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  title="Delete chat"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
