import { useState } from 'react'
import { Users, Shield, ShieldCheck, Camera, CheckCircle2, AlertCircle } from 'lucide-react'

function TypeBadge({ type }) {
  if (type === 'Profile') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
        <Shield className="w-3 h-3" />
        Profile
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/25">
      <ShieldCheck className="w-3 h-3" />
      Permission Set
    </span>
  )
}

function Toast({ message, isError, onDismiss }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all ${
        isError
          ? 'bg-red-950 border-red-700/50 text-red-300'
          : 'bg-green-950 border-green-700/50 text-green-300'
      }`}
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      )}
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-2 text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  )
}

export default function AccessTracer({ profiles = [], onSnapshot }) {
  const [snapshotting, setSnapshotting] = useState(null)
  const [toast, setToast] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('All')

  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSnapshot = async (profile) => {
    setSnapshotting(profile.id)
    try {
      await onSnapshot(profile.id, profile.name)
      showToast(`Snapshot taken for "${profile.name}"`, false)
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Snapshot failed.'
      showToast(msg, true)
    } finally {
      setSnapshotting(null)
    }
  }

  const filtered = profiles.filter((p) => {
    const matchesSearch =
      !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'All' || p.type === filterType
    return matchesSearch && matchesType
  })

  const profileCount = profiles.filter((p) => p.type === 'Profile').length
  const permSetCount = profiles.filter((p) => p.type === 'PermissionSet').length

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          {profileCount} Profiles
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          {permSetCount} Permission Sets
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500"
        />
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
          {['All', 'Profile', 'PermissionSet'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filterType === type
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type === 'PermissionSet' ? 'Perm Sets' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Shield className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">
            {profiles.length === 0
              ? 'No profiles loaded. Click "Load Profiles" to fetch from Salesforce.'
              : 'No profiles match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((profile) => (
            <div
              key={profile.id}
              className="flex flex-col bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition-colors group"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors"
                    title={profile.name}
                  >
                    {profile.name}
                  </p>
                  {profile.userType && (
                    <p className="text-xs text-slate-500 mt-0.5">{profile.userType}</p>
                  )}
                </div>
                <TypeBadge type={profile.type} />
              </div>

              {/* User count */}
              {profile.userCount !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>{profile.userCount} user{profile.userCount !== 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Snapshot button */}
              <button
                onClick={() => handleSnapshot(profile)}
                disabled={snapshotting === profile.id}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs text-slate-300 font-medium transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                {snapshotting === profile.id ? 'Snapshotting…' : 'Snapshot'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          isError={toast.isError}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
