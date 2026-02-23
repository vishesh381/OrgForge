# OrgForge Backend

## Package Structure
```
com.orgforge/
  OrgForgeApplication.java
  core/
    auth/          → JWT auth (OrgForgeUser, UserRepository, OrgForgeAuthService, AuthController, JwtTokenProvider, JwtAuthenticationFilter)
    config/        → SecurityConfig, WebSocketConfig, CacheConfig, CorsConfig, AsyncConfig
    exception/     → GlobalExceptionHandler, SalesforceApiException
    org/           → OrgConnection, OrgConnectionRepository, OrgConnectionManager, OrgConnectionController
    salesforce/    → SalesforceAuthService, SalesforceAuthController, ToolingApiClient, RestApiClient
    websocket/     → WebSocketBroker
    audit/         → AuditLog, AuditLogRepository, AuditLogService
    notification/  → NotificationService
    health/        → HealthController
  modules/
    apexpulse/     → Apex Pulse module
    limitguard/    → Limit Guard module
    orglens/       → Org Lens module
    deploypilot/   → Deploy Pilot module
    flowforge/     → Flow Forge module
    permissionpilot/ → Permission Pilot module
    dataforge/     → Data Forge module
    orgchat/       → Org Chat module
```

## Key Dependencies
- `ToolingApiClient`: call SF Tooling API — `query(org, soql)`, `get(org, path)`, `post(org, path, body)`
- `RestApiClient`: call SF REST API — `get(org, path)`, `post(org, path, body)`
- `WebSocketBroker`: broadcast to clients — `broadcast(destination, payload)`
- `OrgConnectionRepository`: resolve org — `findByOrgId(String orgId)`

## Module Controller Pattern
```java
@RestController
@RequestMapping("/api/{module-name}")
public class MyController {
    // All endpoints accept @RequestParam String orgId
    // Resolve org: orgRepo.findByOrgId(orgId).orElseThrow(...)
}
```

## Running Locally
```bash
./mvnw spring-boot:run
# API: http://localhost:8080
# H2 Console: http://localhost:8080/h2-console
```
