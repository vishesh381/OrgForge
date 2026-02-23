import { useState, useEffect, useCallback } from 'react'
import { useOrg } from '../../../core/hooks/useOrg.js'
import {
  getOrgHealth,
  getHealthHistory,
  getDeadCode,
  getDependencies,
  markReviewed,
} from '../services/orgLensApi.js'
import HealthScoreRing from '../components/HealthScoreRing.jsx'
import ScoreTrendChart from '../components/ScoreTrendChart.jsx'
import DeadCodeTable from '../components/DeadCodeTable.jsx'
import DependencyGraph from '../components/DependencyGraph.jsx'
import { Activity, RefreshCw, Database, Layers, Bug, Clock } from 'lucide-react'

const RING_CONFIG = [
  { key: 'overallScore',     label: 'Overall',     color: 'stroke-indigo-400' },
  { key: 'apexScore',        label: 'Apex',         color: 'stroke-blue-400'  },
  { key: 'flowScore',        label: 'Flows',        color: 'stroke-purple-400'},
  { key: 'permissionScore',  label: 'Permissions',  color: 'stroke-amber-400' },
  { key: 'dataScore',        label: 'Data',         color: 'stroke-green-400' },
]

const TABS = [
  { id: 'dead-code',     label: 'Dead Code',    icon: Bug   },
  { id: 'dependencies',  label: 'Dependencies', icon: Layers },
]

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex items-start gap-3">
      <div className="p-2 bg-slate-700/50 rounded-lg mt-0.5">
        <Icon className="w-4 h-4 text-slate-300" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-lg text-sm">
      <span className="text-red-400">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 text-red-400 hover:text-red-300 underline hover:no-underline shrink-0 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Rings skeleton */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <div className="flex justify-around">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-28 h-28 rounded-full bg-slate-700" />
              <div className="h-3 w-16 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
      {/* Chart + stats skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 h-48" />
        <div className="space-y-3">
          <div className="bg-slate-800 rounded-xl border border-slate-700 h-20" />
          <div className="bg-slate-800 rounded-xl border border-slate-700 h-20" />
        </div>
      </div>
    </div>
  )
}

export default function OrgHealthDashboard() {
  const { activeOrgId } = useOrg()

  const [health, setHealth]       = useState(null)
  const [history, setHistory]     = useState([])
  const [deadCode, setDeadCode]   = useState([])
  const [deps, setDeps]           = useState([])

  const [loadingHealth,   setLoadingHealth]   = useState(false)
  const [loadingDeadCode, setLoadingDeadCode] = useState(false)
  const [loadingDeps,     setLoadingDeps]     = useState(false)

  const [errorHealth,   setErrorHealth]   = useState(null)
  const [errorDeadCode, setErrorDeadCode] = useState(null)
  const [errorDeps,     setErrorDeps]     = useState(null)

  const [activeTab, setActiveTab] = useState('dead-code')
  const [refreshing, setRefreshing] = useState(false)

  // -------------------------------------------------------------------------
  // Data loaders
  // -------------------------------------------------------------------------

  const loadHealth = useCallback(async () => {
    if (!activeOrgId) return
    setLoadingHealth(true)
    setErrorHealth(null)
    try {
      const [score, hist] = await Promise.all([
        getOrgHealth(activeOrgId),
        getHealthHistory(activeOrgId),
      ])
      setHealth(score)
      setHistory(hist)
    } catch (err) {
      setErrorHealth(err.response?.data?.message ?? err.message ?? 'Failed to load health data')
    } finally {
      setLoadingHealth(false)
    }
  }, [activeOrgId])

  const loadDeadCode = useCallback(async () => {
    if (!activeOrgId) return
    setLoadingDeadCode(true)
    setErrorDeadCode(null)
    try {
      const data = await getDeadCode(activeOrgId)
      setDeadCode(data)
    } catch (err) {
      setErrorDeadCode(err.response?.data?.message ?? err.message ?? 'Failed to load dead code')
    } finally {
      setLoadingDeadCode(false)
    }
  }, [activeOrgId])

  const loadDeps = useCallback(async () => {
    if (!activeOrgId) return
    setLoadingDeps(true)
    setErrorDeps(null)
    try {
      const data = await getDependencies(activeOrgId)
      setDeps(data)
    } catch (err) {
      setErrorDeps(err.response?.data?.message ?? err.message ?? 'Failed to load dependencies')
    } finally {
      setLoadingDeps(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    if (activeOrgId) {
      loadHealth()
      loadDeadCode()
      loadDeps()
    }
  }, [activeOrgId])

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.allSettled([loadHealth(), loadDeadCode(), loadDeps()])
    setRefreshing(false)
  }

  async function handleMarkReviewed(itemId) {
    await markReviewed(activeOrgId, itemId, 'current-user')
    setDeadCode((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, isReviewed: true, reviewedBy: 'current-user' }
          : item
      )
    )
  }

  // -------------------------------------------------------------------------
  // "No org" gate
  // -------------------------------------------------------------------------

  if (!activeOrgId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Org Health</h2>
        <div className="flex flex-col items-center justify-center py-24 bg-slate-800 rounded-2xl border border-slate-700">
          <Activity className="w-14 h-14 text-slate-600 mb-4" />
          <p className="text-lg font-semibold text-white mb-1">No org connected</p>
          <p className="text-slate-500 text-sm">Connect a Salesforce org to run a health analysis.</p>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Loading state (first load only)
  // -------------------------------------------------------------------------

  const isInitialLoad = loadingHealth && !health

  if (isInitialLoad) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Org Health</h2>
        <LoadingSkeleton />
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const lastAnalyzed = health?.scoredAt
    ? new Date(health.scoredAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  const unreviewedCount = deadCode.filter((d) => !d.isReviewed).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Org Health</h2>
          {lastAnalyzed && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last analyzed {lastAnalyzed}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loadingHealth}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh Analysis'}
        </button>
      </div>

      {/* Health error */}
      {errorHealth && <ErrorBanner message={errorHealth} onRetry={loadHealth} />}

      {/* Score Rings */}
      {health && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <div className="flex flex-wrap justify-around gap-6">
            {RING_CONFIG.map(({ key, label, color }) => (
              <HealthScoreRing
                key={key}
                label={label}
                score={parseFloat(health[key] ?? 0)}
                color={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trend Chart + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Score Trend</h3>
          <div className="h-48">
            <ScoreTrendChart history={history} />
          </div>
        </div>

        {/* Key Metrics sidebar */}
        <div className="space-y-3">
          <StatCard
            icon={Database}
            label="Total Metadata"
            value={health?.metadataCount?.toLocaleString() ?? '—'}
            sub="Apex + Flows + Objects + Profiles"
          />
          <StatCard
            icon={Bug}
            label="Needs Review"
            value={unreviewedCount}
            sub={`${deadCode.length} dead code items total`}
          />
          <StatCard
            icon={Layers}
            label="Dependencies"
            value={deps.length}
            sub="Metadata component links"
          />
        </div>
      </div>

      {/* Tab area */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-slate-700">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors relative ${
                activeTab === id
                  ? 'text-white border-b-2 border-indigo-500 -mb-px'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'dead-code' && unreviewedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full leading-none">
                  {unreviewedCount}
                </span>
              )}
              {id === 'dependencies' && deps.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-slate-700 text-slate-400 rounded-full leading-none">
                  {deps.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {/* Dead Code */}
          {activeTab === 'dead-code' && (
            <>
              {errorDeadCode && <ErrorBanner message={errorDeadCode} onRetry={loadDeadCode} />}
              {loadingDeadCode && !deadCode.length ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-slate-700/50 rounded" />
                  ))}
                </div>
              ) : (
                <DeadCodeTable items={deadCode} onMarkReviewed={handleMarkReviewed} />
              )}
            </>
          )}

          {/* Dependencies */}
          {activeTab === 'dependencies' && (
            <>
              {errorDeps && <ErrorBanner message={errorDeps} onRetry={loadDeps} />}
              {loadingDeps && !deps.length ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-slate-700/50 rounded-lg" />
                  ))}
                </div>
              ) : (
                <DependencyGraph dependencies={deps} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
