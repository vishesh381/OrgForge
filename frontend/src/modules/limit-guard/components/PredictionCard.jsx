import { AlertTriangle, Clock, CheckCircle } from 'lucide-react'

/**
 * PredictionCard — shows forecasted exhaustion date for a limit.
 * Props: { forecastedExhaustionAt: string|null, limitName: string, percentage: number }
 */
export default function PredictionCard({ forecastedExhaustionAt, limitName, percentage }) {
  const safePercent = Number(percentage) || 0

  const isCritical = safePercent >= 90
  const isWarning  = safePercent >= 70
  const isHealthy  = safePercent < 70

  const Icon = isCritical ? AlertTriangle : isWarning ? Clock : CheckCircle

  const iconColor = isCritical ? 'text-red-400'    : isWarning ? 'text-yellow-400' : 'text-green-400'
  const bgColor   = isCritical ? 'bg-red-500/10'   : isWarning ? 'bg-yellow-500/10' : 'bg-green-500/10'
  const border    = isCritical ? 'border-red-500/30' : isWarning ? 'border-yellow-500/30' : 'border-green-500/30'
  const barColor  = isCritical ? 'bg-red-500'       : isWarning ? 'bg-yellow-500' : 'bg-green-500'

  const formattedDate = forecastedExhaustionAt
    ? new Date(forecastedExhaustionAt).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  const timeUntilExhaustion = forecastedExhaustionAt
    ? getRelativeTime(new Date(forecastedExhaustionAt))
    : null

  return (
    <div className={`rounded-xl border p-5 ${bgColor} ${border}`}>
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${iconColor}`}>
            {isCritical ? 'Critical Usage Alert' : isWarning ? 'Usage Warning' : 'Usage Stable'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 truncate" title={limitName}>
            {formatLimitName(limitName)}
          </p>

          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500">Current Usage</span>
              <span className={`text-xs font-bold ${iconColor}`}>{safePercent.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${Math.min(safePercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-700/50">
            {formattedDate ? (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">
                  Estimated Exhaustion
                </p>
                <p className={`text-sm font-semibold ${iconColor}`}>{formattedDate}</p>
                {timeUntilExhaustion && (
                  <p className="text-xs text-slate-500 mt-0.5">{timeUntilExhaustion}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-xs text-slate-400">
                  {isHealthy
                    ? 'No exhaustion forecast — usage is stable'
                    : 'Insufficient history for forecast — monitoring in progress'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatLimitName(name) {
  return name?.replace(/([A-Z])/g, ' $1').replace(/^[\s_]+/, '').trim() ?? name
}

function getRelativeTime(date) {
  const diffMs = date - new Date()
  if (diffMs <= 0) return 'Limit may already be exhausted'

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1)  return 'Less than an hour away'
  if (diffHours < 24) return `In about ${diffHours} hour${diffHours !== 1 ? 's' : ''}`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7)   return `In about ${diffDays} day${diffDays !== 1 ? 's' : ''}`

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4)  return `In about ${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}`

  const diffMonths = Math.floor(diffDays / 30)
  return `In about ${diffMonths} month${diffMonths !== 1 ? 's' : ''}`
}
