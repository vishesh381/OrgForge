# OrgForge Frontend

## Structure
```
src/
  main.jsx              → App entry point
  App.jsx               → Router + lazy module pages
  index.css             → Global styles (TailwindCSS 4 import)
  core/
    components/         → Shared UI: AppShell, Sidebar, Header, OrgSwitcher, LoadingSpinner, StatusBadge, MetricCard, DataTable, ChartWrapper, EmptyState
    layouts/            → LoginPage, HomePage
    hooks/              → useApi, useWebSocket, useOrg
    services/           → apiClient (Axios+JWT), wsClient (STOMP)
    store/              → appStore (Zustand: useAuthStore, useOrgStore, useNotificationStore)
    utils/              → formatters, constants
  modules/
    apex-pulse/         → Test runner, coverage, history pages
    limit-guard/        → Governor limits dashboard
    org-lens/           → Org health and dead code
    deploy-pilot/       → Deployment tracking
    flow-forge/         → Flow analytics
    permission-pilot/   → Permission management
    data-forge/         → CSV import wizard
    org-chat/           → AI chat interface
```

## Key Patterns

### API calls
```js
import apiClient from '../../../core/services/apiClient.js'
// All calls include JWT header automatically
const data = await apiClient.get('/module-name/endpoint', { params: { orgId } }).then(r => r.data)
```

### Org context
```js
import { useOrg } from '../../../core/hooks/useOrg.js'
const { activeOrg, activeOrgId } = useOrg()
```

### WebSocket subscription
```js
import { useWebSocket } from '../../../core/hooks/useWebSocket.js'
const { subscribe, unsubscribe } = useWebSocket()
useEffect(() => {
  const sub = subscribe(`/topic/testrun/${orgId}/${runId}`, (msg) => setProgress(msg))
  return () => unsubscribe(sub)
}, [orgId, runId])
```

## Theme
- Background: `bg-slate-900` (page), `bg-slate-800` (cards), `bg-slate-950` (sidebar)
- Text: `text-white` (primary), `text-slate-400` (secondary)
- Borders: `border-slate-700`, `border-slate-800`
- Accent: `bg-indigo-600` / `text-indigo-400`
- Status: green=success, yellow=warning, red=error/critical

## Dev
```bash
npm run dev   # http://localhost:5173
npm run build # production build
```
