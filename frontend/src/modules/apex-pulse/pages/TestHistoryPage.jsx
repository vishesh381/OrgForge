import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, CheckCircle, XCircle, BarChart2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useOrgStore } from '../../../core/store/appStore.js'
import { getRuns, getPassRateTrend, getCoverageTrend } from '../services/apexPulseApi.js'
import CoverageTrendChart from '../components/CoverageTrendChart.jsx'

const TABS = ['History', 'Analytics']

function formatDuration(ms) {
  if (!ms) return '--'
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    green:  'text-green-400 bg-green-500/10',
    red:    'text-red-400 bg-red-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
  }
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className={`w-4 h-4 ${colors[color].split(' ')[0]}`} />
        </div>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function statusBadgeClass(status) {
  if (status === 'COMPLETED') return 'bg-green-400/15 text-green-400'
  if (status === 'FAILED')    return 'bg-red-400/15 text-red-400'
  if (status === 'PROCESSING') return 'bg-blue-400/15 text-blue-400'
  return 'bg-slate-400/15 text-slate-400'
}

// ─── History tab ──────────────────────────────────────────────────────────────
function HistoryTab({ activeOrgId }) {
  const [runs, setRuns]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [page, setPage]           = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const load = useCallback(async () => {
    if (!activeOrgId) return
    try {
      setLoading(true); setError(null)
      const { data } = await getRuns(activeOrgId, page, 15)
      setRuns(data.runs || [])
      setTotalPages(data.totalPages || 0)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load test history')
    } finally { setLoading(false) }
  }, [activeOrgId, page])

  useEffect(() => { load() }, [load])

  if (!activeOrgId) return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
      <p className="text-slate-400">Select an org to view test history.</p>
    </div>
  )

  if (loading) return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-10 bg-slate-700 rounded" />
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-12 bg-slate-700/50 rounded" />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="p-4 bg-red-400/10 border border-red-400/30 rounded-xl flex items-center justify-between">
      <span className="text-sm text-red-400">{error}</span>
      <button onClick={load} className="text-sm text-red-400 underline ml-4">Retry</button>
    </div>
  )

  if (runs.length === 0) return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
      <p className="text-slate-400 mb-2">No test runs found.</p>
      <p className="text-sm text-slate-500">
        Go to{' '}
        <Link to="/apex-pulse" className="text-indigo-400 hover:underline">Run Tests</Link>
        {' '}to execute your first test run.
      </p>
    </div>
  )

  return (
    <>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-700/50">
          <thead className="bg-slate-800/50">
            <tr>
              {['Run', 'Status', 'Tests (Pass / Fail / Total)', 'Pass Rate', 'Started', 'Duration'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {runs.map(run => {
              const passRate = run.totalTests > 0
                ? ((run.passCount / run.totalTests) * 100).toFixed(0) : 0
              const duration = run.startedAt && run.completedAt
                ? formatDuration(new Date(run.completedAt) - new Date(run.startedAt)) : '--'
              return (
                <tr key={run.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/apex-pulse/history/${run.id}`}
                      className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                      #{run.id}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(run.status)}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="text-green-400">{run.passCount}</span>
                    <span className="text-slate-600 mx-1">/</span>
                    <span className="text-red-400">{run.failCount}</span>
                    <span className="text-slate-600 mx-1">/</span>
                    <span className="text-slate-400">{run.totalTests}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-semibold ${
                      passRate >= 80 ? 'text-green-400' : passRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{passRate}%</span>
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
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-slate-600 text-slate-400 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 hover:text-white transition-colors">
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-slate-400">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm border border-slate-600 text-slate-400 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 hover:text-white transition-colors">
            Next
          </button>
        </div>
      )}
    </>
  )
}

// ─── Analytics tab ─────────────────────────────────────────────────────────
function AnalyticsTab({ activeOrgId }) {
  const [passRateTrend, setPassRateTrend] = useState([])
  const [coverageTrend, setCoverageTrend] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const load = useCallback(async () => {
    if (!activeOrgId) return
    setLoading(true); setError(null)
    try {
      const [pRes, cRes] = await Promise.all([
        getPassRateTrend(activeOrgId, 30),
        getCoverageTrend(activeOrgId, 30),
      ])
      setPassRateTrend(Array.isArray(pRes.data) ? pRes.data : [])
      setCoverageTrend(Array.isArray(cRes.data) ? cRes.data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics')
    } finally { setLoading(false) }
  }, [activeOrgId])

  useEffect(() => { load() }, [load])

  if (!activeOrgId) return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
      <p className="text-slate-400">Select an org to view analytics.</p>
    </div>
  )

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-800 rounded-xl border border-slate-700" />)}
      </div>
      <div className="h-72 bg-slate-800 rounded-xl border border-slate-700" />
      <div className="h-72 bg-slate-800 rounded-xl border border-slate-700" />
    </div>
  )

  if (error) return (
    <div className="p-4 bg-red-400/10 border border-red-400/30 rounded-xl flex items-center justify-between">
      <span className="text-sm text-red-400">{error}</span>
      <button onClick={load} className="text-sm text-red-400 underline ml-4">Retry</button>
    </div>
  )

  // Compute stats from trend data (passRateTrend has { date, passRate, totalTests, runId })
  const totalRuns     = passRateTrend.length
  const avgPassRate   = totalRuns > 0
    ? passRateTrend.reduce((s, d) => s + (d.passRate || 0), 0) / totalRuns
    : null
  const totalFailures = passRateTrend.reduce((s, d) => {
    const fails = Math.round((d.totalTests || 0) * (1 - (d.passRate || 0) / 100))
    return s + fails
  }, 0)
  const avgCoverage   = coverageTrend.length > 0
    ? coverageTrend.reduce((s, d) => s + (d.coverage || 0), 0) / coverageTrend.length
    : null

  const passRateFormatted = (passRateTrend || []).map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    passRate: typeof d.passRate === 'number' ? parseFloat(d.passRate.toFixed(1)) : 0,
  }))

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BarChart2}   label="Total Runs"     value={totalRuns}
          sub="last 30 days" color="indigo" />
        <StatCard icon={CheckCircle} label="Avg Pass Rate"
          value={avgPassRate != null ? `${avgPassRate.toFixed(1)}%` : '—'}
          sub="last 30 days" color="green" />
        <StatCard icon={XCircle}     label="Total Failures" value={totalFailures}
          sub="last 30 days" color="red" />
        <StatCard icon={TrendingUp}  label="Avg Coverage"
          value={avgCoverage != null ? `${avgCoverage.toFixed(1)}%` : '—'}
          sub="last 30 days" color="yellow" />
      </div>

      {/* Pass rate trend */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-medium text-slate-300">Pass Rate Trend — Last 30 Days</h3>
        </div>
        {passRateFormatted.length === 0 ? (
          <p className="text-slate-500 text-sm">No trend data yet. Run more tests to see the trend.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={passRateFormatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" fontSize={12} tick={{ fill: '#94a3b8' }} axisLine={{ stroke: '#475569' }} />
              <YAxis domain={[0, 100]} fontSize={12} tickFormatter={v => `${v}%`}
                tick={{ fill: '#94a3b8' }} axisLine={{ stroke: '#475569' }} />
              <Tooltip
                formatter={(v) => [`${v}%`, 'Pass Rate']}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#4ade80' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Line type="monotone" dataKey="passRate" stroke="#4ade80" strokeWidth={2}
                dot={{ fill: '#4ade80', r: 3 }} name="Pass Rate %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Coverage trend */}
      <CoverageTrendChart data={coverageTrend} />
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function TestHistoryPage() {
  const navigate = useNavigate()
  const { activeOrgId } = useOrgStore()
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/apex-pulse')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Back to Apex Pulse"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-white">Test History</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-lg p-1 w-fit border border-slate-700/50">
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === i
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && <HistoryTab activeOrgId={activeOrgId} />}
      {activeTab === 1 && <AnalyticsTab activeOrgId={activeOrgId} />}
    </div>
  )
}
