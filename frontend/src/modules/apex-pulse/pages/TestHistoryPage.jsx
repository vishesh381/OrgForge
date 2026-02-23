import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../../core/services/apiClient.js'
import { useOrgStore } from '../../../core/store/appStore.js'

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export default function TestHistoryPage() {
  const { activeOrgId } = useOrgStore()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    if (activeOrgId) loadRuns()
  }, [page, activeOrgId])

  const loadRuns = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await apiClient.get(`/apex-pulse/history/runs?page=${page}&size=15`)
      setRuns(data.runs || [])
      setTotalPages(data.totalPages || 0)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load test results')
    } finally {
      setLoading(false)
    }
  }

  const statusBadgeClass = (status) => {
    if (status === 'COMPLETED') return 'bg-green-400/15 text-green-400'
    if (status === 'FAILED') return 'bg-red-400/15 text-red-400'
    if (status === 'PROCESSING') return 'bg-blue-400/15 text-blue-400'
    return 'bg-slate-400/15 text-slate-400'
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Test History</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-400/10 border border-red-400/30 rounded-xl flex items-center justify-between">
          <span className="text-sm text-red-400">{error}</span>
          <button
            onClick={loadRuns}
            className="text-sm text-red-400 underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {!activeOrgId ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <p className="text-slate-400">Select an org to view test history.</p>
        </div>
      ) : loading ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-slate-700 rounded"></div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-12 bg-slate-700/50 rounded"></div>
            ))}
          </div>
        </div>
      ) : runs.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <p className="text-slate-400 mb-2">No test runs found.</p>
          <p className="text-sm text-slate-500">
            Go to{' '}
            <Link to="/apex-pulse" className="text-indigo-400 hover:underline">
              Run Tests
            </Link>{' '}
            to execute your first test run.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Run</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Tests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Pass Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Started</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {runs.map(run => {
                  const passRate = run.totalTests > 0
                    ? ((run.passCount / run.totalTests) * 100).toFixed(0)
                    : 0
                  const duration = run.startedAt && run.completedAt
                    ? formatDuration(new Date(run.completedAt) - new Date(run.startedAt))
                    : '--'

                  return (
                    <tr key={run.id} className="hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <Link
                          to={`/apex-pulse/history/${run.id}`}
                          className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          #{run.id}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(run.status)}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        <span className="text-green-400">{run.passCount}</span>
                        {' / '}
                        <span className="text-red-400">{run.failCount}</span>
                        {' / '}
                        <span className="text-slate-400">{run.totalTests}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${
                          passRate >= 80 ? 'text-green-400' : passRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {passRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {run.startedAt ? new Date(run.startedAt).toLocaleString() : '--'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{duration}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm border border-slate-600 text-slate-400 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 hover:text-white transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-sm border border-slate-600 text-slate-400 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 hover:text-white transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
