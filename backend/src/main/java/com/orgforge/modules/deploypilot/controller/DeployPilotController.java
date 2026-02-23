package com.orgforge.modules.deploypilot.controller;

import com.orgforge.modules.deploypilot.dto.DeploymentDTO;
import com.orgforge.modules.deploypilot.model.Deployment;
import com.orgforge.modules.deploypilot.repository.DeployComponentRepository;
import com.orgforge.modules.deploypilot.service.DeployPilotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Slf4j
@RestController
@RequestMapping("/api/deploy-pilot")
@RequiredArgsConstructor
public class DeployPilotController {

    private final DeployPilotService deployPilotService;
    private final DeployComponentRepository deployComponentRepository;

    /** GET /api/deploy-pilot?orgId=...&page=0 */
    @GetMapping
    public ResponseEntity<List<DeploymentDTO>> listDeployments(
            @RequestParam String orgId,
            @RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(deployPilotService.getDeployments(orgId, page));
    }

    /** GET /api/deploy-pilot/{id}?orgId=... */
    @GetMapping("/{id}")
    public ResponseEntity<?> getDeployment(
            @PathVariable Long id,
            @RequestParam String orgId) {
        try {
            DeploymentDTO dto = deployPilotService.getDeployment(orgId, id);
            // Also attach components list in the response
            List<?> components = deployComponentRepository.findByDeploymentId(id)
                    .stream()
                    .map(c -> Map.of(
                            "id", c.getId(),
                            "componentType", c.getComponentType() != null ? c.getComponentType() : "",
                            "componentName", c.getComponentName() != null ? c.getComponentName() : "",
                            "status", c.getStatus() != null ? c.getStatus() : "",
                            "errorMessage", c.getErrorMessage() != null ? c.getErrorMessage() : ""
                    ))
                    .toList();

            Map<String, Object> response = new java.util.HashMap<>();
            response.put("deployment", dto);
            response.put("components", components);
            return ResponseEntity.ok(response);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** POST /api/deploy-pilot/sync?orgId=... */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, String>> sync(@RequestParam String orgId) {
        try {
            deployPilotService.syncDeploymentsFromSalesforce(orgId);
            return ResponseEntity.ok(Map.of("status", "synced"));
        } catch (Exception e) {
            log.error("Sync failed for orgId={}: {}", orgId, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /** POST /api/deploy-pilot/analyze-impact?orgId=...
     *  Body: { "components": ["ComponentName", ...] }
     */
    @PostMapping("/analyze-impact")
    public ResponseEntity<Map<String, Object>> analyzeImpact(
            @RequestParam String orgId,
            @RequestBody Map<String, List<String>> body) {
        List<String> components = body.getOrDefault("components", List.of());
        return ResponseEntity.ok(deployPilotService.analyzeImpact(orgId, components));
    }

    /** POST /api/deploy-pilot?orgId=...
     *  Body: { "label": "...", "validationOnly": false, "deployedBy": "..." }
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> startDeployment(
            @RequestParam String orgId,
            @RequestBody Map<String, Object> body) {
        String label = (String) body.get("label");
        boolean validationOnly = Boolean.TRUE.equals(body.get("validationOnly"));
        String deployedBy = (String) body.getOrDefault("deployedBy", "unknown");

        Deployment deployment = deployPilotService.startDeployment(orgId, label, validationOnly, deployedBy);
        return ResponseEntity.ok(Map.of(
                "id", deployment.getId(),
                "status", deployment.getStatus(),
                "label", deployment.getLabel() != null ? deployment.getLabel() : "",
                "startedAt", deployment.getStartedAt().toString()
        ));
    }

    /** POST /api/deploy-pilot/{id}/rollback?orgId=...
     *  Body: { "reason": "...", "rolledBackBy": "..." }
     */
    @PostMapping("/{id}/rollback")
    public ResponseEntity<Map<String, String>> rollback(
            @PathVariable Long id,
            @RequestParam String orgId,
            @RequestBody Map<String, String> body) {
        try {
            String reason = body.getOrDefault("reason", "");
            String rolledBackBy = body.getOrDefault("rolledBackBy", "unknown");
            deployPilotService.performRollback(orgId, id, reason, rolledBackBy);
            return ResponseEntity.ok(Map.of("status", "ROLLED_BACK"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
