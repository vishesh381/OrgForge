import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Bot, Sparkles } from 'lucide-react'
import ChatMessage from './ChatMessage.jsx'
import { getMessages, sendMessage } from '../services/orgChatApi.js'

export default function ChatWindow({ session, orgId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  // Load messages when session changes
  useEffect(() => {
    if (!session) {
      setMessages([])
      return
    }

    setLoading(true)
    setError(null)
    getMessages(session.id)
      .then(data => setMessages(data))
      .catch(() => setError('Failed to load messages.'))
      .finally(() => setLoading(false))
  }, [session?.id])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = async () => {
    if (!input.trim() || sending || !orgId) return

    const content = input.trim()
    setInput('')
    setSending(true)
    setError(null)

    // Optimistically add user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const assistantMsg = await sendMessage(session.id, orgId, content)
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message. Please try again.')
      // Remove optimistic user message on failure
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
      setInput(content)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Example prompts
  const examplePrompts = [
    'Show me all Accounts created this month',
    'List open Opportunities over $100,000',
    'Find Contacts with no email address',
    'Count Leads by LeadSource',
  ]

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Sparkles size={28} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Ask about your Salesforce data</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-8">
              Type a question in plain English and I'll generate the SOQL query and fetch the results for you.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-md">
              {examplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="text-left px-4 py-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/40 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <ChatMessage key={msg.id || idx} message={msg} />
        ))}

        {/* Claude is thinking indicator */}
        {sending && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center mt-0.5">
                <Bot size={14} className="text-indigo-400" />
              </div>
              <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  <span className="text-sm text-slate-400">Claude is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-lg mb-4 px-4 py-2.5 bg-red-900/20 border border-red-700/30 rounded-xl">
            <p className="text-xs text-red-400 text-center">{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-6 pb-6 pt-2">
        <div className="relative flex items-end gap-3 bg-slate-800 border border-slate-700/60 rounded-2xl px-4 py-3 focus-within:border-indigo-500/60 transition-colors shadow-xl">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your Salesforce data..."
            rows={1}
            disabled={sending}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 resize-none outline-none leading-relaxed max-h-32 overflow-y-auto disabled:opacity-50"
            style={{ fieldSizing: 'content' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || !orgId}
            className={`
              flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all
              ${input.trim() && !sending && orgId
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
            `}
          >
            {sending
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} />
            }
          </button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
