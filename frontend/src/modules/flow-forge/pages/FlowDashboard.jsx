import { useState, useEffect, useCallback } from 'react'
import { useOrg } from '../../../core/hooks/useOrg.js'
import {
  getDashboardStats,
  getFlowRuns,
  detectOverlaps,
  getOverlaps,
  getFlowAnalytics,
  getFlowRunDetail,
  getFlows,
  invokeFlow,
} from '../services/flowForgeApi.js'
import FlowStatsBar from '../components/FlowStatsBar.jsx'
import FlowRunsTable from '../components/FlowRunsTable.jsx'
import FlowErrorPanel from '../components/FlowErrorPanel.jsx'
import OverlapDetector from '../components/OverlapDetector.jsx'
import FlowTrendChart from '../components/FlowTrendChart.jsx'
import RunFlowModal from '../components/RunFlowModal.jsx'

const TABS = ['Flows', 'Flow Runs', 'Overlap Detection', 'Analytics']
const STATUS_FILTERS = ['All', 'Error', 'Fault']

export default function FlowDashboard() {
  const { activeOrgId } = useOrg()

  const [activeTab, setActiveTab] = useState(0)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState(null)

  // Flows (live SF definitions)
  const [flows, setFlows] = useState([])
  const [flowsLoading, setFlowsLoading] = useState(false)
  const [flowsError, setFlowsError] = useState(null)

  // Flow runs state
  const [runs, setRuns] = useState([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [runsError, setRunsError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(0)
  const [selectedRun, setSelectedRun] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Overlaps state
  const [overlaps, setOverlaps] = useState([])
  const [overlapsLoading, setOverlapsLoading] = useState(false)
  const [overlapsError, setOverlapsError] = useState(null)
  const [detecting, setDetecting] = useState(false)

  // Analytics state
  const [analytics, setAnalytics] = useState([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState(null)

  // Flow invocation state
  const [runningFlowId, setRunningFlowId] = useState(null)
  const [runResults, setRunResults] = useState({}) // apiName → { status, message }
  const [modalFlow, setModalFlow] = useState(null) // flow selected for the run modal

  // Flows tab filter/search
  const [flowSearch, setFlowSearch] = useState('')
  const [showInvocableOnly, setShowInvocableOnly] = useState(false)

  // Load flows
  const loadFlows = useCallback(async () => {
    if (!activeOrgId) return
    try {
      setFlowsLoading(true)
      setFlowsError(null)
      const { data } = await getFlows(activeOrgId)
      setFlows(Array.isArray(data) ? data : [])
    } catch (err) {
      setFlowsError(err.response?.data?.message || 'Failed to load flows')
    } finally {
      setFlowsLoading(false)
    }
  }, [activeOrgId])

  // Load stats
  const loadStats = useCallback(async () => {
    if (!activeOrgId) return
    try {
      setStatsLoading(true)
      setStatsError(null)
      const { data } = await getDashboardStats(activeOrgId)
      setStats(data)
    } catch (err) {
      setStatsError(err.response?.data?.message || 'Failed to load stats')
    } finally {
      setStatsLoading(false)
    }
  }, [activeOrgId])

  // Load flow runs
  const loadRuns = useCallback(async () => {
    if (!activeOrgId) return
    try {
      setRunsLoading(true)
      setRunsError(null)
      const { data } = await getFlowRuns(activeOrgId, statusFilter, page)
      setRuns(Array.isArray(data) ? data : [])
    } catch (err) {
      setRunsError(err.response?.data?.message || 'Failed to load flow runs')
    } finally {
      setRunsLoading(false)
    }
  }, [activeOrgId, statusFilter, page])

  // Load overlaps
  const loadOverlaps = useCallback(async () => {
    if (!activeOrgId) return
    try {
      setOverlapsLoading(true)
      setOverlapsError(null)
      const { data } = await getOverlaps(activeOrgId)
      setOverlaps(Array.isArray(data) ? data : [])
    } catch (err) {
      setOverlapsError(err.response?.data?.message || 'Failed to load overlaps')
    } finally {
      setOverlapsLoading(false)
    }
  }, [activeOrgId])

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    if (!activeOrgId) return
    try {
      setAnalyticsLoading(true)
      setAnalyticsError(null)
      const { data } = await getFlowAnalytics(activeOrgId, 30)
      setAnalytics(Array.isArray(data) ? data : [])
    } catch (err) {
      setAnalyticsError(err.response?.data?.message || 'Failed to load analytics')
    } finally {
      setAnalyticsLoading(false)
    }
  }, [activeOrgId])

  // Handle row selection — fetch full detail with errors
  const handleSelectRun = async (run) => {
    setSelectedRun(run)
    try {
      setDetailLoading(true)
      const { data } = await getFlowRunDetail(run.id)
      setSelectedRun(data)
    } catch {
      // keep the partial run data already set
    } finally {
      setDetailLoading(false)
    }
  }

  // Handle detect overlaps
  const handleDetect = async () => {
    if (!activeOrgId || detecting) return
    try {
      setDetecting(true)
      setOverlapsError(null)
      const { data } = await detectOverlaps(activeOrgId)
      setOverlaps(Array.isArray(data) ? data : [])
      // Refresh stats since overlaps count changes
      loadStats()
    } catch (err) {
      setOverlapsError(err.response?.data?.message || 'Detection failed')
    } finally {
      setDetecting(false)
    }
  }

  // Open modal — fetch inputs first, then let user fill them
  const handleOpenRunModal = (flow) => {
    if (runningFlowId) return
    setModalFlow(flow)
  }

  // Called by modal when user confirms with filled inputs
  const handleRunFlow = async (flow, inputValues) => {
    setRunningFlowId(flow.apiName)
    setRunResults((prev) => ({ ...prev, [flow.apiName]: null }))
    try {
      const { data } = await invokeFlow(
        activeOrgId,
        flow.invocableApiName || flow.apiName,
        flow.label,
        inputValues
      )
      setRunResults((prev) => ({
        ...prev,
        [flow.apiName]: { status: data.status, message: data.errorMessage || null },
      }))
      loadRuns()
      loadStats()
      if (activeTab === 3) loadAnalytics()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invocation failed'
      setRunResults((prev) => ({ ...prev, [flow.apiName]: { status: 'Error', message: msg } }))
    } finally {
      setRunningFlowId(null)
    }
  }

  // Initial load on org change
  useEffect(() => {
    if (!activeOrgId) return
    loadStats()
    loadFlows()
    loadRuns()
    loadOverlaps()
  }, [activeOrgId])

  // Reload runs when filter/page changes
  useEffect(() => {
    if (!activeOrgId) return
    loadRuns()
  }, [statusFilter, page])

  // Load analytics when switching to that tab
  useEffect(() => {
    if (activeTab === 3 && activeOrgId && analytics.length === 0) {
      loadAnalytics()
    }
  }, [activeTab, activeOrgId])

  // No org selected
  if (!activeOrgId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">FlowForge</h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <p className="text-slate-400">Select an org to view flow data.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">FlowForge</h2>

      {/* Stats bar */}
      {statsError && (
        <div className="mb-4 p-3 bg-red-400/10 border border-red-400/30 rounded-xl flex items-center justify-between">
          <span className="text-sm text-red-400">{statsError}</span>
          <button onClick={loadStats} className="text-sm text-red-400 underline hover:no-underline ml-4">
            Retry
          </button>
        </div>
      )}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-5 h-24 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-24 mb-2" />
              <div className="h-7 bg-slate-700 rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <FlowStatsBar stats={stats} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-lg p-1 w-fit border border-slate-700/50">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === i
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: Flows */}
      {activeTab === 0 && (
        <div>
          {/* Info banner */}
          <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">&#9432;</span>
            <p className="text-sm text-indigo-300">
              Only <span className="font-semibold">Autolaunched Flows with no trigger</span> can be invoked from OrgForge.
              Screen Flows, Record-Triggered Flows, Scheduled Flows, and Platform Event Flows must be run directly from Salesforce.
            </p>
          </div>

          {flowsError && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/30 rounded-xl flex items-center justify-between">
              <span className="text-sm text-red-400">{flowsError}</span>
              <button onClick={loadFlows} className="text-sm text-red-400 underline hover:no-underline ml-4">Retry</button>
            </div>
          )}
          {flowsLoading ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 animate-pulse">
              <div className="h-10 bg-slate-700 rounded mb-3" />
              {[1,2,3,4,5].map((i) => <div key={i} className="h-12 bg-slate-700/50 rounded mb-2" />)}
            </div>
          ) : flowsError ? null : flows.length === 0 ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
              <p className="text-slate-400 text-sm">No active flows found in this org.</p>
            </div>
          ) : (() => {
            const invocableCount = flows.filter((f) => f.invocable).length
            const filtered = flows
              .filter((f) => {
                if (showInvocableOnly && !f.invocable) return false
                if (flowSearch) {
                  const q = flowSearch.toLowerCase()
                  return (f.label || '').toLowerCase().includes(q) ||
                    (f.apiName || '').toLowerCase().includes(q)
                }
                return true
              })
              // Sort: invocable flows first
              .sort((a, b) => (b.invocable ? 1 : 0) - (a.invocable ? 1 : 0))

            return (
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                {/* Toolbar */}
                <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-slate-300">
                    {flows.length} flows &nbsp;·&nbsp;
                    <span className="text-indigo-400">{invocableCount} runnable</span>
                  </span>
                  <div className="flex-1" />
                  {/* Search */}
                  <input
                    type="text"
                    value={flowSearch}
                    onChange={(e) => setFlowSearch(e.target.value)}
                    placeholder="Search flows..."
                    className="px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-52"
                  />
                  {/* Filter toggle */}
                  <button
                    onClick={() => setShowInvocableOnly((v) => !v)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      showInvocableOnly
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    Runnable Only
                  </button>
                  <button onClick={loadFlows} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                    Refresh
                  </button>
                </div>

                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No flows match your filter.</div>
                ) : (
                  <div className="overflow-y-auto" style={{ maxHeight: '520px' }}>
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-800 z-10">
                        <tr className="border-b border-slate-700 text-left">
                          <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Flow</th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Trigger</th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-36">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {filtered.map((f) => {
                          const isRunning = runningFlowId === f.apiName
                          const result = runResults[f.apiName]
                          return (
                            <tr key={f.id} className={`hover:bg-slate-700/30 transition-colors ${f.invocable ? 'bg-indigo-950/20' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <div className="text-slate-200 font-medium">{f.label || '—'}</div>
                                    {f.apiName && <div className="text-xs text-slate-500 mt-0.5">{f.apiName}</div>}
                                  </div>
                                  {f.invocable && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                      Runnable
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{f.processType || '—'}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{f.triggerType || 'None'}</td>
                              <td className="px-4 py-3">
                                {f.invocable ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleOpenRunModal(f)}
                                      disabled={!!runningFlowId}
                                      className="px-3 py-1 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                                    >
                                      {isRunning ? 'Running...' : 'Run'}
                                    </button>
                                    {result && (
                                      <span className={`text-xs font-medium ${result.status === 'Success' ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.status === 'Success' ? 'Done' : 'Error'}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-600">Run from SF</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Tab: Flow Runs */}
      {activeTab === 1 && (
        <div>
          {/* Status filter */}
          <div className="flex items-center gap-2 mb-4">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => { setStatusFilter(f); setPage(0); setSelectedRun(null) }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  statusFilter === f
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {runsError && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/30 rounded-xl flex items-center justify-between">
              <span className="text-sm text-red-400">{runsError}</span>
              <button onClick={loadRuns} className="text-sm text-red-400 underline hover:no-underline ml-4">
                Retry
              </button>
            </div>
          )}

          <div className="flex gap-4">
            {/* Runs table */}
            <div className="flex-1 min-w-0">
              {runsLoading ? (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-slate-700 rounded" />
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-slate-700/50 rounded" />
                    ))}
                  </div>
                </div>
              ) : (
                <FlowRunsTable runs={runs} onSelect={handleSelectRun} />
              )}

              {/* Pagination */}
              {runs.length === 20 || page > 0 ? (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 text-sm border border-slate-600 text-slate-400 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-slate-400">Page {page + 1}</span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={runs.length < 20}
                    className="px-3 py-1.5 text-sm border border-slate-600 text-slate-400 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>

            {/* Detail panel */}
            <div className="w-80 shrink-0">
              {detailLoading ? (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-slate-700/50 rounded w-1/2 mb-6" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-slate-700/30 rounded" />)}
                  </div>
                </div>
              ) : (
                <FlowErrorPanel flowRun={selectedRun} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Overlap Detection */}
      {activeTab === 2 && (
        <div>
          {overlapsError && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/30 rounded-xl flex items-center justify-between">
              <span className="text-sm text-red-400">{overlapsError}</span>
              <button onClick={loadOverlaps} className="text-sm text-red-400 underline hover:no-underline ml-4">
                Retry
              </button>
            </div>
          )}
          {overlapsLoading ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 animate-pulse">
              <div className="h-5 bg-slate-700 rounded w-48 mb-4" />
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-24 bg-slate-700/50 rounded-xl" />)}
              </div>
            </div>
          ) : (
            <OverlapDetector overlaps={overlaps} onDetect={handleDetect} detecting={detecting} />
          )}
        </div>
      )}

      {/* Tab: Analytics */}
      {activeTab === 3 && (
        <div>
          {analyticsError && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/30 rounded-xl flex items-center justify-between">
              <span className="text-sm text-red-400">{analyticsError}</span>
              <button onClick={loadAnalytics} className="text-sm text-red-400 underline hover:no-underline ml-4">
                Retry
              </button>
            </div>
          )}
          {analyticsLoading ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-32 mb-4" />
              <div className="h-72 bg-slate-700/50 rounded" />
            </div>
          ) : (
            <FlowTrendChart analytics={analytics} />
          )}
        </div>
      )}

      {/* Run Flow Modal */}
      {modalFlow && (
        <RunFlowModal
          flow={modalFlow}
          orgId={activeOrgId}
          onRun={handleRunFlow}
          onClose={() => setModalFlow(null)}
        />
      )}
    </div>
  )
}
