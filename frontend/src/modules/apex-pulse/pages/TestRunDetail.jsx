import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../../../core/services/apiClient.js'
import { useOrgStore } from '../../../core/store/appStore.js'
import TestResultBadge from '../components/TestResultBadge.jsx'

export default function TestRunDetail() {
  const { runId } = useParams()
  const { activeOrgId } = useOrgStore()
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    if (activeOrgId) loadRunDetail()
  }, [runId, activeOrgId])

  const loadRunDetail = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await apiClient.get(`/apex-pulse/history/runs/${runId}?orgId=${activeOrgId}`)
      setRun(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load test run details')
    } finally {
      setLoading(false)
    }
  }

  const filteredResults = run?.results?.filter(r => {
    if (filter === 'All') return true
    return r.outcome === filter
  }) || []

  const statusBadgeClass = (status) => {
    if (status === 'COMPLETED') return 'bg-green-400/15 text-green-400'
    if (status === 'FAILED') return 'bg-red-400/15 text-red-400'
    return 'bg-slate-400/15 text-slate-400'
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Test Run Details</h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-slate-700 rounded"></div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-12 bg-slate-700/50 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Test Run Details</h2>
        <div className="p-4 bg-red-400/10 border border-red-400/30 rounded-xl flex items-center justify-between">
          <span className="text-sm text-red-400">{error}</span>
          <button
            onClick={loadRunDetail}
            className="text-sm text-red-400 underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!run) return null

  const passRate = run.totalTests > 0 ? ((run.passCount / run.totalTests) * 100).toFixed(1) : 0

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/apex-pulse/history" className="text-indigo-400 hover:text-indigo-300 text-sm">
          &larr; Back to History
        </Link>
        <h2 className="text-2xl font-bold text-white">Run #{run.id}</h2>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(run.status)}`}>
          {run.status}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-sm text-slate-400">Total Tests</p>
          <p className="text-2xl font-semibold text-white mt-1">{run.totalTests}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-sm text-slate-400">Passed</p>
          <p className="text-2xl font-semibold text-green-400 mt-1">{run.passCount}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-sm text-slate-400">Failed</p>
          <p className="text-2xl font-semibold text-red-400 mt-1">{run.failCount}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-sm text-slate-400">Pass Rate</p>
          <p className="text-2xl font-semibold text-indigo-400 mt-1">{passRate}%</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['All', 'PASS', 'FAIL', 'SKIP'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {f} {f !== 'All' && `(${run.results?.filter(r => r.outcome === f).length || 0})`}
          </button>
        ))}
      </div>

      {/* Results table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-700/50">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Class</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Outcome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Runtime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredResults.map((result, idx) => (
              <ResultRow key={idx} result={result} />
            ))}
            {filteredResults.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                  No results match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResultRow({ result }) {
  const [expanded, setExpanded] = useState(false)
  const hasError = result.message || result.stackTrace

  return (
    <>
      <tr
        className={`${hasError ? 'cursor-pointer' : ''} hover:bg-slate-800/30`}
        onClick={() => hasError && setExpanded(!expanded)}
      >
        <td className="px-6 py-4 text-sm text-white">{result.className}</td>
        <td className="px-6 py-4 text-sm text-slate-400 font-mono text-xs">{result.methodName}</td>
        <td className="px-6 py-4"><TestResultBadge outcome={result.outcome} /></td>
        <td className="px-6 py-4 text-sm text-slate-500">{result.runTimeMs}ms</td>
      </tr>
      {expanded && hasError && (
        <tr>
          <td colSpan={4} className="px-6 py-4 bg-red-400/5 border-l-4 border-red-400">
            {result.message && (
              <p className="text-sm text-red-400 mb-2">
                <strong>Message:</strong> {result.message}
              </p>
            )}
            {result.stackTrace && (
              <pre className="text-xs text-red-400/80 whitespace-pre-wrap font-mono bg-slate-900 p-3 rounded">
                {result.stackTrace}
              </pre>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
