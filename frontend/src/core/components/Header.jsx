import { useState } from 'react'
import { LogOut, Settings } from 'lucide-react'
import OrgSwitcher from './OrgSwitcher.jsx'
import NotificationPanel from './NotificationPanel.jsx'
import SettingsPanel from './SettingsPanel.jsx'
import { useAuthStore } from '../store/appStore.js'

export default function Header() {
  const { user, logout } = useAuthStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
        <OrgSwitcher />

        <div className="flex items-center gap-1">
          {/* Notification bell — fully wired */}
          <NotificationPanel />

          {/* Settings drawer trigger */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* User info + logout */}
          <div className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-700">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {user && (
              <span className="text-sm text-slate-300 hidden sm:block">{user.name}</span>
            )}
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
