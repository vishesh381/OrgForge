import { XCircle, CheckCircle, ChevronRight } from 'lucide-react'

function formatDate(dt) {
  if (!dt) return '--'
  return new Date(dt).toLocaleString()
}

function formatDuration(ms) {
  if (ms == null) return '--'
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

export default function FlowErrorPanel({ flowRun }) {
  if (!flowRun) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
        <p className="text-slate-400 text-sm">Select a flow run to view details.</p>
      </div>
    )
  }

  const hasErrors = flowRun.errors && flowRun.errors.length > 0
  const isError = ['error', 'fault', 'failed'].includes((flowRun.status || '').toLowerCase())

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 border-b ${isError ? 'border-red-500/20 bg-red-500/5' : 'border-slate-700 bg-slate-800/50'}`}>
        <div className="flex items-center gap-2 mb-1">
          {isError
            ? <XCircle size={16} className="text-red-400 shrink-0" />
            : <CheckCircle size={16} className="text-green-400 shrink-0" />
          }
          <h3 className="text-sm font-semibold text-white truncate">
            {flowRun.flowName || `Run #${flowRun.id}`}
          </h3>
        </div>
        <p className="text-xs text-slate-400 ml-6">{flowRun.flowType || 'Unknown type'}</p>
      </div>

      {/* Meta */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3 text-xs border-b border-slate-700/50">
        <div>
          <span className="text-slate-500 block">Status</span>
          <span className={`font-medium ${isError ? 'text-red-400' : 'text-green-400'}`}>
            {flowRun.status || 'Unknown'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Duration</span>
          <span className="text-slate-300 font-medium">{formatDuration(flowRun.durationMs)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Started</span>
          <span className="text-slate-300">{formatDate(flowRun.startedAt)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Triggered By</span>
          <span className="text-slate-300">{flowRun.triggeredBy || '--'}</span>
        </div>
        {flowRun.recordId && (
          <div className="col-span-2">
            <span className="text-slate-500 block">Record ID</span>
            <span className="text-slate-300 font-mono text-xs">{flowRun.recordId}</span>
          </div>
        )}
      </div>

      {/* Error message at run level */}
      {flowRun.errorMessage && (
        <div className="px-5 py-4 border-b border-red-500/20 bg-red-500/5">
          <p className="text-xs font-medium text-red-400 mb-1">Flow Error Message</p>
          <p className="text-xs text-red-300 leading-relaxed">{flowRun.errorMessage}</p>
        </div>
      )}

      {/* Errors list */}
      <div className="px-5 py-4">
        {!hasErrors ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle size={14} />
            <span>No errors — flow ran successfully.</span>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-3">
              {flowRun.errors.length} Error{flowRun.errors.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-3">
              {flowRun.errors.map((err, i) => (
                <div
                  key={err.id ?? i}
                  className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <ChevronRight size={12} className="text-red-400 mt-0.5 shrink-0" />
                    <span className="text-xs font-semibold text-red-400">
                      {err.errorType || 'Error'}
                    </span>
                  </div>
                  {err.elementLabel && (
                    <p className="text-xs text-slate-400 mb-1 ml-4">
                      Element: <span className="text-slate-300">{err.elementLabel}</span>
                      {err.elementApiName && (
                        <span className="text-slate-500 ml-1">({err.elementApiName})</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-red-300 leading-relaxed ml-4">{err.errorMessage}</p>
                  {err.stackTrace && (
                    <details className="mt-2 ml-4">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">
                        Stack trace
                      </summary>
                      <pre className="mt-1 text-xs text-slate-400 bg-slate-900/50 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                        {err.stackTrace}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
