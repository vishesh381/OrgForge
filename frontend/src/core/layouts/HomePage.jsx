import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Zap, Eye, Rocket, GitBranch, Shield, Database, BarChart3, MessageSquare, CheckCircle, AlertCircle, X } from 'lucide-react'
import { useAuthStore, useNotificationStore } from '../store/appStore.js'
import apiClient from '../services/apiClient.js'

const modules = [
  { path: '/limit-guard',      icon: BarChart3,     label: 'Limit Guard',       desc: 'Real-time governor limit monitoring with exhaustion predictions',  color: 'from-green-500/20 border-green-500/30 hover:border-green-400/60' },
  { path: '/apex-pulse',       icon: Zap,           label: 'Apex Pulse',        desc: 'Run Apex tests with live WebSocket progress and coverage analytics', color: 'from-yellow-500/20 border-yellow-500/30 hover:border-yellow-400/60' },
  { path: '/org-lens',         icon: Eye,           label: 'Org Lens',          desc: 'Org health scores, dead code detection, and dependency graphs',      color: 'from-blue-500/20 border-blue-500/30 hover:border-blue-400/60' },
  { path: '/deploy-pilot',     icon: Rocket,        label: 'Deploy Pilot',      desc: 'Smart deployments with impact analysis and one-click rollback',      color: 'from-purple-500/20 border-purple-500/30 hover:border-purple-400/60' },
  { path: '/flow-forge',       icon: GitBranch,     label: 'Flow Forge',        desc: 'Flow execution analytics, error tracking, and overlap detection',    color: 'from-pink-500/20 border-pink-500/30 hover:border-pink-400/60' },
  { path: '/permission-pilot', icon: Shield,        label: 'Permission Pilot',  desc: 'Access tracing, permission comparison, and compliance audits',       color: 'from-red-500/20 border-red-500/30 hover:border-red-400/60' },
  { path: '/data-forge',       icon: Database,      label: 'Data Forge',        desc: 'Bulk data import with field mapping, validation, and rollback',      color: 'from-orange-500/20 border-orange-500/30 hover:border-orange-400/60' },
  { path: '/org-chat',         icon: MessageSquare, label: 'Org Chat',          desc: 'Natural language → SOQL queries powered by Claude AI',               color: 'from-cyan-500/20 border-cyan-500/30 hover:border-cyan-400/60' },
]

function Toast({ toast, onClose }) {
  if (!toast) return null
  const isSuccess = toast.type === 'success'
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border max-w-sm ${
      isSuccess
        ? 'bg-slate-900 border-green-500/40 text-green-400'
        : 'bg-slate-900 border-red-500/40 text-red-400'
    }`}>
      {isSuccess
        ? <CheckCircle className="w-5 h-5 shrink-0" />
        : <AlertCircle className="w-5 h-5 shrink-0" />}
      <p className="text-sm font-medium flex-1 text-white">{toast.message}</p>
      <button onClick={onClose} className="ml-1 text-slate-500 hover:text-slate-300 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const { addNotification } = useNotificationStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      // Clean the URL immediately
      setSearchParams({}, { replace: true })
      // Fetch org name to personalize the message
      apiClient.get(`/orgs/${connected}`)
        .then(({ data }) => {
          const name = data.orgName || 'Your org'
          setToast({ type: 'success', message: `${name} connected successfully!` })
          addNotification({ type: 'success', title: 'Org Connected', message: `${name} has been connected to OrgForge.` })
        })
        .catch(() => {
          setToast({ type: 'success', message: 'Org connected successfully!' })
          addNotification({ type: 'success', title: 'Org Connected', message: 'Your Salesforce org has been connected to OrgForge.' })
        })
    } else if (error) {
      setSearchParams({}, { replace: true })
      const msg = decodeURIComponent(error)
      setToast({ type: 'error', message: `Failed to connect org: ${msg}` })
      addNotification({ type: 'error', title: 'Connection Failed', message: msg })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-slate-400 mt-2">Select a module to get started.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map(({ path, icon: Icon, label, desc, color }) => (
          <Link
            key={path}
            to={path}
            className={`p-5 rounded-xl border bg-gradient-to-br to-transparent ${color} transition-all duration-200 hover:scale-[1.02] group block`}
          >
            <Icon className="w-8 h-8 mb-3 text-white opacity-75 group-hover:opacity-100 transition-opacity" />
            <h3 className="font-semibold text-white mb-1">{label}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
