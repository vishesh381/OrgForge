import { useEffect, useRef } from 'react'
import { CheckCircle, XCircle, AlertCircle, Clock, Loader } from 'lucide-react'

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/30',
    bar: 'bg-slate-500',
  },
  PROCESSING: {
    label: 'Processing',
    icon: Loader,
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    border: 'border-indigo-400/30',
    bar: 'bg-indigo-500',
    animate: true,
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/30',
    bar: 'bg-green-500',
  },
  COMPLETED_WITH_ERRORS: {
    label: 'Completed with Errors',
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
    bar: 'bg-amber-500',
  },
  FAILED: {
    label: 'Failed',
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
    bar: 'bg-red-500',
  },
}

/**
 * Shows progress and summary for an import job.
 * Props:
 *   job: ImportJob object
 *   onRefresh: () => void  (called to re-fetch job if still processing)
 */
export default function ImportProgress({ job, onRefresh }) {
  const intervalRef = useRef(null)

  useEffect(() => {
    const isActive = job?.status === 'PENDING' || job?.status === 'PROCESSING'
    if (isActive && onRefresh) {
      intervalRef.current = setInterval(onRefresh, 3000)
    }
    return () => clearInterval(intervalRef.current)
  }, [job?.status, onRefresh])

  if (!job) return null

  const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.PENDING
  const Icon = config.icon
  const total = job.totalRecords || 0
  const processed = job.processedRecords || 0
  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon
            className={`w-5 h-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
          />
          <div>
            <p className="text-sm font-semibold text-white">
              {job.objectName}
            </p>
            <p className="text-xs text-slate-500">{job.fileName}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg} border ${config.border}`}
        >
          {config.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>{processed.toLocaleString()} / {total.toLocaleString()} records</span>
          <span>{percent}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${config.bar}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-400 mb-0.5">Succeeded</p>
          <p className="text-2xl font-bold text-green-400">{job.successCount?.toLocaleString() ?? 0}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-400 mb-0.5">Failed</p>
          <p className="text-2xl font-bold text-red-400">{job.errorCount?.toLocaleString() ?? 0}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Operation</span>
          <span className="text-slate-300 font-medium">{job.operation}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Created by</span>
          <span className="text-slate-300 font-medium">{job.createdBy || '—'}</span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-slate-500">Started</span>
          <span className="text-slate-300">{formatDate(job.createdAt)}</span>
        </div>
        {job.completedAt && (
          <div className="flex justify-between col-span-2">
            <span className="text-slate-500">Completed</span>
            <span className="text-slate-300">{formatDate(job.completedAt)}</span>
          </div>
        )}
      </div>

      {/* Errors table */}
      {job.errors?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-red-400 mb-2">
            Import Errors ({job.errors.length})
          </p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-red-500/20">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-800 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">Row</th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {job.errors.map((e) => (
                  <tr key={e.id ?? e.rowNumber} className="bg-red-500/5">
                    <td className="px-3 py-2 text-slate-400 font-mono">{e.rowNumber}</td>
                    <td className="px-3 py-2 text-red-400">{e.errorMessage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
