import { CheckCircle, AlertCircle, XCircle, Clock, Loader } from 'lucide-react'

const StatusBadge = ({ status }) => {
  const configs = {
    PENDING: { label: 'Pending', icon: Clock, color: 'text-slate-400 bg-slate-400/10 border-slate-400/30' },
    PROCESSING: { label: 'Processing', icon: Loader, color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30', animate: true },
    COMPLETED: { label: 'Completed', icon: CheckCircle, color: 'text-green-400 bg-green-400/10 border-green-400/30' },
    COMPLETED_WITH_ERRORS: { label: 'With Errors', icon: AlertCircle, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
    FAILED: { label: 'Failed', icon: XCircle, color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  }
  const config = configs[status] || configs.PENDING
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      <Icon className={`w-3 h-3 ${config.animate ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  )
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

/**
 * Table of past import jobs.
 * Props:
 *   jobs: ImportJob[]
 *   onSelect: (job) => void
 */
export default function ImportHistory({ jobs, onSelect }) {
  if (!jobs?.length) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
        <p className="text-slate-500 text-sm">No import jobs yet.</p>
        <p className="text-slate-600 text-xs mt-1">Start an import above to see history here.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white">Import History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700/50">
          <thead className="bg-slate-800/50">
            <tr>
              {['Object', 'File', 'Operation', 'Total', 'Success', 'Errors', 'Status', 'Date'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {jobs.map((job) => (
              <tr
                key={job.id}
                onClick={() => onSelect?.(job)}
                className="hover:bg-slate-700/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-sm text-white font-medium whitespace-nowrap">
                  {job.objectName}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 max-w-[160px] truncate" title={job.fileName}>
                  {job.fileName}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs font-mono">
                    {job.operation}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-300 text-right">
                  {job.totalRecords?.toLocaleString() ?? 0}
                </td>
                <td className="px-4 py-3 text-sm text-green-400 font-medium text-right">
                  {job.successCount?.toLocaleString() ?? 0}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className={job.errorCount > 0 ? 'text-red-400 font-medium' : 'text-slate-500'}>
                    {job.errorCount?.toLocaleString() ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {formatDate(job.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
