import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Accent color palettes ────────────────────────────────────────────────────
export const ACCENT_PALETTES = {
  indigo:  { 300:'#a5b4fc', 400:'#818cf8', 500:'#6366f1', 600:'#4f46e5', 700:'#4338ca', name:'Indigo'  },
  sky:     { 300:'#7dd3fc', 400:'#38bdf8', 500:'#0ea5e9', 600:'#0284c7', 700:'#0369a1', name:'Sky'     },
  emerald: { 300:'#6ee7b7', 400:'#34d399', 500:'#10b981', 600:'#059669', 700:'#047857', name:'Emerald' },
  violet:  { 300:'#c4b5fd', 400:'#a78bfa', 500:'#8b5cf6', 600:'#7c3aed', 700:'#6d28d9', name:'Violet'  },
  rose:    { 300:'#fda4af', 400:'#fb7185', 500:'#f43f5e', 600:'#e11d48', 700:'#be123c', name:'Rose'    },
  orange:  { 300:'#fdba74', 400:'#fb923c', 500:'#f97316', 600:'#ea580c', 700:'#c2410c', name:'Orange'  },
}

export const BG_THEMES = {
  dark:     { name:'Dark',     body:'#0f172a', card:'#1e293b', sidebar:'#020617', border:'#334155' },
  midnight: { name:'Midnight', body:'#031427', card:'#071f3d', sidebar:'#010a1a', border:'#0f2d55' },
  amoled:   { name:'AMOLED',   body:'#060606', card:'#0d0d0d', sidebar:'#000000', border:'#1a1a1a' },
  slate:    { name:'Slate',    body:'#111111', card:'#1c1c1c', sidebar:'#0a0a0a', border:'#2c2c2c' },
  ocean:    { name:'Ocean',    body:'#001e2d', card:'#032535', sidebar:'#001420', border:'#063648' },
  fog:      { name:'Fog',      body:'#222b3d', card:'#2d3748', sidebar:'#1a2035', border:'#3d4e63' },
}

export function applyTheme(accentColor, bgTheme) {
  const accent = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.indigo
  const bg     = BG_THEMES[bgTheme]           || BG_THEMES.dark

  // Set data-theme attribute so CSS overrides Tailwind's --color-slate-* variables
  document.documentElement.setAttribute('data-theme', bgTheme)

  // Also keep --of-bg-* variables for any element using them directly
  const root = document.documentElement
  root.style.setProperty('--of-bg-body',    bg.body)
  root.style.setProperty('--of-bg-card',    bg.card)
  root.style.setProperty('--of-bg-sidebar', bg.sidebar)
  root.style.setProperty('--of-border',     bg.border)

  // Inject/replace accent override <style>
  let el = document.getElementById('of-accent-override')
  if (!el) { el = document.createElement('style'); el.id = 'of-accent-override'; document.head.appendChild(el) }

  if (accentColor === 'indigo') {
    el.textContent = '' // indigo is the default — no overrides needed
    return
  }

  const c = accent
  el.textContent = `
    .bg-indigo-600, .hover\\:bg-indigo-600:hover { background-color: ${c[600]} !important; }
    .bg-indigo-500, .hover\\:bg-indigo-500:hover { background-color: ${c[500]} !important; }
    .bg-indigo-400 { background-color: ${c[400]} !important; }
    .text-indigo-400, .hover\\:text-indigo-400:hover { color: ${c[400]} !important; }
    .text-indigo-300, .hover\\:text-indigo-300:hover { color: ${c[300]} !important; }
    .text-indigo-500 { color: ${c[500]} !important; }
    .border-indigo-500, .focus\\:border-indigo-500:focus { border-color: ${c[500]} !important; }
    .border-indigo-600 { border-color: ${c[600]} !important; }
    .ring-indigo-500\\/30, .focus\\:ring-indigo-500\\/30:focus { --tw-ring-color: ${c[500]}4d !important; }
    .bg-indigo-500\\/10 { background-color: ${c[500]}1a !important; }
    .bg-indigo-500\\/20 { background-color: ${c[500]}33 !important; }
    .bg-indigo-950\\/20 { background-color: ${c[700]}33 !important; }
    .text-indigo-950\\/80 { color: ${c[700]}cc !important; }
  `
}

export const useAuthStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: (user) => set({ isAuthenticated: true, user }),
      updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),
      logout: async () => {
        set({ isAuthenticated: false, user: null })
        const base = import.meta.env.VITE_API_BASE_URL || ''
        try { await fetch(`${base}/api/auth/logout`, { method: 'POST', credentials: 'include' }) } catch {}
      },
    }),
    {
      name: 'orgforge-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
)

export const useOrgStore = create(
  persist(
    (set, get) => ({
      orgs: [],
      activeOrgId: null,
      orgsLoading: false,
      setOrgs: (orgs) => set({ orgs }),
      setActiveOrg: (id) => set({ activeOrgId: id }),
      setOrgsLoading: (v) => set({ orgsLoading: v }),
      clearOrgs: () => set({ orgs: [], activeOrgId: null }),
      getActiveOrg: () => get().orgs.find((o) => o.orgId === get().activeOrgId),
    }),
    {
      name: 'orgforge-org',
      // Persist org list + active selection so the switcher shows instantly on return visit
      partialize: (s) => ({ orgs: s.orgs, activeOrgId: s.activeOrgId }),
    }
  )
)

let _notifSeq = 1  // monotonic counter — guarantees unique IDs regardless of timing

export const useNotificationStore = create((set) => ({
  notifications: [],
  addNotification: (n) =>
    set((s) => ({ notifications: [{ ...n, id: _notifSeq++, createdAt: n.createdAt || new Date().toISOString(), read: false }, ...s.notifications.slice(0, 49)] })),
  markRead: (id) =>
    set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })),
  markAllRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  clearAll: () => set({ notifications: [] }),
}))

export const useSettingsStore = create(
  persist(
    (set) => ({
      accentColor: 'indigo',   // indigo | sky | emerald | violet | rose | orange
      bgTheme: 'dark',         // dark | midnight | amoled | slate
      setAccentColor: (c) => set({ accentColor: c }),
      setBgTheme: (t) => set({ bgTheme: t }),
    }),
    { name: 'orgforge-settings' }
  )
)
