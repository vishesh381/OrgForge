import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, X, ChevronRight, Zap, CheckCircle, Clock, TrendingUp, RotateCcw } from 'lucide-react'
import { useOrg } from '../../../core/hooks/useOrg.js'
import {
  getDeployments,
  getDeployment,
  syncDeployments,
  analyzeImpact,
  rollbackDeployment,
} from '../services/deployPilotApi.js'
import DeploymentTable from '../components/DeploymentTable.jsx'
import ComponentList from '../components/ComponentList.jsx'
import ImpactPreview from '../components/ImpactPreview.jsx'
import RollbackModal from '../components/RollbackModal.jsx'

// ─── Status badge (inline, reused in detail panel) ───────────────────────────

const STATUS_STYLES = {
  PENDING:     'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  IN_PROGRESS: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
  SUCCEEDED:   'bg-green-500/15 text-green-400 border border-green-500/30',
  FAILED:      'bg-red-500/15 text-red-400 border border-red-500/30',
  ROLLED_BACK: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  VALIDATING:  'bg-purple-500/15 text-purple-400 border border-purple-500/30',
}

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status?.toUpperCase()] ?? STATUS_STYLES.PENDING
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status ?? 'PENDING'}
    </span>
  )
}

function formatDate(dt) {
  if (!dt) return '—'
  try {
    return new Date(dt).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dt
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent = 'indigo' }) {
  const colors = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    green:  'text-green-400 bg-green-500/10 border-green-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    slate:  'text-slate-400 bg-slate-500/10 border-slate-500/20',
  }
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${colors[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 leading-none">{value}</p>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ orgId, deployment, onClose, onRollbackSuccess }) {
  const [detail, setDetail] = useState(null)
  const [components, setComponents] = useState([])
  const [impact, setImpact] = useState(null)
  const [impactLoading, setImpactLoading] = useState(false)
  const [impactError, setImpactError] = useState(null)
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('components')

  useEffect(() => {
    setDetail(null)
    setComponents([])
    setImpact(null)
    setLoading(true)
    setActiveTab('components')

    getDeployment(orgId, deployment.id)
      .then(({ data }) => {
        setDetail(data.deployment)
        setComponents(data.components || [])
      })
      .catch(() => setDetail(deployment))
      .finally(() => setLoading(false))
  }, [orgId, deployment.id])

  const loadImpact = async () => {
    if (impactLoading) return
    const componentNames = components
      .map((c) => c.componentName)
      .filter(Boolean)
    if (componentNames.length === 0) {
      setImpact({ components: [], impactedCount: 0, impactedComponents: [], dependencies: [] })
      return
    }
    setImpactLoading(true)
    setImpactError(null)
    try {
      const { data } = await analyzeImpact(orgId, componentNames)
      setImpact(data)
    } catch (err) {
      setImpactError(err.response?.data?.message || 'Impact analysis failed')
    } finally {
      setImpactLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'impact' && !impact && !impactLoading) {
      loadImpact()
    }
  }, [activeTab])

  const handleRollback = async (reason) => {
    await rollbackDeployment(orgId, deployment.id, reason, detail?.deployedBy || '')
    setRollbackOpen(false)
    onRollbackSuccess?.()
    onClose()
  }

  const d = detail || deployment
  const canRollback = !['ROLLED_BACK', 'PENDING'].includes(d.status?.toUpperCase())

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Panel header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-700 shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="text-base font-semibold text-white truncate">
              {d.label || 'Untitled Deployment'}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={d.status} />
              {d.validationOnly && (
                <span className="text-xs text-purple-400 font-medium bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                  Validation Only
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Deployment meta */}
        <div className="px-5 py-4 border-b border-slate-700 shrink-0 grid grid-cols-2 gap-3">
          <MetaItem label="Type" value={d.deployType || '—'} />
          <MetaItem label="Components" value={d.componentCount} />
          <MetaItem label="Deployed By" value={d.deployedBy || '—'} />
          <MetaItem label="Started" value={formatDate(d.startedAt)} />
          {d.completedAt && <MetaItem label="Completed" value={formatDate(d.completedAt)} />}
          {d.sfDeploymentId && (
            <MetaItem label="SF ID" value={
              <span className="font-mono text-indigo-400">{d.sfDeploymentId}</span>
            } />
          )}
        </div>

        {/* Error message */}
        {d.errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg shrink-0">
            <p className="text-xs text-red-400 leading-relaxed">{d.errorMessage}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-700 px-5 shrink-0 mt-3">
          {['components', 'impact'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 pt-1 mr-6 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab === 'components' ? `Components (${components.length})` : 'Impact Analysis'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : activeTab === 'components' ? (
            <ComponentList components={components} />
          ) : (
            <div>
              {impactLoading && (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500" />
                </div>
              )}
              {impactError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-sm text-red-400">{impactError}</p>
                  <button
                    onClick={loadImpact}
                    className="mt-2 text-xs text-red-400 underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!impactLoading && !impactError && <ImpactPreview impact={impact} />}
            </div>
          )}
        </div>

        {/* Rollback button */}
        {canRollback && (
          <div className="p-5 border-t border-slate-700 shrink-0">
            <button
              onClick={() => setRollbackOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Rollback Deployment
            </button>
          </div>
        )}
      </div>

      {rollbackOpen && (
        <RollbackModal
          deployment={d}
          onConfirm={handleRollback}
          onClose={() => setRollbackOpen(false)}
        />
      )}
    </>
  )
}

function MetaItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-200 font-medium mt-0.5 truncate">{value}</p>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DeploymentDashboard() {
  const { activeOrgId } = useOrg()
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const [selectedDeployment, setSelectedDeployment] = useState(null)

  const loadDeployments = useCallback(async () => {
    if (!activeOrgId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await getDeployments(activeOrgId, 0)
      setDeployments(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deployments')
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadDeployments()
  }, [loadDeployments])

  const handleSync = async () => {
    if (!activeOrgId || syncing) return
    setSyncing(true)
    setSyncError(null)
    try {
      await syncDeployments(activeOrgId)
      await loadDeployments()
    } catch (err) {
      setSyncError(err.response?.data?.message || err.response?.data?.error || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total = deployments.length
  const succeeded = deployments.filter((d) => d.status?.toUpperCase() === 'SUCCEEDED').length
  const successRate = total > 0 ? Math.round((succeeded / total) * 100) : 0
  const lastDeploy = deployments[0]?.startedAt

  return (
    <div className="flex">
      {/* Main content */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${selectedDeployment ? 'mr-0' : ''}`}>
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Deploy Pilot</h2>
            <p className="text-sm text-slate-400 mt-0.5">Monitor and manage Salesforce deployments</p>
          </div>
          <button
            onClick={handleSync}
            disabled={!activeOrgId || syncing}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              !activeOrgId || syncing
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync from Salesforce'}
          </button>
        </div>

        {/* No-org state */}
        {!activeOrgId && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ChevronRight className="w-7 h-7 text-slate-500" />
              </div>
              <h3 className="text-white font-semibold text-lg">No Org Selected</h3>
              <p className="text-slate-400 text-sm mt-2 max-w-xs">
                Connect and select a Salesforce org to view deployment history.
              </p>
            </div>
          </div>
        )}

        {activeOrgId && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={Zap} label="Total Deployments" value={total} accent="indigo" />
              <StatCard icon={TrendingUp} label="Success Rate" value={`${successRate}%`} accent="green" />
              <StatCard
                icon={CheckCircle}
                label="Succeeded"
                value={succeeded}
                accent="green"
              />
              <StatCard
                icon={Clock}
                label="Last Deploy"
                value={lastDeploy ? formatDate(lastDeploy) : '—'}
                accent="slate"
              />
            </div>

            {/* Sync error */}
            {syncError && (
              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-between">
                <p className="text-sm text-yellow-400">{syncError}</p>
                <button onClick={() => setSyncError(null)} className="text-yellow-400/60 hover:text-yellow-400 ml-4">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Load error */}
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={loadDeployments} className="text-xs text-red-400 underline hover:no-underline ml-4">
                  Retry
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {loading ? (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
              </div>
            ) : (
              <DeploymentTable
                deployments={deployments}
                onSelect={setSelectedDeployment}
              />
            )}
          </>
        )}
      </div>

      {/* Slide-in detail panel */}
      {selectedDeployment && activeOrgId && (
        <div className="w-full max-w-md shrink-0 ml-5 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex flex-col">
          <DetailPanel
            orgId={activeOrgId}
            deployment={selectedDeployment}
            onClose={() => setSelectedDeployment(null)}
            onRollbackSuccess={loadDeployments}
          />
        </div>
      )}
    </div>
  )
}
