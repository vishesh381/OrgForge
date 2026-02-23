import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

/**
 * UsageTrendChart — displays historical usage percentage over time.
 * Props: { data: LimitSnapshot[], limitName: string }
 */
export default function UsageTrendChart({ data = [], limitName }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-800/50 rounded-xl border border-slate-700">
        <p className="text-sm text-slate-500">No historical data available yet.</p>
      </div>
    )
  }

  // Normalise and sort data oldest → newest
  const chartData = [...data]
    .sort((a, b) => new Date(a.snapshotAt) - new Date(b.snapshotAt))
    .map((s) => ({
      time: formatTime(s.snapshotAt),
      percentage: Number(s.percentage ?? 0),
      used: s.used,
      total: s.total,
    }))

  const maxPct = Math.max(...chartData.map((d) => d.percentage), 0)
  const lineColor =
    maxPct >= 90 ? '#ef4444' :
    maxPct >= 70 ? '#eab308' :
                   '#22c55e'

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
        <p className="text-slate-400 mb-1">{label}</p>
        <p className="text-white font-semibold">{d.percentage.toFixed(1)}% used</p>
        <p className="text-slate-400">{fmt(d.used)} / {fmt(d.total)}</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <h4 className="text-sm font-medium text-white mb-4">
        Usage Trend — {formatLimitName(limitName)}
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={70}  stroke="#eab308" strokeDasharray="4 2" strokeOpacity={0.5} />
          <ReferenceLine y={90}  stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.5} />
          <Line
            type="monotone"
            dataKey="percentage"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: lineColor, stroke: '#1e293b', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-yellow-500 rounded" /> 70% warn
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-red-500 rounded" /> 90% critical
        </span>
      </div>
    </div>
  )
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatLimitName(name) {
  return name?.replace(/([A-Z])/g, ' $1').replace(/^[\s_]+/, '').trim() ?? name
}

function fmt(n) {
  if (n === undefined || n === null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
