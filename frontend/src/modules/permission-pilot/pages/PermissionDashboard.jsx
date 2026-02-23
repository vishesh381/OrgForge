import { useState, useEffect, useCallback } from 'react'
import { useOrg } from '../../../core/hooks/useOrg.js'
import {
  getProfiles,
  snapshotProfile,
  getComparisons,
  compareProfiles,
  getViolations,
  detectViolations,
  acknowledgeViolation,
} from '../services/permissionPilotApi.js'
import AccessTracer from '../components/AccessTracer.jsx'
import ProfileComparison from '../components/ProfileComparison.jsx'
import ViolationsTable from '../components/ViolationsTable.jsx'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  GitCompareArrows,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Building2,
} from 'lucide-react'

const TABS = [
  { id: 'tracer',     label: 'Access Tracer',       icon: Shield },
  { id: 'comparison', label: 'Profile Comparison',   icon: GitCompareArrows },
  { id: 'violations', label: 'Violations',           icon: ShieldAlert },
]

function SummaryCard({ label, value, icon: Icon, colorClass, subLabel }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
        {subLabel && <p className="text-xs text-slate-600 mt-0.5">{subLabel}</p>}
      </div>
    </div>
  )
}

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon
  return (
    <button
      onClick={() => onClick(tab.id)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      {tab.label}
    </button>
  )
}

