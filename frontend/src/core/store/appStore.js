import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: (user) => set({ isAuthenticated: true, user }),
      logout: async () => {
        set({ isAuthenticated: false, user: null })
        try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch {}
      },
    }),
    {
      name: 'orgforge-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
)

export const useOrgStore = create((set, get) => ({
  orgs: [],
  activeOrgId: null,
  setOrgs: (orgs) => set({ orgs }),
  setActiveOrg: (id) => set({ activeOrgId: id }),
  getActiveOrg: () => get().orgs.find((o) => o.orgId === get().activeOrgId),
}))

export const useNotificationStore = create((set) => ({
  notifications: [],
  addNotification: (n) =>
    set((s) => ({ notifications: [{ ...n, id: Date.now() }, ...s.notifications.slice(0, 49)] })),
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}))
