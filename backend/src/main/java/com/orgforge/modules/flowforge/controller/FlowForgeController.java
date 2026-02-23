package com.orgforge.modules.flowforge.controller;

import com.orgforge.modules.flowforge.model.FlowOverlap;
import com.orgforge.modules.flowforge.model.FlowRun;
import com.orgforge.modules.flowforge.service.FlowForgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/flow-forge")
@RequiredArgsConstructor
public class FlowForgeController {

    private final FlowForgeService flowForgeService;

    /** GET /api/flow-forge?orgId=... */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getDashboardStats(
            @RequestParam String orgId) {
        return ResponseEntity.ok(flowForgeService.getDashboardStats(orgId));
    }

    /** GET /api/flow-forge/runs?orgId=...&status=...&page=0 */
    @GetMapping("/runs")
    public ResponseEntity<List<FlowRun>> getFlowRuns(
            @RequestParam String orgId,
            @RequestParam(required = false, defaultValue = "") String status,
            @RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(flowForgeService.getFlowRuns(orgId, status, page));
    }

    /** GET /api/flow-forge/runs/{id} */
    @GetMapping("/runs/{id}")
    public ResponseEntity<FlowRun> getFlowRunDetail(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(flowForgeService.getFlowRunDetail(id));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** POST /api/flow-forge/detect-overlaps?orgId=... */
    @PostMapping("/detect-overlaps")
    public ResponseEntity<List<FlowOverlap>> detectOverlaps(
            @RequestParam String orgId) {
        return ResponseEntity.ok(flowForgeService.detectOverlaps(orgId));
    }

    /** GET /api/flow-forge/overlaps?orgId=... */
    @GetMapping("/overlaps")
    public ResponseEntity<List<FlowOverlap>> getOverlaps(
            @RequestParam String orgId) {
        return ResponseEntity.ok(flowForgeService.getOverlaps(orgId));
    }

    /** GET /api/flow-forge/flows?orgId=... */
    @GetMapping("/flows")
    public ResponseEntity<List<Map<String, Object>>> getFlows(
            @RequestParam String orgId) {
        return ResponseEntity.ok(flowForgeService.getFlows(orgId));
    }

    /** GET /api/flow-forge/flows/inputs?orgId=...&apiName=... */
    @GetMapping("/flows/inputs")
    public ResponseEntity<List<Map<String, Object>>> getFlowInputs(
            @RequestParam String orgId,
            @RequestParam String apiName) {
        return ResponseEntity.ok(flowForgeService.getFlowInputVariables(orgId, apiName));
    }

    /** POST /api/flow-forge/flows/invoke?orgId=... */
    @PostMapping("/flows/invoke")
    public ResponseEntity<?> invokeFlow(
            @RequestParam String orgId,
            @RequestBody Map<String, Object> body) {
        String apiName = (String) body.get("apiName");
        String label = (String) body.get("label");
        if (apiName == null || apiName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "apiName is required"));
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> inputs = body.get("inputs") instanceof Map<?, ?>
                ? (Map<String, Object>) body.get("inputs") : new HashMap<>();
        return ResponseEntity.ok(flowForgeService.invokeFlow(orgId, apiName, label, inputs));
    }

    /** GET /api/flow-forge/flows/lookup?orgId=...&sobjectType=Account&q=Acme */
    @GetMapping("/flows/lookup")
    public ResponseEntity<?> lookupRecords(
            @RequestParam String orgId,
            @RequestParam String sobjectType,
            @RequestParam String q) {
        try {
            return ResponseEntity.ok(flowForgeService.lookupRecords(orgId, sobjectType, q));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /** GET /api/flow-forge/analytics?orgId=...&days=30 */
    @GetMapping("/analytics")
    public ResponseEntity<List<Map<String, Object>>> getAnalytics(
            @RequestParam String orgId,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(flowForgeService.getFlowAnalytics(orgId, days));
    }
}
