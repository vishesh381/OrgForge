import { useState } from 'react'
import { ShieldAlert, ShieldCheck, Clock, CheckCheck } from 'lucide-react'

function RiskBadge({ level }) {
  const styles = {
    HIGH:   'bg-red-500/15 text-red-400 border border-red-500/30',
    MEDIUM: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    LOW:    'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  }
  const icons = {
    HIGH:   <ShieldAlert className="w-3 h-3" />,
    MEDIUM: <ShieldAlert className="w-3 h-3" />,
    LOW:    <ShieldCheck className="w-3 h-3" />,
  }
  const style = styles[level] || 'bg-slate-700 text-slate-400 border border-slate-600'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {icons[level]}
      {level}
    </span>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return dateStr
  }
}

export default function ViolationsTable({ violations = [], onAcknowledge }) {
  const [acknowledging, setAcknowledging] = useState(null)

  const handleAcknowledge = async (id) => {
    setAcknowledging(id)
    try {
      await onAcknowledge(id)
    } finally {
      setAcknowledging(null)
    }
  }

  if (violations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <ShieldCheck className="w-12 h-12 mb-3 text-green-500/40" />
        <p className="text-sm font-medium text-slate-400">No violations detected</p>
        <p className="text-xs mt-1">Run "Detect Violations" to scan your org for permission risks.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wide border-b border-slate-700">
            <th className="text-left px-4 py-3 font-medium">Username</th>
            <th className="text-left px-4 py-3 font-medium">Permission Type</th>
            <th className="text-left px-4 py-3 font-medium">Permission Name</th>
            <th className="text-left px-4 py-3 font-medium">Risk Level</th>
            <th className="text-left px-4 py-3 font-medium">Detected At</th>
            <th className="text-left px-4 py-3 font-medium">Notes</th>
            <th className="text-center px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {violations.map((v) => (
            <tr
              key={v.id}
              className={`transition-colors ${
                v.acknowledged || v.isAcknowledged
                  ? 'bg-slate-900/40 opacity-50'
                  : 'bg-slate-900 hover:bg-slate-800/50'
              }`}
            >
              <td className="px-4 py-3">
                <span
                  className={`font-mono text-xs ${
                    v.acknowledged || v.isAcknowledged
                      ? 'line-through text-slate-500'
                      : 'text-slate-200'
                  }`}
                >
                  {v.username || v.sfUserId || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs">
                <span
                  className={v.acknowledged || v.isAcknowledged ? 'line-through' : ''}
                >
                  {v.permissionType || '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`font-medium text-xs ${
                    v.acknowledged || v.isAcknowledged
                      ? 'line-through text-slate-500'
                      : 'text-slate-200'
                  }`}
                >
                  {v.permissionName || '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <RiskBadge level={v.riskLevel} />
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  {formatDate(v.detectedAt)}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs max-w-xs">
                <span className="line-clamp-2" title={v.notes}>
                  {v.notes || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {v.acknowledged || v.isAcknowledged ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-400/60">
                    <CheckCheck className="w-3.5 h-3.5" />
                    Done
                  </span>
                ) : (
                  <button
                    onClick={() => handleAcknowledge(v.id)}
                    disabled={acknowledging === v.id}
                    className="px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs text-slate-300 transition-colors"
                  >
                    {acknowledging === v.id ? 'Saving…' : 'Acknowledge'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
