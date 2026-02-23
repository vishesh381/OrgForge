# OrgForge Project

## Architecture
- `backend/`  → Spring Boot 3.3 + Java 17 (port 8080)
- `frontend/` → React 19 + Vite 6 + TailwindCSS 4 (port 5173)
- `salesforce/` → SFDX package (thin Salesforce layer)

## Tech Stack
- Backend: Spring Boot 3.3, Spring Security (JWT), Spring Data JPA, WebSocket (STOMP), Caffeine Cache
- Frontend: React 19, Vite 6, TailwindCSS 4, Zustand 5, Recharts 2, lucide-react, SockJS+STOMP
- Database: H2 (dev) / PostgreSQL (prod)
- Migrations: Flyway (prod only, V1–V9)
- AI: Anthropic Claude API (claude-opus-4-6) for Org Chat module

## Module Map
| Module | Route | Backend Package | Description |
|--------|-------|-----------------|-------------|
| LimitGuard | /limit-guard | com.orgforge.modules.limitguard | Salesforce governor limit monitoring |
| Apex Pulse | /apex-pulse | com.orgforge.modules.apexpulse | Apex test runner with live WebSocket progress |
| Org Lens | /org-lens | com.orgforge.modules.orglens | Org health scores and dead code detection |
| Deploy Pilot | /deploy-pilot | com.orgforge.modules.deploypilot | Deployment tracking with impact analysis |
| Flow Forge | /flow-forge | com.orgforge.modules.flowforge | Flow analytics and overlap detection |
| Permission Pilot | /permission-pilot | com.orgforge.modules.permissionpilot | Access tracing and permission comparison |
| Data Forge | /data-forge | com.orgforge.modules.dataforge | Bulk CSV import with field mapping |
| Org Chat | /org-chat | com.orgforge.modules.orgchat | Natural language → SOQL via Claude AI |

## Commands
- Frontend dev: `cd frontend && npm run dev`
- Backend dev: `cd backend && ./mvnw spring-boot:run`
- Docker (full stack): `docker compose up`

## Key Patterns
- **Auth flow**: Register/login → JWT token → stored in Zustand + localStorage
- **Org connection**: Salesforce OAuth 2.0 → tokens stored in `org_connections` table
- **All SF API calls**: via `ToolingApiClient` or `RestApiClient` — pass `OrgConnection org` object
- **All frontend API calls**: via `apiClient.js` (Axios with JWT interceptor) → `?orgId=` param
- **WebSocket**: STOMP broker at `/ws` — apex-pulse broadcasts to `/topic/testrun/{orgId}/{runId}`
- **Caching**: Caffeine — 2min for limits, 5min for org health, 10min for SF metadata

## Database
- Dev: H2 file DB at `./data/orgforgedb` — `ddl-auto: update`, no Flyway
- Prod: PostgreSQL — `ddl-auto: validate`, Flyway migrations V1–V9

## Environment Variables
See `.env.example` for all required variables. Copy to `.env` for local dev.

## Core Entities
- `OrgForgeUser` → platform users (JWT auth)
- `OrgConnection` → connected Salesforce orgs (orgId, tokens, instanceUrl)
