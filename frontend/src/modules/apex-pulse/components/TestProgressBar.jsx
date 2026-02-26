export default function TestProgressBar({ progress }) {
  if (!progress) return null

  const { status, totalTests, completedTests, passCount, failCount, percentComplete } = progress
  const isComplete   = status === 'Completed'
  const isFinalizing = status === 'Finalizing'

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white">
          {isComplete ? 'Test Run Complete' : isFinalizing ? 'Saving results...' : 'Running Tests...'}
        </h3>
        <span className="text-sm text-slate-400">
          {completedTests} / {totalTests} tests
        </span>
      </div>

      <div className="w-full bg-slate-700 rounded-full h-4 mb-3 overflow-hidden">
        {totalTests > 0 && (
          <div className="h-full flex transition-all duration-500" style={{ width: `${percentComplete}%` }}>
            {passCount > 0 && (
              <div
                className="bg-green-400 h-full"
                style={{ width: `${(passCount / totalTests) * 100}%` }}
              />
            )}
            {failCount > 0 && (
              <div
                className="bg-red-400 h-full"
                style={{ width: `${(failCount / totalTests) * 100}%` }}
              />
            )}
            {completedTests - passCount - failCount > 0 && (
              <div
                className="bg-indigo-500 h-full"
                style={{ width: `${((completedTests - passCount - failCount) / totalTests) * 100}%` }}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>
          <span className="text-slate-300">Passed: {passCount}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>
          <span className="text-slate-300">Failed: {failCount}</span>
        </span>
        <span className="text-slate-500 ml-auto">
          {percentComplete.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}
