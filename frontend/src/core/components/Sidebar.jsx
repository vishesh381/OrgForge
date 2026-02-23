import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Zap, Eye, Rocket, GitBranch,
  Shield, Database, BarChart3, MessageSquare, ChevronLeft,
} from 'lucide-react'
import { useState } from 'react'

const modules = [
  { path: '/',                 icon: LayoutDashboard, label: 'Home',             exact: true },
  { path: '/limit-guard',      icon: BarChart3,       label: 'Limit Guard',       color: 'text-green-400' },
  { path: '/apex-pulse',       icon: Zap,             label: 'Apex Pulse',        color: 'text-yellow-400' },
  { path: '/org-lens',         icon: Eye,             label: 'Org Lens',          color: 'text-blue-400' },
  { path: '/deploy-pilot',     icon: Rocket,          label: 'Deploy Pilot',      color: 'text-purple-400' },
  { path: '/flow-forge',       icon: GitBranch,       label: 'Flow Forge',        color: 'text-pink-400' },
  { path: '/permission-pilot', icon: Shield,          label: 'Permission Pilot',  color: 'text-red-400' },
  { path: '/data-forge',       icon: Database,        label: 'Data Forge',        color: 'text-orange-400' },
  { path: '/org-chat',         icon: MessageSquare,   label: 'Org Chat',          color: 'text-cyan-400' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={`flex flex-col bg-slate-950 border-r border-slate-800 shrink-0 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
              OF
            </div>
            <span className="font-bold text-white text-lg">OrgForge</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-auto"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {modules.map(({ path, icon: Icon, label, color, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
              }`
            }
          >
            <Icon className={`w-5 h-5 shrink-0 ${color || ''}`} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-600">OrgForge v1.0</p>
        </div>
      )}
    </div>
  )
}
