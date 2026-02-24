import { useEffect, useRef, useState } from 'react'
import { X, Palette, Monitor, User, ChevronRight, Check, FlaskConical, CheckCircle } from 'lucide-react'
import {
  useAuthStore,
  useSettingsStore,
  useNotificationStore,
  ACCENT_PALETTES,
  BG_THEMES,
  applyTheme,
} from '../store/appStore.js'

// ─── Accent swatch ────────────────────────────────────────────────────────────
function AccentSwatch({ id, palette, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(id)}
      title={palette.name}
      className={`relative w-9 h-9 rounded-full border-2 transition-all ${
        selected ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
      }`}
      style={{ backgroundColor: palette[600] }}
    >
      {selected && (
        <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto drop-shadow" />
      )}
    </button>
  )
}

// ─── BG theme card ────────────────────────────────────────────────────────────
function ThemeCard({ id, theme, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
      }`}
    >
      {/* Mini preview */}
      <div className="w-full h-12 rounded-lg overflow-hidden border border-slate-700/50"
        style={{ backgroundColor: theme.body }}>
        <div className="h-3 flex" style={{ backgroundColor: theme.sidebar }}>
          <div className="w-1/3 h-full" style={{ backgroundColor: theme.sidebar }} />
        </div>
        <div className="flex gap-1 p-1 mt-0.5">
          <div className="rounded-sm flex-1 h-6" style={{ backgroundColor: theme.card }} />
          <div className="rounded-sm w-8 h-6" style={{ backgroundColor: theme.card }} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        {selected && <Check className="w-3 h-3 text-indigo-400" />}
        <span className={`text-xs font-medium ${selected ? 'text-indigo-300' : 'text-slate-400'}`}>
          {theme.name}
        </span>
      </div>
    </button>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────
const TEST_NOTIFICATIONS = [
  { title: 'Apex Tests Passed',       message: 'AccountServiceTest ran 38 tests — 38 passed, 0 failed.',        type: 'success'  },
  { title: 'Governor Limit Warning',  message: 'SOQL queries at 87% of daily limit in your Production org.',    type: 'alert'    },
  { title: 'Deployment Complete',     message: 'v2.4.0 deployed to Staging — 12 components, 0 errors.',         type: 'info'     },
  { title: 'Flow Execution Error',    message: 'Create_Test_Contacts failed for Account "Acme Corp" at step 3.', type: 'error'    },
  { title: 'Org Health Score Updated', message: 'OrgForge recalculated your health score: 74/100 (↑ 3 pts).',  type: 'info'     },
]

export default function SettingsPanel({ open, onClose }) {
  const drawerRef = useRef(null)
  const { user } = useAuthStore()
  const { accentColor, bgTheme, setAccentColor, setBgTheme } = useSettingsStore()
  const { addNotification } = useNotificationStore()
  const [seeded, setSeeded] = useState(false)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  // Reset seeded state when panel closes
  useEffect(() => { if (!open) setSeeded(false) }, [open])

  // Apply theme on change
  const handleAccent = (c) => {
    setAccentColor(c)
    applyTheme(c, bgTheme)
  }
  const handleBg = (t) => {
    setBgTheme(t)
    applyTheme(accentColor, t)
    // Also apply bg immediately to body
    document.body.style.backgroundColor = BG_THEMES[t]?.body || BG_THEMES.dark.body
  }

  const handleSeedNotifications = () => {
    TEST_NOTIFICATIONS.forEach(n => addNotification({ ...n, createdAt: new Date().toISOString() }))
    setSeeded(true)
  }

  if (!open) return null

  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* ── Profile ── */}
          <Section icon={User} title="Profile">
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl border border-slate-700">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || 'No email'}</p>
              </div>
            </div>
          </Section>

          {/* ── Accent Color ── */}
          <Section icon={Palette} title="Accent Color">
            <div className="flex flex-wrap gap-3 p-3 bg-slate-800 rounded-xl border border-slate-700">
              {Object.entries(ACCENT_PALETTES).map(([id, palette]) => (
                <AccentSwatch key={id} id={id} palette={palette}
                  selected={accentColor === id} onSelect={handleAccent} />
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2 ml-1">
              Current: <span className="text-slate-300 font-medium">{ACCENT_PALETTES[accentColor]?.name}</span>
            </p>
          </Section>

          {/* ── Background Theme ── */}
          <Section icon={Monitor} title="Background Theme">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(BG_THEMES).map(([id, theme]) => (
                <ThemeCard key={id} id={id} theme={theme}
                  selected={bgTheme === id} onSelect={handleBg} />
              ))}
            </div>
          </Section>

          {/* ── About ── */}
          {/* ── Testing ── */}
          <Section icon={FlaskConical} title="Testing">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
              <p className="text-xs text-slate-400">
                Seed sample notifications to preview the notification panel with all types.
              </p>
              <button
                onClick={handleSeedNotifications}
                disabled={seeded}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  seeded
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30 cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {seeded
                  ? <><CheckCircle className="w-3.5 h-3.5" /> 5 notifications added</>
                  : <><FlaskConical className="w-3.5 h-3.5" /> Seed test notifications</>
                }
              </button>
            </div>
          </Section>

          {/* ── About ── */}
          <div className="mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>OrgForge</span>
              <span>v1.0</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
              <span>Salesforce Management Platform</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
