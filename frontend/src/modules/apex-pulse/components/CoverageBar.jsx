export default function CoverageBar({ percent }) {
  const barColor =
    percent >= 75 ? 'bg-green-400' : percent >= 50 ? 'bg-yellow-400' : 'bg-red-400'
  const textColor =
    percent >= 75 ? 'text-green-400' : percent >= 50 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-700 rounded-full h-2 min-w-16">
        <div
          className={`h-2 rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className={`text-sm font-medium ${textColor} w-12 text-right`}>
        {percent.toFixed(0)}%
      </span>
    </div>
  )
}
