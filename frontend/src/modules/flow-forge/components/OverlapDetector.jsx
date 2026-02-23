import { GitBranch, RefreshCw, AlertTriangle } from 'lucide-react'

function riskBadgeClass(risk) {
  const r = (risk || '').toUpperCase()
  if (r === 'HIGH') return 'bg-red-400/15 text-red-400 border-red-400/20'
  if (r === 'MEDIUM') return 'bg-yellow-400/15 text-yellow-400 border-yellow-400/20'
  return 'bg-green-400/15 text-green-400 border-green-400/20'
}

function riskBorderClass(risk) {
  const r = (risk || '').toUpperCase()
  if (r === 'HIGH') return 'border-red-500/30'
  if (r === 'MEDIUM') return 'border-yellow-500/30'
  return 'border-green-500/30'
}

export default function OverlapDetector({ overlaps, onDetect, detecting }) {
  return (
    <div>
      {/* Header with detect button */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-white">Flow Overlap Detection</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Identifies flows that trigger on the same object and event, which may cause conflicts.
          </p>
        </div>
        <button
          onClick={onDetect}
          disabled={detecting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw size={14} className={detecting ? 'animate-spin' : ''} />
          {detecting ? 'Detecting...' : 'Run Detection'}
        </button>
      </div>

      {/* Empty state */}
      {!overlaps || overlaps.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <GitBranch size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No overlaps detected</p>
          <p className="text-slate-500 text-xs mt-1">
            Run detection to check for conflicting flows.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {overlaps.map((overlap) => (
            <div
              key={overlap.id}
              className={`bg-slate-800 rounded-xl border ${riskBorderClass(overlap.riskLevel)} p-5`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    size={15}
                    className={
                      (overlap.riskLevel || '').toUpperCase() === 'HIGH'
                        ? 'text-red-400'
                        : (overlap.riskLevel || '').toUpperCase() === 'MEDIUM'
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }
                  />
                  <span className="text-sm font-semibold text-white">{overlap.objectName}</span>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${riskBadgeClass(overlap.riskLevel)}`}
                >
                  {overlap.riskLevel || 'UNKNOWN'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex gap-2">
                  <span className="text-slate-500 w-24 shrink-0">Trigger Event</span>
                  <span className="text-slate-300">{overlap.triggerEvent || '--'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 w-24 shrink-0">Flows</span>
                  <span className="text-slate-300 leading-relaxed">{overlap.flowNames}</span>
                </div>
                {overlap.detectedAt && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-24 shrink-0">Detected</span>
                    <span className="text-slate-500">
                      {new Date(overlap.detectedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
