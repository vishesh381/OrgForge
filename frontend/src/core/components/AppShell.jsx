import { useEffect } from 'react'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import { useAuthStore, useOrgStore } from '../store/appStore.js'
import apiClient from '../services/apiClient.js'

export default function AppShell({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { setOrgs, setActiveOrg, setOrgsLoading, clearOrgs, activeOrgId } = useOrgStore()

  useEffect(() => {
    if (!isAuthenticated) {
      clearOrgs()
      return
    }
    setOrgsLoading(true)
    apiClient.get('/orgs')
      .then(({ data }) => {
        setOrgs(data)
        // Keep the persisted activeOrgId if it still exists in the list, else auto-select first
        const stillValid = data.find((o) => o.orgId === activeOrgId)
        if (data.length > 0 && !stillValid) setActiveOrg(data[0].orgId)
      })
      .catch(() => {})
      .finally(() => setOrgsLoading(false))
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
