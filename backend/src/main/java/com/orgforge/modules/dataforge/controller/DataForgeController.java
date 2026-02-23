package com.orgforge.modules.dataforge.controller;

import com.orgforge.core.org.OrgConnection;
import com.orgforge.core.org.OrgConnectionRepository;
import com.orgforge.modules.dataforge.model.FieldMapping;
import com.orgforge.modules.dataforge.model.ImportJob;
import com.orgforge.modules.dataforge.service.DataForgeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/data-forge")
@RequiredArgsConstructor
public class DataForgeController {

    private final DataForgeService dataForgeService;
    private final OrgConnectionRepository orgConnectionRepository;

    // -------------------------------------------------------------------------
    // SF Object Fields
    // -------------------------------------------------------------------------

    /**
     * GET /api/data-forge/objects/{objectName}/fields?orgId=...
     */
    @GetMapping("/objects/{objectName}/fields")
    public ResponseEntity<List<Map<String, Object>>> getObjectFields(
            @PathVariable String objectName,
            @RequestParam String orgId) {
        OrgConnection org = resolveOrg(orgId);
        List<Map<String, Object>> fields = dataForgeService.getObjectFields(org, objectName);
        return ResponseEntity.ok(fields);
    }

    // -------------------------------------------------------------------------
    // Import Jobs
    // -------------------------------------------------------------------------

    /**
     * GET /api/data-forge/jobs?orgId=...&page=0
     */
    @GetMapping("/jobs")
    public ResponseEntity<List<Map<String, Object>>> getJobs(
            @RequestParam String orgId,
            @RequestParam(defaultValue = "0") int page) {
        List<ImportJob> jobs = dataForgeService.getJobs(orgId, page);
        return ResponseEntity.ok(jobs.stream().map(this::mapJob).toList());
    }

    /**
     * GET /api/data-forge/jobs/{id}
     */
    @GetMapping("/jobs/{id}")
    public ResponseEntity<Map<String, Object>> getJob(@PathVariable Long id) {
        ImportJob job = dataForgeService.getJob(id);
        Map<String, Object> response = mapJob(job);
        List<Map<String, Object>> errors = job.getErrors().stream().map(e -> {
            Map<String, Object> err = new HashMap<>();
            err.put("id", e.getId());
            err.put("rowNumber", e.getRowNumber());
            err.put("errorMessage", e.getErrorMessage());
            err.put("rawData", e.getRawData());
            return err;
        }).toList();
        response.put("errors", errors);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/data-forge/jobs
     * Body: { orgId, objectName, operation, fileName, records: [...], createdBy }
     */
    @PostMapping("/jobs")
    public ResponseEntity<Map<String, Object>> createJob(
            @RequestBody Map<String, Object> request) {
        String orgId = (String) request.get("orgId");
        String objectName = (String) request.get("objectName");
        String operation = (String) request.getOrDefault("operation", "INSERT");
        String externalIdField = (String) request.get("externalIdField");
        String fileName = (String) request.getOrDefault("fileName", "upload.csv");
        String createdBy = (String) request.getOrDefault("createdBy", "user");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> records = (List<Map<String, Object>>) request.get("records");
        if (records == null) records = List.of();

        OrgConnection org = resolveOrg(orgId);
        ImportJob job = dataForgeService.createImportJob(orgId, objectName, fileName, operation, externalIdField, createdBy);

        // Kick off async processing
        dataForgeService.processImport(job.getId(), records, org);

        Map<String, Object> response = mapJob(job);
        response.put("message", "Import job started");
        return ResponseEntity.ok(response);
    }

    // -------------------------------------------------------------------------
    // Field Mappings
    // -------------------------------------------------------------------------

    /**
     * GET /api/data-forge/mappings?orgId=...&objectName=...
     */
    @GetMapping("/mappings")
    public ResponseEntity<List<Map<String, Object>>> getMappings(
            @RequestParam String orgId,
            @RequestParam String objectName) {
        List<FieldMapping> mappings = dataForgeService.getMappings(orgId, objectName);
        return ResponseEntity.ok(mappings.stream().map(this::mapFieldMapping).toList());
    }

    /**
     * POST /api/data-forge/mappings
     * Body: { orgId, objectName, mappingName, mappingJson, createdBy }
     */
    @PostMapping("/mappings")
    public ResponseEntity<Map<String, Object>> saveMapping(
            @RequestBody Map<String, Object> request) {
        String orgId = (String) request.get("orgId");
        String objectName = (String) request.get("objectName");
        String mappingName = (String) request.get("mappingName");
        String mappingJson = (String) request.get("mappingJson");
        String createdBy = (String) request.getOrDefault("createdBy", "user");

        FieldMapping saved = dataForgeService.saveMapping(orgId, objectName, mappingName, mappingJson, createdBy);
        return ResponseEntity.ok(mapFieldMapping(saved));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private OrgConnection resolveOrg(String orgId) {
        return orgConnectionRepository.findByOrgId(orgId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No active OrgConnection found for orgId: " + orgId));
    }

    private Map<String, Object> mapJob(ImportJob job) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", job.getId());
        map.put("orgId", job.getOrgId());
        map.put("objectName", job.getObjectName());
        map.put("status", job.getStatus());
        map.put("totalRecords", job.getTotalRecords());
        map.put("processedRecords", job.getProcessedRecords());
        map.put("successCount", job.getSuccessCount());
        map.put("errorCount", job.getErrorCount());
        map.put("fileName", job.getFileName());
        map.put("operation", job.getOperation());
        map.put("createdBy", job.getCreatedBy());
        map.put("createdAt", job.getCreatedAt() != null ? job.getCreatedAt().toString() : null);
        map.put("completedAt", job.getCompletedAt() != null ? job.getCompletedAt().toString() : null);
        return map;
    }

    private Map<String, Object> mapFieldMapping(FieldMapping fm) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", fm.getId());
        map.put("orgId", fm.getOrgId());
        map.put("objectName", fm.getObjectName());
        map.put("mappingName", fm.getMappingName());
        map.put("mappingJson", fm.getMappingJson());
        map.put("createdBy", fm.getCreatedBy());
        map.put("createdAt", fm.getCreatedAt() != null ? fm.getCreatedAt().toString() : null);
        return map;
    }
}
