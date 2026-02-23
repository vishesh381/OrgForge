import { useState, useEffect, useCallback } from 'react'
import { ShieldAlert, TrendingUp as TrendingUpIcon, AlertTriangle, Bell, BellOff, RefreshCw, X } from 'lucide-react'
import { useOrg } from '../../../core/hooks/useOrg.js'
import LoadingSpinner from '../../../core/components/LoadingSpinner.jsx'
import MetricCard from '../../../core/components/MetricCard.jsx'
import LimitGauge from '../components/LimitGauge.jsx'
import UsageTrendChart from '../components/UsageTrendChart.jsx'
import PredictionCard from '../components/PredictionCard.jsx'
import { getLimits, getHistory, getAlerts, saveAlert } from '../services/limitGuardApi.js'

export default function LimitDashboard() {
  const { activeOrg, activeOrgId } = useOrg()

  const [limits, setLimits]         = useState([])
  const [alerts, setAlerts]         = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  // Side panel state
  const [selectedLimit, setSelectedLimit]   = useState(null)
  const [trendData, setTrendData]           = useState([])
  const [trendLoading, setTrendLoading]     = useState(false)

  // Alert form state
  const [alertForm, setAlertForm]           = useState({ limitName: '', thresholdPct: 80, notifyEmail: '' })
  const [alertSaving, setAlertSaving]       = useState(false)
  const [alertError, setAlertError]         = useState(null)
  const [alertSuccess, setAlertSuccess]     = useState(false)

  // Filters
  const [statusFilter, setStatusFilter]     = useState('ALL')
  const [typeFilter, setTypeFilter]         = useState('ALL')
  const [searchQuery, setSearchQuery]       = useState('')

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!activeOrgId) return
    setLoading(true)
    setError(null)
    try {
      const [limitsData, alertsData] = await Promise.all([
        getLimits(activeOrgId),
        getAlerts(activeOrgId),
      ])
      setLimits(limitsData)
      setAlerts(alertsData)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch org limits')
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // -----------------------------------------------------------------------
  // Trend panel
  // -----------------------------------------------------------------------

  const openTrendPanel = async (limit) => {
    setSelectedLimit(limit)
    setTrendData([])
    setTrendLoading(true)
    try {
      const data = await getHistory(activeOrgId, limit.limitName, 7)
      setTrendData(data)
    } catch (err) {
      console.error('Failed to load trend data:', err)
    } finally {
      setTrendLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Alert form
  // -----------------------------------------------------------------------

  const handleSaveAlert = async (e) => {
    e.preventDefault()
    if (!alertForm.limitName) {
      setAlertError('Please select a limit')
      return
    }
    setAlertSaving(true)
    setAlertError(null)
    setAlertSuccess(false)
    try {
      await saveAlert(activeOrgId, alertForm)
      setAlertSuccess(true)
      // Refresh alerts list
      const updated = await getAlerts(activeOrgId)
      setAlerts(updated)
      setAlertForm({ limitName: '', thresholdPct: 80, notifyEmail: '' })
      setTimeout(() => setAlertSuccess(false), 3000)
    } catch (err) {
      setAlertError(err.response?.data?.message || 'Failed to save alert')
    } finally {
      setAlertSaving(false)
    }
  }

  // -----------------------------------------------------------------------
  // Computed values
  // -----------------------------------------------------------------------

  const criticalLimits = limits.filter(l => l.status === 'CRITICAL')
  const warningLimits  = limits.filter(l => l.status === 'WARNING')
  const mostCritical   = criticalLimits[0] ?? warningLimits[0] ?? null

  const limitTypes = ['ALL', ...Array.from(new Set(limits.map(l => l.limitType))).sort()]

  const filteredLimits = limits.filter(l => {
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false
    if (typeFilter   !== 'ALL' && l.limitType !== typeFilter) return false
    if (searchQuery && !l.limitName.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  if (!activeOrgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 max-w-md w-full">
          <ShieldAlert className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">No Org Connected</h2>
          <p className="text-sm text-slate-400">
            Connect a Salesforce org to start monitoring governor limits and receive threshold alerts.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">LimitGuard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {activeOrg?.orgName ?? activeOrgId} &mdash; Governor limit monitoring &amp; forecasting
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <span className="text-sm text-red-400">{error}</span>
          <button
            onClick={() => { setError(null); loadData() }}
            className="text-xs text-red-400 underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && limits.length === 0 && <LoadingSpinner />}

      {/* Summary metrics */}
      {limits.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            title="Total Limits"
            value={limits.length}
            subtitle="Tracked from org"
            icon={ShieldAlert}
            color="indigo"
          />
          <MetricCard
            title="Critical"
            value={criticalLimits.length}
            subtitle="≥ 90% usage"
            icon={AlertTriangle}
            color={criticalLimits.length > 0 ? 'red' : 'green'}
          />
          <MetricCard
            title="Warning"
            value={warningLimits.length}
            subtitle="70–89% usage"
            icon={TrendingUpIcon}
            color={warningLimits.length > 0 ? 'yellow' : 'green'}
          />
          <MetricCard
            title="Active Alerts"
            value={alerts.length}
            subtitle="Threshold configs"
            icon={Bell}
            color="purple"
          />
        </div>
      )}

      {/* Most critical limit prediction */}
      {mostCritical && (
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
            Highest Risk Limit
          </h2>
          <PredictionCard
            forecastedExhaustionAt={mostCritical.forecastedExhaustionAt}
            limitName={mostCritical.limitName}
            percentage={mostCritical.percentage}
          />
        </div>
      )}

      {/* Filters row */}
      {limits.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search limits..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-48 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
          />
          <div className="flex gap-2">
            {['ALL', 'CRITICAL', 'WARNING', 'HEALTHY'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? s === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : s === 'WARNING'  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                    : s === 'HEALTHY'  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : 'bg-indigo-600 text-white border border-indigo-500'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {s === 'ALL' ? `All (${limits.length})` : s}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            {limitTypes.map(t => (
              <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>
            ))}
          </select>
        </div>
      )}

      {/* Limit gauges grid */}
      {!loading && filteredLimits.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
              Limit Gauges
            </h2>
            <span className="text-xs text-slate-500">
              {filteredLimits.length} of {limits.length} limits
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredLimits.map(limit => (
              <LimitGauge
                key={limit.limitName}
                name={limit.limitName}
                percentage={limit.percentage}
                status={limit.status}
                used={limit.used}
                total={limit.total}
                onClick={() => openTrendPanel(limit)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && limits.length > 0 && filteredLimits.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">
          No limits match the current filters.
        </div>
      )}

      {/* Alerts section */}
      {limits.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Existing alerts */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                Threshold Alerts
              </h2>
              <span className="text-xs text-slate-500">{alerts.length} active</span>
            </div>
            {alerts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <BellOff className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No alerts configured yet.</p>
                <p className="text-xs text-slate-600 mt-1">Use the form below to add threshold alerts.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-700/50">
                {alerts.map(alert => (
                  <AlertRow key={`${alert.orgId}-${alert.limitName}`} alert={alert} />
                ))}
              </ul>
            )}
          </div>

          {/* Add alert form */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                Configure Alert
              </h2>
            </div>
            <form onSubmit={handleSaveAlert} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Limit Name
                </label>
                <select
                  value={alertForm.limitName}
                  onChange={e => setAlertForm(f => ({ ...f, limitName: e.target.value }))}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                >
                  <option value="">Select a limit...</option>
                  {limits.map(l => (
                    <option key={l.limitName} value={l.limitName}>
                      {formatLimitName(l.limitName)} ({l.percentage.toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Alert Threshold &mdash; {alertForm.thresholdPct}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="95"
                  step="5"
                  value={alertForm.thresholdPct}
                  onChange={e => setAlertForm(f => ({ ...f, thresholdPct: Number(e.target.value) }))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                  <span>10%</span>
                  <span className={alertForm.thresholdPct >= 90 ? 'text-red-400' : alertForm.thresholdPct >= 70 ? 'text-yellow-400' : 'text-green-400'}>
                    {alertForm.thresholdPct}%
                  </span>
                  <span>95%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Notification Email (optional)
                </label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={alertForm.notifyEmail}
                  onChange={e => setAlertForm(f => ({ ...f, notifyEmail: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                />
              </div>

              {alertError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {alertError}
                </p>
              )}
              {alertSuccess && (
                <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                  Alert saved successfully.
                </p>
              )}

              <button
                type="submit"
                disabled={alertSaving || !alertForm.limitName}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {alertSaving ? 'Saving...' : 'Save Alert'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Trend side panel */}
      {selectedLimit && (
        <TrendPanel
          limit={selectedLimit}
          trendData={trendData}
          trendLoading={trendLoading}
          onClose={() => setSelectedLimit(null)}
        />
      )}
    </div>
  )
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

function AlertRow({ alert }) {
  const pct = Number(alert.thresholdPct) || 0
  const color =
    pct >= 90 ? 'text-red-400 bg-red-500/10 border-red-500/30' :
    pct >= 70 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
                'text-green-400 bg-green-500/10 border-green-500/30'

  return (
    <li className="px-5 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Bell className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-white truncate">{formatLimitName(alert.limitName)}</p>
          {alert.notifyEmail && (
            <p className="text-xs text-slate-500 truncate">{alert.notifyEmail}</p>
          )}
        </div>
      </div>
      <span className={`flex-shrink-0 ml-3 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
        {pct}%
      </span>
    </li>
  )
}

function TrendPanel({ limit, trendData, trendLoading, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative pointer-events-auto w-full sm:w-[480px] h-full sm:h-auto sm:max-h-[90vh] bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col overflow-hidden sm:rounded-l-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-white">
              {formatLimitName(limit.limitName)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {limit.used?.toLocaleString()} / {limit.total?.toLocaleString()} used
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Prediction card */}
          <PredictionCard
            forecastedExhaustionAt={limit.forecastedExhaustionAt}
            limitName={limit.limitName}
            percentage={limit.percentage}
          />

          {/* Trend chart */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <TrendingUpIcon className="w-3.5 h-3.5" />
              7-Day Trend
            </h4>
            {trendLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <UsageTrendChart data={trendData} limitName={limit.limitName} />
            )}
          </div>

          {/* Limit details */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
              Limit Details
            </h4>
            <dl className="space-y-2">
              <DetailRow label="Limit Name" value={limit.limitName} mono />
              <DetailRow label="Type"        value={limit.limitType ?? 'GENERAL'} />
              <DetailRow label="Used"        value={limit.used?.toLocaleString()} />
              <DetailRow label="Remaining"   value={(limit.total - limit.used)?.toLocaleString()} />
              <DetailRow label="Total"       value={limit.total?.toLocaleString()} />
              <DetailRow
                label="Usage"
                value={`${Number(limit.percentage).toFixed(2)}%`}
                highlight={limit.status}
              />
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono, highlight }) {
  const textColor =
    highlight === 'CRITICAL' ? 'text-red-400' :
    highlight === 'WARNING'  ? 'text-yellow-400' :
    highlight === 'HEALTHY'  ? 'text-green-400' :
                               'text-white'

  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs text-slate-500 flex-shrink-0">{label}</dt>
      <dd className={`text-xs font-medium text-right break-all ${textColor} ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </dd>
    </div>
  )
}

function formatLimitName(name) {
  return name?.replace(/([A-Z])/g, ' $1').replace(/^[\s_]+/, '').trim() ?? name
}
