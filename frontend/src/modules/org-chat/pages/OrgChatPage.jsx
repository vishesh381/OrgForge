import { useState, useEffect } from 'react'
import { MessageSquare, Plug } from 'lucide-react'
import { useOrg } from '../../../core/hooks/useOrg.js'
import SessionList from '../components/SessionList.jsx'
import ChatWindow from '../components/ChatWindow.jsx'
import { getSessions, createSession, deleteSession } from '../services/orgChatApi.js'

export default function OrgChatPage() {
  const { activeOrgId } = useOrg()
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Load sessions whenever active org changes
  useEffect(() => {
    if (!activeOrgId) {
      setSessions([])
      setActiveSession(null)
      return
    }

    setLoadingSessions(true)
    getSessions(activeOrgId)
      .then(data => {
        setSessions(data)
        // Auto-select the most recent session
        if (data.length > 0 && !activeSession) {
          setActiveSession(data[0])
        }
      })
      .catch(err => console.error('Failed to load sessions:', err))
      .finally(() => setLoadingSessions(false))
  }, [activeOrgId])

  const handleCreate = async () => {
    if (!activeOrgId) return
    try {
      const newSession = await createSession(activeOrgId, 'user')
      setSessions(prev => [newSession, ...prev])
      setActiveSession(newSession)
    } catch (err) {
      console.error('Failed to create session:', err)
    }
  }

  const handleDelete = async (sessionId) => {
    try {
      await deleteSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (activeSession?.id === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId)
        setActiveSession(remaining.length > 0 ? remaining[0] : null)
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  const handleSelect = (session) => {
    setActiveSession(session)
  }

  // Update session title in sidebar when a new message is sent
  const handleSessionUpdate = (updatedSession) => {
    setSessions(prev =>
      prev.map(s => s.id === updatedSession.id ? updatedSession : s)
    )
  }

  // No org connected
  if (!activeOrgId) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
            <Plug size={28} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">No Salesforce Org Connected</h3>
          <p className="text-sm text-slate-500">
            Connect a Salesforce org to start chatting with your data using natural language.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — session list */}
      <div className="w-64 flex-shrink-0 flex flex-col h-full">
        <SessionList
          sessions={sessions}
          activeSessionId={activeSession?.id}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      </div>

      {/* Right panel — chat window */}
      <div className="flex-1 flex flex-col h-full bg-slate-900/50 overflow-hidden">
        {activeSession ? (
          <>
            {/* Session header */}
            <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-900/80 flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                <MessageSquare size={15} className="text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200 truncate max-w-sm">
                  {activeSession.title || 'New Chat'}
                </h2>
                <p className="text-xs text-slate-500">Natural language SOQL · Claude AI</p>
              </div>
            </div>

            <ChatWindow
              session={activeSession}
              orgId={activeOrgId}
              onSessionUpdate={handleSessionUpdate}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={28} className="text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Select or start a new chat</h3>
              <p className="text-sm text-slate-500 mb-6">
                Choose an existing conversation from the sidebar or create a new one to explore your Salesforce data.
              </p>
              <button
                onClick={handleCreate}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
              >
                New Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
