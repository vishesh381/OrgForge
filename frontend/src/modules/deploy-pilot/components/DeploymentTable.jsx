import { Eye } from 'lucide-react'

const STATUS_STYLES = {
  PENDING:     'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  IN_PROGRESS: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
  SUCCEEDED:   'bg-green-500/15 text-green-400 border border-green-500/30',
  FAILED:      'bg-red-500/15 text-red-400 border border-red-500/30',
  ROLLED_BACK: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  VALIDATING:  'bg-purple-500/15 text-purple-400 border border-purple-500/30',
}

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status?.toUpperCase()] ?? STATUS_STYLES.PENDING
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status ?? 'PENDING'}
    </span>
  )
}

function formatDate(dt) {
  if (!dt) return '—'
  try {
    return new Date(dt).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dt
  }
}

export default function DeploymentTable({ deployments = [], onSelect }) {
  if (deployments.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center">
        <p className="text-slate-400 text-sm">No deployments found for this org.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700/60">
          <thead className="bg-slate-800/60">
            <tr>
              {['Label', 'Type', 'Components', 'Status', 'Deployed By', 'Started At', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {deployments.map((d) => (
              <tr
                key={d.id}
                onClick={() => onSelect?.(d)}
                className="hover:bg-slate-700/30 cursor-pointer transition-colors group"
              >
                <td className="px-5 py-3.5">
                  <span className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                    {d.label || <span className="text-slate-500 italic">Untitled</span>}
                  </span>
                  {d.validationOnly && (
                    <span className="ml-2 text-xs text-purple-400 font-medium">Validation</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-slate-300">{d.deployType || '—'}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-slate-300 tabular-nums">{d.componentCount}</span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={d.status} />
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-slate-400">{d.deployedBy || '—'}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-slate-400">{formatDate(d.startedAt)}</span>
                </td>
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onSelect?.(d)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
