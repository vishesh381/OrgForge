import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import AppShell from './core/components/AppShell.jsx'
import LoadingSpinner from './core/components/LoadingSpinner.jsx'
import LoginPage from './core/layouts/LoginPage.jsx'
import { useAuthStore, useSettingsStore, applyTheme, BG_THEMES } from './core/store/appStore.js'

// Lazy load all module pages
const HomePage          = lazy(() => import('./core/layouts/HomePage.jsx'))
const LimitDashboard    = lazy(() => import('./modules/limit-guard/pages/LimitDashboard.jsx'))
const TestRunnerPage    = lazy(() => import('./modules/apex-pulse/pages/TestRunnerPage.jsx'))
const CoverageDashboard = lazy(() => import('./modules/apex-pulse/pages/CoverageDashboard.jsx'))
const TestHistoryPage   = lazy(() => import('./modules/apex-pulse/pages/TestHistoryPage.jsx'))
const TestRunDetail     = lazy(() => import('./modules/apex-pulse/pages/TestRunDetail.jsx'))
const OrgHealthDashboard    = lazy(() => import('./modules/org-lens/pages/OrgHealthDashboard.jsx'))
const DeploymentDashboard   = lazy(() => import('./modules/deploy-pilot/pages/DeploymentDashboard.jsx'))
const FlowDashboard         = lazy(() => import('./modules/flow-forge/pages/FlowDashboard.jsx'))
const PermissionDashboard   = lazy(() => import('./modules/permission-pilot/pages/PermissionDashboard.jsx'))
const DataForgeDashboard    = lazy(() => import('./modules/data-forge/pages/DataForgeDashboard.jsx'))
const OrgChatPage           = lazy(() => import('./modules/org-chat/pages/OrgChatPage.jsx'))

function ProtectedApp() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { accentColor, bgTheme } = useSettingsStore()

  // Re-apply saved theme whenever the app loads
  useEffect(() => {
    applyTheme(accentColor, bgTheme)
    document.body.style.backgroundColor = BG_THEMES[bgTheme]?.body || BG_THEMES.dark.body
  }, [accentColor, bgTheme])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <AppShell>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/"                         element={<HomePage />} />
          <Route path="/limit-guard/*"            element={<LimitDashboard />} />
          <Route path="/apex-pulse"               element={<TestRunnerPage />} />
          <Route path="/apex-pulse/coverage"      element={<CoverageDashboard />} />
          <Route path="/apex-pulse/history"       element={<TestHistoryPage />} />
          <Route path="/apex-pulse/history/:runId" element={<TestRunDetail />} />
          <Route path="/org-lens/*"               element={<OrgHealthDashboard />} />
          <Route path="/deploy-pilot/*"           element={<DeploymentDashboard />} />
          <Route path="/flow-forge/*"             element={<FlowDashboard />} />
          <Route path="/permission-pilot/*"       element={<PermissionDashboard />} />
          <Route path="/data-forge/*"             element={<DataForgeDashboard />} />
          <Route path="/org-chat/*"               element={<OrgChatPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*"     element={<ProtectedApp />} />
      </Routes>
    </BrowserRouter>
  )
}
