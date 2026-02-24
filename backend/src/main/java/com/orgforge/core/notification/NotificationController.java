package com.orgforge.core.notification;

import com.orgforge.core.org.OrgConnection;
import com.orgforge.core.org.OrgConnectionRepository;
import com.orgforge.core.salesforce.RestApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final RestApiClient restApiClient;
    private final OrgConnectionRepository orgConnectionRepository;

    /**
     * GET /api/notifications?orgId=...
     * Fetches Salesforce platform (Connect API) notifications for the connected user.
     * Falls back to empty list on any error — org may not have Chatter enabled.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getSalesforceNotifications(
            @RequestParam String orgId) {

        OrgConnection org = orgConnectionRepository.findByOrgId(orgId)
                .orElse(null);

        if (org == null) {
            return ResponseEntity.ok(Map.of("notifications", List.of(), "source", "orgforge"));
        }

        String url = org.getInstanceUrl()
                + "/services/data/v" + org.getApiVersion()
                + "/connect/notifications";

        try {
            Map<?, ?> result = restApiClient.get(org, url);
            // Normalise: SF returns { notifications: [...], nextPageUrl: ... }
            Object rawList = result != null ? result.get("notifications") : null;
            List<?> sfNotifications = rawList instanceof List<?> l ? l : List.of();

            // Map to a clean structure for the frontend
            List<Map<String, Object>> mapped = new ArrayList<>();
            for (Object item : sfNotifications) {
                if (!(item instanceof Map<?, ?> n)) continue;
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id",       n.get("id"));
                entry.put("subject",  n.get("subject"));
                entry.put("body",     n.get("body"));
                entry.put("read",     Boolean.TRUE.equals(n.get("read")));
                entry.put("seen",     Boolean.TRUE.equals(n.get("seen")));
                entry.put("date",     n.get("lastModifiedDate"));
                entry.put("type",     "salesforce");
                // Try to extract target record name/url
                Object target = n.get("target");
                if (target instanceof Map<?, ?> t) {
                    entry.put("targetId",  t.get("id"));
                    entry.put("targetUrl", t.get("url"));
                }
                mapped.add(entry);
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("notifications", mapped);
            resp.put("source", "salesforce");
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            log.warn("Could not fetch SF notifications for org {}: {}", orgId, e.getMessage());
            // Org may not have Chatter / Connect enabled — return empty gracefully
            return ResponseEntity.ok(Map.of("notifications", List.of(), "source", "salesforce", "error", e.getMessage()));
        }
    }
}
