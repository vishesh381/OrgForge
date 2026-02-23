package com.orgforge.core.org;

import com.orgforge.core.salesforce.SalesforceAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orgs")
@RequiredArgsConstructor
public class OrgConnectionController {

    private final OrgConnectionManager orgConnectionManager;
    private final SalesforceAuthService salesforceAuthService;

    @GetMapping
    public ResponseEntity<List<OrgConnection>> listOrgs(Authentication auth) {
        return ResponseEntity.ok(orgConnectionManager.getOrgsByUser(auth.getName()));
    }

    @GetMapping("/connect")
    public ResponseEntity<Map<String, String>> getConnectUrl(Authentication auth) {
        return ResponseEntity.ok(Map.of("url", salesforceAuthService.buildAuthUrl(auth.getName())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrgConnection> getOrg(@PathVariable UUID id) {
        return ResponseEntity.ok(orgConnectionManager.getOrg(id));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> checkStatus(@PathVariable UUID id) {
        OrgConnection org = orgConnectionManager.getOrg(id);
        return ResponseEntity.ok(Map.of(
            "connected", org.isActive(),
            "orgName", org.getOrgName() != null ? org.getOrgName() : "",
            "orgType", org.getOrgType() != null ? org.getOrgType().name() : ""
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> disconnectOrg(@PathVariable UUID id) {
        orgConnectionManager.disconnectOrg(id);
        return ResponseEntity.noContent().build();
    }
}
