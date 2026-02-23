import { CheckCircle, XCircle, Clock } from 'lucide-react'

function StatusIcon({ status }) {
  const s = status?.toUpperCase()
  if (s === 'SUCCESS' || s === 'SUCCEEDED') return <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
  if (s === 'FAILED' || s === 'ERROR') return <XCircle className="w-4 h-4 text-red-400 shrink-0" />
  return <Clock className="w-4 h-4 text-slate-500 shrink-0" />
}

function rowBg(status) {
  const s = status?.toUpperCase()
  if (s === 'SUCCESS' || s === 'SUCCEEDED') return 'bg-green-500/5 hover:bg-green-500/10'
  if (s === 'FAILED' || s === 'ERROR') return 'bg-red-500/5 hover:bg-red-500/10'
  return 'hover:bg-slate-700/20'
}

export default function ComponentList({ components = [] }) {
  if (components.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-slate-500 text-sm">No components tracked for this deployment.</p>
      </div>
    )
  }

  return (
    <div className="space-y-0 rounded-lg overflow-hidden border border-slate-700/60">
      {components.map((c, idx) => (
        <div
          key={c.id ?? idx}
          className={`flex items-start gap-3 px-4 py-3 transition-colors ${rowBg(c.status)} ${idx > 0 ? 'border-t border-slate-700/40' : ''}`}
        >
          <div className="mt-0.5">
            <StatusIcon status={c.status} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white truncate">{c.componentName || '—'}</span>
              {c.componentType && (
                <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded font-mono">
                  {c.componentType}
                </span>
              )}
            </div>
            {c.errorMessage && (
              <p className="mt-1 text-xs text-red-400/80 leading-relaxed">{c.errorMessage}</p>
            )}
          </div>
          <div className="shrink-0">
            <span className={`text-xs font-medium ${
              c.status?.toUpperCase() === 'SUCCESS' || c.status?.toUpperCase() === 'SUCCEEDED'
                ? 'text-green-400'
                : c.status?.toUpperCase() === 'FAILED' || c.status?.toUpperCase() === 'ERROR'
                ? 'text-red-400'
                : 'text-slate-500'
            }`}>
              {c.status || 'PENDING'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
