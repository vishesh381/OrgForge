import { useState } from 'react'
import { CheckCircle, Clock, Code2, Workflow } from 'lucide-react'

const TYPE_ICONS = {
  ApexClass: Code2,
  Flow: Workflow,
}

const TYPE_COLORS = {
  ApexClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Flow: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * DeadCodeTable
 *
 * Props:
 *   items          {Array}    — dead code items from API
 *   onMarkReviewed {Function} — called with (itemId) when user marks an item reviewed
 */
export default function DeadCodeTable({ items = [], onMarkReviewed }) {
  const [pending, setPending] = useState(new Set())

  const sorted = [...items].sort((a, b) => {
    const da = a.detectedAt ? new Date(a.detectedAt) : 0
    const db = b.detectedAt ? new Date(b.detectedAt) : 0
    return db - da
  })

  async function handleReview(id) {
    setPending((p) => new Set(p).add(id))
    try {
      await onMarkReviewed(id)
    } finally {
      setPending((p) => {
        const next = new Set(p)
        next.delete(id)
        return next
      })
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="w-12 h-12 text-green-400 mb-3 opacity-80" />
        <p className="text-white font-medium">No dead code detected</p>
        <p className="text-slate-500 text-sm mt-1">
          All Apex classes have recent activity or test coverage, and no inactive flows were found.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700/50">
        <thead className="bg-slate-800/60">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              API Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Last Modified
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {sorted.map((item) => {
            const Icon = TYPE_ICONS[item.componentType] ?? Code2
            const typeColor = TYPE_COLORS[item.componentType] ?? 'bg-slate-700/40 text-slate-300 border-slate-600'
            const isPending = pending.has(item.id)

            return (
              <tr
                key={item.id}
                className={`transition-colors ${
                  item.isReviewed ? 'opacity-50 hover:opacity-70' : 'hover:bg-slate-700/30'
                }`}
              >
                {/* Type badge */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${typeColor}`}
                  >
                    <Icon className="w-3 h-3" />
                    {item.componentType ?? '—'}
                  </span>
                </td>

                {/* Name */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm font-medium text-white">
                    {item.componentName ?? '—'}
                  </span>
                  {item.namespace && (
                    <span className="ml-1.5 text-xs text-slate-500">({item.namespace})</span>
                  )}
                </td>

                {/* API Name */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-slate-300 font-mono">{item.apiName ?? '—'}</span>
                </td>

                {/* Last Modified */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-sm text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(item.lastModified)}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {item.isReviewed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25">
                      <CheckCircle className="w-3 h-3" />
                      Reviewed
                      {item.reviewedBy && (
                        <span className="text-green-500/70 ml-0.5">by {item.reviewedBy}</span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">
                      Needs Review
                    </span>
                  )}
                </td>

                {/* Action */}
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  {!item.isReviewed && (
                    <button
                      onClick={() => handleReview(item.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                    >
                      {isPending ? 'Saving…' : 'Mark Reviewed'}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
