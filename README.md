# OrgForge

A full-stack Salesforce management platform that gives developers and admins deep visibility into their orgs — test execution, governor limits, health scores, deployments, flows, permissions, bulk data, and AI-powered SOQL — all in one place.

**Live:** [https://orgforge-backend-05zs.onrender.com](https://orgforge-backend-05zs.onrender.com)

---

## Modules

| Module | Route | Description |
|--------|-------|-------------|
| **Limit Guard** | `/limit-guard` | Real-time governor limit monitoring with exhaustion forecasting |
| **Apex Pulse** | `/apex-pulse` | Apex test runner with live WebSocket progress, coverage analytics, and run history |
| **Org Lens** | `/org-lens` | Org health scores, dead code detection, and dependency graphs |
| **Deploy Pilot** | `/deploy-pilot` | Deployment tracking with impact analysis and one-click rollback |
| **Flow Forge** | `/flow-forge` | Flow execution analytics, error tracking, and overlap detection |
| **Permission Pilot** | `/permission-pilot` | Access tracing, permission comparison, and compliance auditing |
| **Data Forge** | `/data-forge` | Bulk CSV import with field mapping, validation, and rollback |
| **Org Chat** | `/org-chat` | Natural language → SOQL |

---

## Tech Stack

### Backend
- **Java 17** + **Spring Boot 3.3**
- Spring Security (JWT via HttpOnly cookies)
- Spring Data JPA + Hibernate
- WebSocket (STOMP) for live test run progress
- Caffeine Cache (2–10 min TTLs per module)
- **Database:** H2 (dev) / PostgreSQL (prod)
- **Migrations:** Flyway (prod)

### Frontend
- **React 19** + **Vite 6**
- **TailwindCSS 4** with dynamic theming
- **Zustand 5** for state management (with localStorage persistence)
- **Recharts 2** for analytics charts
- SockJS + STOMP for WebSocket

### Integrations
- **Salesforce** — OAuth 2.0 connected app, REST API + Tooling API
- **Anthropic Claude** (`claude-haiku-4-5`) — Org Chat SOQL generation

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Spring Boot (port 8080)            │
│                                                 │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  React SPA   │  │     REST API /api/**     │ │
│  │  (embedded   │  │                          │ │
│  │   in JAR)    │  │  Auth → JWT cookie       │ │
│  └──────────────┘  │  Orgs → SF OAuth         │ │
│                    │  Modules → SF API calls  │ │
│                    └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
              │                    │
              │                    │
     PostgreSQL (prod)     Salesforce REST/Tooling API
     H2 file (dev)
```

The frontend is built and embedded into the Spring Boot JAR at Docker build time — both are served from the same origin, which means standard `SameSite=Lax` cookies work without any cross-origin workarounds.

---

## Local Development

### Prerequisites
- Java 17+
- Node 22+
- Maven (or use the included `./mvnw`)

### Backend

```bash
cd backend
cp ../env.example .env   # or set env vars manually
./mvnw spring-boot:run
# Runs on http://localhost:8080
# H2 console: http://localhost:8080/h2-console
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
# Proxies /api and /ws to localhost:8080
```

### Docker (full stack)

```bash
cp .env.example .env   # fill in your values
docker compose up
# App: http://localhost:8080
# PostgreSQL: localhost:5432
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Random 32+ char string for signing JWTs |
| `ENCRYPTION_KEY` | 32-char key for encrypting SF tokens at rest |
| `SF_CLIENT_ID` | Salesforce Connected App Consumer Key |
| `SF_CLIENT_SECRET` | Salesforce Connected App Consumer Secret |
| `SF_REDIRECT_URI` | OAuth callback URL (e.g. `https://your-app.com/api/auth/callback`) |
| `CLAUDE_API_KEY` | Anthropic API key for Org Chat |
| `DATABASE_URL` | PostgreSQL JDBC URL (prod only) |
| `DATABASE_USERNAME` | PostgreSQL username (prod only) |
| `DATABASE_PASSWORD` | PostgreSQL password (prod only) |
| `SPRING_PROFILES_ACTIVE` | `dev` or `prod` |

---

## Salesforce Setup

1. In Salesforce Setup → **App Manager** → **New Connected App**
2. Enable OAuth, add scopes: `full`, `refresh_token`, `api`
3. Set **Callback URL** to `https://your-app.com/api/auth/callback`
4. Copy **Consumer Key** → `SF_CLIENT_ID`
5. Copy **Consumer Secret** → `SF_CLIENT_SECRET`

---

## Deployment (Render)

The app deploys as a single Docker service using the root `Dockerfile`.

**Backend service (Docker):**
- Repository: this repo
- Root Directory: *(blank — uses repo root)*
- Dockerfile: `Dockerfile`
- Environment variables: see table above

**Required env vars on Render:**
```
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://...
SPRING_DATASOURCE_USERNAME=...
SPRING_DATASOURCE_PASSWORD=...
JWT_SECRET=...
ENCRYPTION_KEY=...
SF_CLIENT_ID=...
SF_CLIENT_SECRET=...
SF_REDIRECT_URI=https://<your-render-url>/api/auth/callback
CLAUDE_API_KEY=...
FRONTEND_URL=https://<your-render-url>
```

---

## What's Persisted

All module data is stored in PostgreSQL and survives restarts and re-deploys:

- **Apex Pulse** — Test runs, per-test results, coverage snapshots
- **Limit Guard** — Point-in-time limit snapshots for trend analysis
- **Org Lens** — Health scores over time, dead code findings, dependency graph
- **Deploy Pilot** — Deployment history, component details, rollback records
- **Flow Forge** — Flow invocation history, errors, overlap detections
- **Permission Pilot** — Permission snapshots, comparison diffs, violation log
- **Data Forge** — Import job history, per-row errors, saved field mapping templates
- **Org Chat** — Full session and message history (including generated SOQL + results)
- **User preferences** — Theme, accent color, active org — synced cross-browser via backend

---

## Project Structure

```
orgforge/
├── Dockerfile              # Multi-stage: builds frontend → embeds in backend JAR
├── docker-compose.yml      # Local: app + postgres + redis
├── backend/
│   ├── src/main/java/com/orgforge/
│   │   ├── core/           # Auth, config, org connections, WebSocket
│   │   └── modules/        # One package per module (limitguard, apexpulse, ...)
│   └── src/main/resources/
│       ├── application.yml
│       ├── application-dev.yml
│       ├── application-prod.yml
│       └── db/migration/   # Flyway migrations (prod)
├── frontend/
│   ├── src/
│   │   ├── core/           # Auth, store, shared components, hooks
│   │   └── modules/        # One folder per module
│   └── public/
└── salesforce/             # SFDX package (thin SF layer)
```

---
## License

This project is proprietary. See `LICENSE.txt` for details.

