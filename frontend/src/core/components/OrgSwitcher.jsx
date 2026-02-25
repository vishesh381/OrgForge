import { useState } from 'react'
import { ChevronDown, Plus, CheckCircle, RefreshCw, Unplug } from 'lucide-react'
import { useOrg } from '../hooks/useOrg.js'
import { useAuthStore, useOrgStore } from '../store/appStore.js'
import apiClient from '../services/apiClient.js'
import ConnectOrgModal from './ConnectOrgModal.jsx'

const ORG_TYPE_COLORS = {
  PRODUCTION: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  SANDBOX:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
  DEVELOPER:  'text-violet-400 bg-violet-500/10 border-violet-500/20',
  SCRATCH:    'text-pink-400 bg-pink-500/10 border-pink-500/20',
}

export default function OrgSwitcher() {
  const { orgs, activeOrg, setActiveOrg } = useOrg()
  const { updateUser } = useAuthStore()
  const { setOrgs } = useOrgStore()
  const [open, setOpen] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [refreshingId, setRefreshingId] = useState(null)
  const [disconnectingId, setDisconnectingId] = useState(null)

  const handleSelectOrg = (orgId) => {
    setActiveOrg(orgId)
    setOpen(false)
    apiClient.patch('/auth/preferences', { activeOrgId: orgId })
      .then(({ data }) => updateUser({ activeOrgId: data.activeOrgId }))
      .catch(() => {})
  }

  // Refresh org name + type from Salesforce (fixes wrong type on existing orgs)
  const handleRefresh = async (e, orgId) => {
    e.stopPropagation()
    setRefreshingId(orgId)
    try {
      await apiClient.post(`/orgs/${orgId}/refresh`)
      const { data } = await apiClient.get('/orgs')
      setOrgs(data)
    } catch {}
    setRefreshingId(null)
  }

  const handleDisconnect = async (e, org) => {
    e.stopPropagation()
    setDisconnectingId(org.id)
    try {
      await apiClient.delete(`/orgs/${org.id}`)
      const { data } = await apiClient.get('/orgs')
      setOrgs(data)
      // If the disconnected org was active, switch to first remaining
      if (org.orgId === activeOrg?.orgId) {
        setActiveOrg(data[0]?.orgId ?? null)
      }
    } catch {}
    setDisconnectingId(null)
  }

  const orgTypeColor = ORG_TYPE_COLORS[activeOrg?.orgType] || ORG_TYPE_COLORS.PRODUCTION

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-colors"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
          <span className="text-slate-200 max-w-[140px] truncate">
            {activeOrg?.orgName || 'Select Org'}
          </span>
          {activeOrg?.orgType && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${orgTypeColor}`}>
              {activeOrg.orgType}
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {open && (
          <div className="absolute top-full mt-2 left-0 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50">
            <div className="p-2">
              {orgs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No orgs connected yet</p>
              ) : (
                orgs.map((org) => {
                  const typeColor = ORG_TYPE_COLORS[org.orgType] || ORG_TYPE_COLORS.PRODUCTION
                  const isActive = org.orgId === activeOrg?.orgId
                  const isRefreshing    = refreshingId    === org.id
                  const isDisconnecting = disconnectingId === org.id

                  return (
                    <button
                      key={org.id}
                      onClick={() => handleSelectOrg(org.orgId)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group ${
                        isActive ? 'bg-slate-800' : 'hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0 ${typeColor}`}>
                        {org.orgName?.[0]?.toUpperCase() || 'O'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{org.orgName}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{org.orgType}</p>
                      </div>
                      {isActive && !isRefreshing && !isDisconnecting && (
                        <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                      )}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleRefresh(e, org.id)}
                          title="Refresh org name & type"
                          className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => handleDisconnect(e, org)}
                          title="Disconnect org"
                          className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Unplug className={`w-3 h-3 ${isDisconnecting ? 'animate-pulse text-red-400' : ''}`} />
                        </button>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <div className="border-t border-slate-700/60 p-2">
              <button
                onClick={() => { setOpen(false); setShowConnectModal(true) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
              >
                <div className="w-5 h-5 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Plus className="w-3 h-3" />
                </div>
                Connect New Org
              </button>
            </div>
          </div>
        )}
      </div>

      {showConnectModal && (
        <ConnectOrgModal onClose={() => setShowConnectModal(false)} />
      )}
    </>
  )
}
