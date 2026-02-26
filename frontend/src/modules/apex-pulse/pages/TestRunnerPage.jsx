import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../../core/services/apiClient.js'
import { useWebSocket } from '../../../core/hooks/useWebSocket.js'
import { useOrgStore } from '../../../core/store/appStore.js'
import TestClassSelector from '../components/TestClassSelector.jsx'
import TestProgressBar from '../components/TestProgressBar.jsx'
import TestResultBadge from '../components/TestResultBadge.jsx'

export default function TestRunnerPage() {
  const { activeOrgId } = useOrgStore()
  const [classes, setClasses] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(null)
  const [dbRunId, setDbRunId] = useState(null)
  const [results, setResults] = useState(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [wsActive, setWsActive] = useState(false)

  useEffect(() => {
    if (activeOrgId) loadClasses()
  }, [activeOrgId])

  const loadClasses = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await apiClient.get(`/apex-pulse/classes?orgId=${activeOrgId}`)
      setClasses(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load test classes')
    } finally {
      setLoading(false)
    }
  }

  const handleProgressUpdate = useCallback((data) => {
    setProgress(data)
    if (data.status === 'Completed') {
      // "Completed" is only broadcast by finalizeRun() after results are saved to DB
      setRunning(false)
      setWsActive(false)
      const runId = data.dbRunId
      if (runId) {
        setDbRunId(runId)
        fetchResults(runId)
      }
    }
    // "Finalizing" means queue is done but DB write is still in progress — keep WS open
  }, [activeOrgId])

  useWebSocket(wsActive ? '/topic/test-progress' : null, handleProgressUpdate)

  const fetchResults = async (runId) => {
    try {
      setResultsLoading(true)
      const { data } = await apiClient.get(`/apex-pulse/history/runs/${runId}?orgId=${activeOrgId}`)
      setResults(data)
    } catch (err) {
      console.error('Failed to fetch results:', err)
    } finally {
      setResultsLoading(false)
    }
  }

  const runTests = async () => {
    if (selectedIds.length === 0 || !activeOrgId) return

    try {
      setRunning(true)
      setProgress(null)
      setResults(null)
      setDbRunId(null)
      setError(null)
      setWsActive(true)

      const { data } = await apiClient.post(`/apex-pulse/run?orgId=${activeOrgId}`, { classIds: selectedIds })
      setDbRunId(data.dbRunId)
    } catch (err) {
      setRunning(false)
      setWsActive(false)
      setError(err.response?.data?.message || 'Failed to start test run')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Run Tests</h2>
        <div className="flex gap-3">
          {dbRunId && progress?.status === 'Completed' && (
            <Link
              to={`/apex-pulse/history/${dbRunId}`}
              className="px-4 py-2 text-sm font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              Full Details
            </Link>
          )}
          <button
            onClick={runTests}
            disabled={selectedIds.length === 0 || running || !activeOrgId}
            className={`px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
              selectedIds.length === 0 || running || !activeOrgId
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {running ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Running...
              </span>
            ) : (
              `Run ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''} Tests`
            )}
          </button>
        </div>
      </div>

      {!activeOrgId && (
        <div className="mb-4 p-4 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 text-sm">
          Select an org to load test classes.
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-400/10 border border-red-400/30 rounded-xl flex items-center justify-between">
          <span className="text-sm text-red-400">{error}</span>
          <button
            onClick={loadClasses}
            className="text-sm text-red-400 underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {(running || progress) && (
        <div className="mb-6">
          <TestProgressBar progress={progress || { status: 'Queued', totalTests: 0, completedTests: 0, passCount: 0, failCount: 0, percentComplete: 0 }} />
        </div>
      )}

      {results && (
        <div className="mb-6 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">
              Test Results — {results.results?.length || 0} methods
            </h3>
            <div className="flex gap-3 text-sm">
              <span className="text-green-400 font-medium">{results.passCount} passed</span>
              <span className="text-red-400 font-medium">{results.failCount} failed</span>
            </div>
          </div>
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Outcome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {results.results?.map((r, idx) => (
                <ResultRow key={idx} result={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resultsLoading && (
        <div className="mb-6 bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
          <p className="text-sm text-slate-400">Loading detailed results...</p>
        </div>
      )}

      <TestClassSelector
        classes={classes}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        loading={loading}
      />
    </div>
  )
}

function ResultRow({ result }) {
  const [expanded, setExpanded] = useState(false)
  const hasError = result.message || result.stackTrace
  const isFail = result.outcome === 'FAIL' || result.outcome === 'Fail'

  return (
    <>
      <tr
        className={`${hasError ? 'cursor-pointer' : ''} ${isFail ? 'bg-red-400/5' : ''} hover:bg-slate-800/30`}
        onClick={() => hasError && setExpanded(!expanded)}
      >
        <td className="px-6 py-3 text-sm text-white">{result.className}</td>
        <td className="px-6 py-3 text-sm text-slate-400 font-mono text-xs">{result.methodName}</td>
        <td className="px-6 py-3"><TestResultBadge outcome={result.outcome} /></td>
        <td className="px-6 py-3 text-sm text-slate-500">{result.runTimeMs}ms</td>
      </tr>
      {expanded && hasError && (
        <tr>
          <td colSpan={4} className="px-6 py-4 bg-red-400/5 border-l-4 border-red-400">
            {result.message && (
              <p className="text-sm text-red-400 mb-2">
                <span className="font-semibold">Error: </span>{result.message}
              </p>
            )}
            {result.stackTrace && (
              <pre className="text-xs text-red-400/80 whitespace-pre-wrap font-mono bg-slate-900 p-3 rounded mt-2 max-h-48 overflow-y-auto">
                {result.stackTrace}
              </pre>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
