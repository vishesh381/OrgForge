/**
 * LimitGauge — SVG arc gauge showing percentage usage for a single Salesforce limit.
 * Props: { name, percentage, status, used, total, onClick }
 */
export default function LimitGauge({ name, percentage, status, used, total, onClick }) {
  const safePercent = Math.min(Math.max(Number(percentage) || 0, 0), 100)

  // SVG arc parameters
  const cx = 60
  const cy = 60
  const r = 48
  const strokeWidth = 8
  const startAngle = -210   // degrees — starts bottom-left
  const sweepAngle = 240    // total arc span

  const toRad = (deg) => (deg * Math.PI) / 180

  const arcStart = toRad(startAngle)
  const arcEnd = toRad(startAngle + sweepAngle)
  const fillEnd = toRad(startAngle + (sweepAngle * safePercent) / 100)

  const polarToXY = (angle) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  })

  const describePath = (endAngle) => {
    const start = polarToXY(arcStart)
    const end = polarToXY(endAngle)
    const largeArc = endAngle - arcStart > Math.PI ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
  }

  const trackPath = describePath(arcEnd)
  const fillPath = safePercent > 0 ? describePath(fillEnd) : null

  const strokeColor =
    status === 'CRITICAL' ? '#ef4444' :
    status === 'WARNING'  ? '#eab308' :
                            '#22c55e'

  const textColor =
    status === 'CRITICAL' ? 'text-red-400' :
    status === 'WARNING'  ? 'text-yellow-400' :
                            'text-green-400'

  const bgRing = '#1e293b' // slate-800

  // Format large numbers compactly
  const fmt = (n) => {
    if (n === undefined || n === null) return '—'
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
    return String(n)
  }

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition-all duration-200 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      title={`${name}: ${safePercent.toFixed(1)}% used`}
    >
      {/* SVG Gauge */}
      <div className="relative">
        <svg width="120" height="100" viewBox="0 0 120 100">
          {/* Track arc */}
          <path
            d={trackPath}
            fill="none"
            stroke={bgRing}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Fill arc */}
          {fillPath && (
            <path
              d={fillPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${strokeColor}40)` }}
            />
          )}
          {/* Center text — percentage */}
          <text
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="16"
            fontWeight="700"
            fill="white"
          >
            {safePercent.toFixed(0)}%
          </text>
        </svg>
      </div>

      {/* Usage numbers */}
      <p className={`text-xs font-medium mb-1 ${textColor}`}>
        {fmt(used)} / {fmt(total)}
      </p>

      {/* Limit name */}
      <p
        className="text-xs text-slate-400 text-center leading-tight line-clamp-2 group-hover:text-slate-300 transition-colors"
        title={name}
      >
        {formatLimitName(name)}
      </p>

      {/* Status badge */}
      <span
        className={`mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
          status === 'CRITICAL' ? 'bg-red-500/15 text-red-400' :
          status === 'WARNING'  ? 'bg-yellow-500/15 text-yellow-400' :
                                  'bg-green-500/15 text-green-400'
        }`}
      >
        {status}
      </span>
    </button>
  )
}

// Convert camelCase / PascalCase limit names to readable labels
function formatLimitName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^[\s_]+/, '')
    .trim()
}
