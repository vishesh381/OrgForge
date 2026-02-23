import { Activity, XCircle, AlertTriangle, GitBranch } from 'lucide-react'

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value ?? '--'}</p>
      </div>
    </div>
  )
}

export default function FlowStatsBar({ stats }) {
  const faultRate = stats?.faultRate != null ? `${stats.faultRate}%` : '--'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        icon={Activity}
        label="Total Flows"
        value={stats?.totalFlows ?? '--'}
        color="bg-indigo-500/15 text-indigo-400"
      />
      <MetricCard
        icon={XCircle}
        label="Error Count"
        value={stats?.errorCount ?? '--'}
        color="bg-red-500/15 text-red-400"
      />
      <MetricCard
        icon={AlertTriangle}
        label="Fault Rate"
        value={faultRate}
        color="bg-yellow-500/15 text-yellow-400"
      />
      <MetricCard
        icon={GitBranch}
        label="Overlaps Detected"
        value={stats?.overlapsDetected ?? '--'}
        color="bg-orange-500/15 text-orange-400"
      />
    </div>
  )
}
