function statusBadgeClass(status) {
  const s = (status || '').toLowerCase()
  if (s === 'finished' || s === 'success' || s === 'completed') return 'bg-green-400/15 text-green-400'
  if (s === 'error' || s === 'fault' || s === 'failed') return 'bg-red-400/15 text-red-400'
  if (s === 'running' || s === 'started') return 'bg-blue-400/15 text-blue-400'
  return 'bg-slate-400/15 text-slate-400'
}

function formatDuration(ms) {
  if (ms == null) return '--'
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

function formatDate(dt) {
  if (!dt) return '--'
  return new Date(dt).toLocaleString()
}

export default function FlowRunsTable({ runs, onSelect }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
        <p className="text-slate-400">No flow runs found.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <table className="min-w-full divide-y divide-slate-700/50">
        <thead className="bg-slate-800/50">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
              Flow Name
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
              Type
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
              Status
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
              Duration
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
              Triggered By
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {runs.map((run) => (
            <tr
              key={run.id}
              onClick={() => onSelect && onSelect(run)}
              className="hover:bg-slate-700/30 cursor-pointer transition-colors"
            >
              <td className="px-5 py-4">
                <span className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                  {run.flowName || `#${run.id}`}
                </span>
              </td>
              <td className="px-5 py-4 text-sm text-slate-400">{run.flowType || '--'}</td>
              <td className="px-5 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(run.status)}`}>
                  {run.status || 'Unknown'}
                </span>
              </td>
              <td className="px-5 py-4 text-sm text-slate-400">{formatDuration(run.durationMs)}</td>
              <td className="px-5 py-4 text-sm text-slate-400">{run.triggeredBy || '--'}</td>
              <td className="px-5 py-4 text-sm text-slate-500">{formatDate(run.startedAt || run.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
