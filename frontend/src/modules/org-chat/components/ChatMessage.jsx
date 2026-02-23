import { User, Bot, AlertCircle, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import QueryResult from './QueryResult.jsx'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
      title="Copy query"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  )
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const hasError = !!message.errorMessage
  const hasSoql = !!message.soqlQuery
  const hasResults = !!message.queryResults

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-end gap-2 max-w-[75%]">
          <div className="bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-lg">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center mb-0.5">
            <User size={14} className="text-indigo-200" />
          </div>
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-2 max-w-[85%]">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center mt-0.5">
          <Bot size={14} className="text-indigo-400" />
        </div>
        <div className="flex-1">
          <div className="bg-slate-800 border border-slate-700/50 text-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg">
            {/* Main content */}
            <p className="text-sm leading-relaxed">{message.content}</p>

            {/* Error message */}
            {hasError && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 leading-relaxed">{message.errorMessage}</p>
              </div>
            )}

            {/* SOQL query block */}
            {hasSoql && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">SOQL Query</span>
                  <CopyButton text={message.soqlQuery} />
                </div>
                <div className="bg-slate-900/80 border border-slate-700/40 rounded-lg px-3 py-2.5">
                  <code className="text-xs text-indigo-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
                    {message.soqlQuery}
                  </code>
                </div>
              </div>
            )}

            {/* Query results table */}
            {hasResults && <QueryResult jsonResults={message.queryResults} />}
          </div>
        </div>
      </div>
    </div>
  )
}
