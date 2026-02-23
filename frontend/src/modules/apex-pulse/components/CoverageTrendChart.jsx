import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function CoverageTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Coverage Trend</h3>
        <p className="text-slate-500 text-sm">No data available yet. Run some tests to see trends.</p>
      </div>
    )
  }

  const formatted = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h3 className="text-sm font-medium text-slate-400 mb-4">Coverage Trend</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" fontSize={12} tick={{ fill: '#94a3b8' }} axisLine={{ stroke: '#475569' }} />
          <YAxis
            domain={[0, 100]}
            fontSize={12}
            tickFormatter={v => `${v}%`}
            tick={{ fill: '#94a3b8' }}
            axisLine={{ stroke: '#475569' }}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, 'Coverage']}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
            labelStyle={{ color: '#e2e8f0' }}
            itemStyle={{ color: '#4ade80' }}
          />
          <Area
            type="monotone"
            dataKey="coverage"
            stroke="#4ade80"
            fill="#4ade8020"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
