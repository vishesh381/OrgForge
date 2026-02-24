import { useEffect } from 'react'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import { useAuthStore, useOrgStore, useSettingsStore, applyTheme, BG_THEMES } from '../store/appStore.js'
import apiClient from '../services/apiClient.js'

export default function AppShell({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const { setOrgs, setActiveOrg, setOrgsLoading, clearOrgs } = useOrgStore()
  const { setAccentColor, setBgTheme } = useSettingsStore()

  // Apply user's saved preferences (theme + accent) whenever they log in
  useEffect(() => {
    if (!isAuthenticated || !user) return
    const accent = user.accentColor || 'indigo'
    const bg     = user.bgTheme    || 'dark'
    setAccentColor(accent)
    setBgTheme(bg)
    applyTheme(accent, bg)
    document.body.style.backgroundColor = BG_THEMES[bg]?.body || BG_THEMES.dark.body
  }, [isAuthenticated, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load org list on login; clear on logout
  useEffect(() => {
    if (!isAuthenticated) {
      clearOrgs()
      return
    }
    setOrgsLoading(true)
    apiClient.get('/orgs')
      .then(({ data }) => {
        setOrgs(data)
        // Prefer the activeOrgId saved on the server (cross-browser), then localStorage
        const serverOrgId = user?.activeOrgId
        const cachedOrgId = useOrgStore.getState().activeOrgId
        const target = serverOrgId || cachedOrgId
        if (data.length > 0) {
          const valid = data.find((o) => o.orgId === target)
          setActiveOrg(valid ? target : data[0].orgId)
        }
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
