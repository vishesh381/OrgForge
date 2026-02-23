import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        border: '1px solid #475569',
        borderRadius: '8px',
        padding: '10px 14px',
      }}
    >
      <p style={{ color: '#e2e8f0', fontSize: 12, marginBottom: 6 }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color, fontSize: 12, margin: '2px 0' }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function FlowTrendChart({ analytics }) {
  if (!analytics || analytics.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-10 text-center">
        <p className="text-slate-400 text-sm font-medium">No analytics data available.</p>
        <p className="text-slate-500 text-xs mt-1">
          Flow runs will appear here once data is collected.
        </p>
      </div>
    )
  }

  const formatted = analytics.map((d) => ({
    ...d,
    date: formatDate(d.date),
  }))

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h3 className="text-sm font-semibold text-slate-200 mb-5">Flow Run Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="date"
            fontSize={11}
            tick={{ fill: '#94a3b8' }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            fontSize={11}
            tick={{ fill: '#94a3b8' }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 12 }}
          />
          <Bar dataKey="success" name="Success" fill="#4ade80" radius={[3, 3, 0, 0]} maxBarSize={32} />
          <Bar dataKey="error" name="Error / Fault" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