export default function PermissionDashboard() {
  const { activeOrg, activeOrgId } = useOrg()

  const [activeTab, setActiveTab] = useState('tracer')
  const [profiles, setProfiles] = useState([])
  const [comparisons, setComparisons] = useState([])
  const [violations, setViolations] = useState([])

  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [loadingViolations, setLoadingViolations] = useState(false)
  const [detectingViolations, setDetectingViolations] = useState(false)

  const [profilesError, setProfilesError] = useState(null)
  const [violationsError, setViolationsError] = useState(null)

  // Derived summary counts
  const highViolationCount = violations.filter(
    (v) => v.riskLevel === 'HIGH' && !(v.acknowledged || v.isAcknowledged)
  ).length
  const mediumViolationCount = violations.filter(
    (v) => v.riskLevel === 'MEDIUM' && !(v.acknowledged || v.isAcknowledged)
  ).length

  // Load profiles from SF
  const loadProfiles = useCallback(async () => {
    if (!activeOrgId) return
    setLoadingProfiles(true)
    setProfilesError(null)
    try {
      const data = await getProfiles(activeOrgId)
      setProfiles(data)
    } catch (err) {
      setProfilesError(err?.response?.data?.message || err.message || 'Failed to load profiles.')
    } finally {
      setLoadingProfiles(false)
    }
  }, [activeOrgId])

  // Load violations from DB
  const loadViolations = useCallback(async () => {
    if (!activeOrgId) return
    setLoadingViolations(true)
    setViolationsError(null)
    try {
      const [vData, cData] = await Promise.all([
        getViolations(activeOrgId),
        getComparisons(activeOrgId),
      ])
      setViolations(vData)
      setComparisons(cData)
    } catch (err) {
      setViolationsError(err?.response?.data?.message || err.message || 'Failed to load violations.')
    } finally {
      setLoadingViolations(false)
    }
  }, [activeOrgId])

  // Initial data load
  useEffect(() => {
    if (activeOrgId) {
      loadProfiles()
      loadViolations()
    }
  }, [activeOrgId])

  // Handlers
  const handleSnapshot = async (profileId, profileName) => {
    const snap = await snapshotProfile(activeOrgId, profileId, profileName)
    // Update user count on the profile card from snapshot result
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId ? { ...p, userCount: snap.userCount } : p
      )
    )
    return snap
  }

  const handleCompare = async (profileA, profileB) => {
    const result = await compareProfiles(activeOrgId, profileA, profileB)
    // Refresh comparisons list
    const cData = await getComparisons(activeOrgId)
    setComparisons(cData)
    return result
  }

  const handleDetectViolations = async () => {
    setDetectingViolations(true)
    setViolationsError(null)
    try {
      const newViolations = await detectViolations(activeOrgId)
      // Reload full list to merge with existing
      const all = await getViolations(activeOrgId)
      setViolations(all)
    } catch (err) {
      setViolationsError(
        err?.response?.data?.message || err.message || 'Detection failed.'
      )
    } finally {
      setDetectingViolations(false)
    }
  }

  const handleAcknowledge = async (id) => {
    await acknowledgeViolation(id)
    setViolations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isAcknowledged: true, acknowledged: true } : v))
    )
  }

  // No org state
  if (!activeOrgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 gap-4">
        <Building2 className="w-14 h-14 opacity-25" />
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-400">No Org Connected</p>
          <p className="text-sm mt-1">Connect a Salesforce org to use Permission Pilot.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-400" />
            Permission Pilot
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {activeOrg?.orgName || activeOrgId} — permission analysis &amp; violation detection
          </p>
        </div>
        <button
          onClick={loadProfiles}
          disabled={loadingProfiles}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingProfiles ? 'animate-spin' : ''}`} />
          Refresh Profiles
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Profiles"
          value={loadingProfiles ? '…' : profiles.filter((p) => p.type === 'Profile').length}
          icon={Shield}
          colorClass="bg-indigo-500/15 text-indigo-400"
        />
        <SummaryCard
          label="Permission Sets"
          value={loadingProfiles ? '…' : profiles.filter((p) => p.type === 'PermissionSet').length}
          icon={ShieldCheck}
          colorClass="bg-purple-500/15 text-purple-400"
        />
        <SummaryCard
          label="HIGH Violations"
          value={loadingViolations ? '…' : highViolationCount}
          icon={ShieldAlert}
          colorClass="bg-red-500/15 text-red-400"
          subLabel="unacknowledged"
        />
        <SummaryCard
          label="MEDIUM Violations"
          value={loadingViolations ? '…' : mediumViolationCount}
          icon={AlertTriangle}
          colorClass="bg-yellow-500/15 text-yellow-400"
          subLabel="unacknowledged"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onClick={setActiveTab}
          />
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {/* Access Tracer */}
        {activeTab === 'tracer' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-200">Access Tracer</h2>
              <span className="text-xs text-slate-500">
                Take snapshots to enable profile comparison
              </span>
            </div>

            {profilesError && (
              <div className="flex items-start gap-2 bg-red-900/25 border border-red-700/40 rounded-lg px-4 py-3 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {profilesError}
              </div>
            )}

            {loadingProfiles ? (
              <div className="flex items-center justify-center py-16 text-slate-500 gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading profiles from Salesforce…</span>
              </div>
            ) : (
              <AccessTracer profiles={profiles} onSnapshot={handleSnapshot} />
            )}
          </div>
        )}

        {/* Profile Comparison */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-200 mb-1">Profile Comparison</h2>
              <p className="text-xs text-slate-500">
                Profiles must have a snapshot before they can be compared.
              </p>
            </div>

            <ProfileComparison profiles={profiles} onCompare={handleCompare} />

            {/* Recent comparisons */}
            {comparisons.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Recent Comparisons</h3>
                <div className="space-y-2">
                  {comparisons.slice(0, 10).map((c) => {
                    let diffCount = 0
                    try {
                      diffCount = JSON.parse(c.diffJson || '[]').length
                    } catch {}
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <GitCompareArrows className="w-4 h-4 text-slate-500 shrink-0" />
                          <div>
                            <p className="text-sm text-slate-300">
                              <span className="text-indigo-400 font-medium">{c.profileA}</span>
                              <span className="text-slate-500 mx-2">vs</span>
                              <span className="text-purple-400 font-medium">{c.profileB}</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {c.comparedBy && `by ${c.comparedBy} · `}
                              {c.createdAt
                                ? new Date(c.createdAt).toLocaleString(undefined, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })
                                : ''}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            diffCount === 0
                              ? 'bg-green-500/15 text-green-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}
                        >
                          {diffCount} diff{diffCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Violations */}
        {activeTab === 'violations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-200">Permission Violations</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  HIGH = ModifyAllData / ViewAllData &nbsp;·&nbsp; MEDIUM = ManageUsers + ResetPasswords
                </p>
              </div>
              <button
                onClick={handleDetectViolations}
                disabled={detectingViolations}
                className="flex items-center gap-2 px-4 py-2 bg-red-700/20 hover:bg-red-700/35 border border-red-700/40 rounded-lg text-sm text-red-400 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {detectingViolations ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
                {detectingViolations ? 'Detecting…' : 'Detect Violations'}
              </button>
            </div>

            {violationsError && (
              <div className="flex items-start gap-2 bg-red-900/25 border border-red-700/40 rounded-lg px-4 py-3 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {violationsError}
              </div>
            )}

            {loadingViolations ? (
              <div className="flex items-center justify-center py-16 text-slate-500 gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading violations…</span>
              </div>
            ) : (
              <ViolationsTable violations={violations} onAcknowledge={handleAcknowledge} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
