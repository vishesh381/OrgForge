import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

/**
 * ScoreTrendChart
 * Recharts AreaChart showing overall health score over time.
 *
 * Props:
 *   history  {Array<{ scoredAt: string, overallScore: number }>}
 */
export default function ScoreTrendChart({ history = [] }) {
  const data = [...history]
    .sort((a, b) => new Date(a.scoredAt) - new Date(b.scoredAt))
    .map((h) => ({
      date: new Date(h.scoredAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      score: parseFloat(h.overallScore ?? 0),
    }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No historical data yet. Run a health analysis to start tracking.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#475569' }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#475569' }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: 12,
          }}
          formatter={(value) => [`${value}`, 'Overall Score']}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#scoreGradient)"
          dot={{ fill: '#6366f1', r: 3 }}
          activeDot={{ r: 5, fill: '#818cf8' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
