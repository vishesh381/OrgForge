import { useState, useEffect, useMemo } from 'react'
import apiClient from '../../../core/services/apiClient.js'
import { useOrgStore } from '../../../core/store/appStore.js'
import CoverageBar from '../components/CoverageBar.jsx'

export default function CoverageDashboard() {
  const { activeOrgId } = useOrgStore()
  const [runs, setRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [coverage, setCoverage] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')

  useEffect(() => {
    if (activeOrgId) loadRuns()
  }, [activeOrgId])

  useEffect(() => {
    if (selectedRunId && activeOrgId) {
      loadCoverage(selectedRunId)
    }
  }, [selectedRunId, activeOrgId])

  const loadRuns = async () => {
    try {
      setLoading(true)
      const { data } = await apiClient.get(`/apex-pulse/runs?orgId=${activeOrgId}&page=0&size=10`)
      setRuns(data.runs || [])
      if (data.runs?.length > 0) {
        setSelectedRunId(data.runs[0].id)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load runs')
    } finally {
      setLoading(false)
    }
  }

  const loadCoverage = async (runId) => {
    try {
      const { data } = await apiClient.get(`/apex-pulse/runs/${runId}?orgId=${activeOrgId}`)
      setCoverage(data.coverage || [])
    } catch {
      setCoverage([])
    }
  }

  const filteredCoverage = useMemo(() => {
    let result = coverage.filter(c =>
      c.classOrTriggerName.toLowerCase().includes(search.toLowerCase())
    )
    if (sortBy === 'name') {
      result.sort((a, b) => a.classOrTriggerName.localeCompare(b.classOrTriggerName))
    } else if (sortBy === 'coverage-asc') {
      result.sort((a, b) => a.coveragePercent - b.coveragePercent)
    } else if (sortBy === 'coverage-desc') {
      result.sort((a, b) => b.coveragePercent - a.coveragePercent)
    }
    return result
  }, [coverage, search, sortBy])

  const avgCoverage = coverage.length > 0
    ? (coverage.reduce((sum, c) => sum + c.coveragePercent, 0) / coverage.length).toFixed(1)
    : 0

  const avgCoverageColor =
    avgCoverage >= 75 ? 'text-green-400' : avgCoverage >= 50 ? 'text-yellow-400' : 'text-red-400'

  if (!activeOrgId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Code Coverage</h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <p className="text-slate-400">Select an org to view coverage data.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Code Coverage</h2>
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
        <h2 className="text-2xl font-bold text-white mb-6">Code Coverage</h2>
        <div className="p-4 bg-red-400/10 border border-red-400/30 rounded-xl flex items-center justify-between">
          <span className="text-sm text-red-400">{error}</span>
          <button
            onClick={loadRuns}
            className="text-sm text-red-400 underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Code Coverage</h2>

      {/* Org coverage summary */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-400">Overall Coverage</h3>
            <p className={`text-4xl font-bold mt-1 ${avgCoverageColor}`}>
              {avgCoverage}%
            </p>
            <p className="text-sm text-slate-500 mt-1">{coverage.length} classes covered</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Test Run:</label>
            <select
              value={selectedRunId || ''}
              onChange={(e) => setSelectedRunId(Number(e.target.value))}
              className="bg-slate-900 border border-slate-600 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
            >
              {runs.map(run => (
                <option key={run.id} value={run.id}>
                  Run #{run.id} — {new Date(run.startedAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search and sort */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search classes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-md text-sm focus:outline-none focus:border-indigo-500"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-900 border border-slate-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="name">Sort by Name</option>
          <option value="coverage-asc">Coverage (Low to High)</option>
          <option value="coverage-desc">Coverage (High to Low)</option>
        </select>
      </div>

      {/* Coverage table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-700/50">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Class / Trigger</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase w-20">Covered</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase w-20">Uncovered</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase w-48">Coverage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredCoverage.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30">
                <td className="px-6 py-4 text-sm text-white font-medium">{item.classOrTriggerName}</td>
                <td className="px-6 py-4 text-sm text-green-400">{item.linesCovered}</td>
                <td className="px-6 py-4 text-sm text-red-400">{item.linesUncovered}</td>
                <td className="px-6 py-4">
                  <CoverageBar percent={item.coveragePercent} />
                </td>
              </tr>
            ))}
            {filteredCoverage.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                  {coverage.length === 0 ? 'No coverage data available. Run tests first.' : 'No matching classes.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
