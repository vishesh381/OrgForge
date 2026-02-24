import { ChevronDown, Plus, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { useOrg } from '../hooks/useOrg.js'
import { useAuthStore } from '../store/appStore.js'
import apiClient from '../services/apiClient.js'

export default function OrgSwitcher() {
  const { orgs, activeOrg, setActiveOrg } = useOrg()
  const { updateUser } = useAuthStore()
  const [open, setOpen] = useState(false)

  const handleSelectOrg = (orgId) => {
    setActiveOrg(orgId)
    setOpen(false)
    apiClient.patch('/auth/preferences', { activeOrgId: orgId })
      .then(({ data }) => updateUser({ activeOrgId: data.activeOrgId }))
      .catch(() => {})
  }

  const handleConnect = async () => {
    try {
      const { data } = await apiClient.get('/orgs/connect')
      window.location.href = data.url
    } catch (e) {
      console.error('Failed to get connect URL', e)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-colors"
      >
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="text-slate-200">{activeOrg?.orgName || 'Select Org'}</span>
        {activeOrg?.orgType && (
          <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
            {activeOrg.orgType}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50">
          <div className="p-2">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelectOrg(org.orgId)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-700 text-left transition-colors"
              >
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-xs font-bold">
                  {org.orgName?.[0] || 'O'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{org.orgName}</p>
                  <p className="text-xs text-slate-400">{org.orgType}</p>
                </div>
                {org.orgId === activeOrg?.orgId && <CheckCircle className="w-4 h-4 text-indigo-400" />}
              </button>
            ))}
            <div className="border-t border-slate-700 mt-2 pt-2">
              <button
                onClick={handleConnect}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700 text-indigo-400 text-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Connect New Org
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
