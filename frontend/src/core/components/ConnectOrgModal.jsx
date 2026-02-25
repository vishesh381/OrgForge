import { useState } from 'react'
import { X, Building2, FlaskConical, Zap, ArrowRight, Loader2 } from 'lucide-react'
import apiClient from '../services/apiClient.js'

const ORG_TYPES = [
  {
    id: 'production',
    label: 'Production',
    sublabel: 'login.salesforce.com',
    icon: Building2,
    description: 'Live orgs, Developer Editions, and Trailhead Playgrounds',
    gradient: 'from-blue-500/10 to-indigo-500/10',
    border: 'border-blue-500/30',
    activeBorder: 'border-blue-400',
    activeBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    badgeColor: 'bg-blue-500/20 text-blue-300',
  },
  {
    id: 'sandbox',
    label: 'Sandbox',
    sublabel: 'test.salesforce.com',
    icon: FlaskConical,
    description: 'Full Copy, Partial Copy, Developer, and Scratch orgs',
    gradient: 'from-amber-500/10 to-orange-500/10',
    border: 'border-amber-500/30',
    activeBorder: 'border-amber-400',
    activeBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    badgeColor: 'bg-amber-500/20 text-amber-300',
  },
]

export default function ConnectOrgModal({ onClose }) {
  const [selected, setSelected] = useState('production')
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    try {
      const sandbox = selected === 'sandbox'
      const { data } = await apiClient.get(`/orgs/connect?sandbox=${sandbox}`)
      window.location.href = data.url
    } catch (e) {
      console.error('Failed to get connect URL', e)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600/20 border border-indigo-500/30 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Connect Salesforce Org</h2>
              <p className="text-xs text-slate-500">Select the type of org to connect</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Org type cards */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
          {ORG_TYPES.map((type) => {
            const Icon = type.icon
            const isSelected = selected === type.id
            return (
              <button
                key={type.id}
                onClick={() => setSelected(type.id)}
                className={`relative flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150 bg-gradient-to-br ${type.gradient} ${
                  isSelected
                    ? `${type.activeBorder} ${type.activeBg} scale-[1.02] shadow-lg`
                    : `${type.border} hover:border-slate-500 hover:scale-[1.01]`
                }`}
              >
                {/* Selected ring */}
                {isSelected && (
                  <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${type.iconColor.replace('text-', 'bg-')}`} />
                )}

                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isSelected ? type.activeBg : 'bg-slate-800/60'
                } border ${isSelected ? type.activeBorder : 'border-slate-700'}`}>
                  <Icon className={`w-4.5 h-4.5 ${isSelected ? type.iconColor : 'text-slate-400'}`} />
                </div>

                <div>
                  <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {type.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{type.sublabel}</p>
                </div>

                <p className="text-xs text-slate-500 leading-snug">{type.description}</p>
              </button>
            )
          })}
        </div>

        {/* Info banner */}
        <div className="mx-6 mb-5 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">
            You'll be redirected to Salesforce to authorize OrgForge. Your credentials are never stored — only OAuth tokens.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to Salesforce…
              </>
            ) : (
              <>
                Connect with Salesforce
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
