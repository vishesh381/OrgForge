package com.orgforge.modules.dataforge.service;

import com.orgforge.core.org.OrgConnection;
import com.orgforge.core.salesforce.RestApiClient;
import com.orgforge.modules.dataforge.model.FieldMapping;
import com.orgforge.modules.dataforge.model.ImportError;
import com.orgforge.modules.dataforge.model.ImportJob;
import com.orgforge.modules.dataforge.repository.FieldMappingRepository;
import com.orgforge.modules.dataforge.repository.ImportJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataForgeService {

    private static final int BATCH_SIZE = 200;

    private final ImportJobRepository importJobRepository;
    private final FieldMappingRepository fieldMappingRepository;
    private final RestApiClient restApiClient;

    // -------------------------------------------------------------------------
    // SF Object Fields
    // -------------------------------------------------------------------------

    @Cacheable(value = "sfFields", key = "#org.orgId + ':' + #objectName")
    public List<Map<String, Object>> getObjectFields(OrgConnection org, String objectName) {
        log.info("Fetching fields for object {} from org {}", objectName, org.getOrgId());
        Map<?, ?> describe = restApiClient.describe(org, objectName);

        @SuppressWarnings("unchecked")
        List<Map<?, ?>> rawFields = (List<Map<?, ?>>) describe.get("fields");
        if (rawFields == null) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<?, ?> f : rawFields) {
            Map<String, Object> field = new LinkedHashMap<>();
            field.put("name", f.get("name"));
            field.put("label", f.get("label"));
            field.put("type", f.get("type"));
            Object nillable = f.get("nillable");
            Object defaultedOnCreate = f.get("defaultedOnCreate");
            boolean required = Boolean.FALSE.equals(nillable) && Boolean.FALSE.equals(defaultedOnCreate);
            field.put("required", required);
            result.add(field);
        }
        return result;
    }

    // -------------------------------------------------------------------------
    // Import Job Lifecycle
    // -------------------------------------------------------------------------

    @Transactional
    public ImportJob createImportJob(String orgId, String objectName, String fileName,
                                     String operation, String externalIdField, String createdBy) {
        ImportJob job = ImportJob.builder()
                .orgId(orgId)
                .objectName(objectName)
                .fileName(fileName)
                .operation(operation != null ? operation : "INSERT")
                .externalIdField(externalIdField)
                .status("PENDING")
                .createdBy(createdBy)
                .createdAt(LocalDateTime.now())
                .build();
        return importJobRepository.save(job);
    }

    @Async("taskExecutor")
    @Transactional
    public void processImport(Long jobId, List<Map<String, Object>> records, OrgConnection org) {
        ImportJob job = importJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("ImportJob not found: " + jobId));

        job.setStatus("PROCESSING");
        job.setTotalRecords(records.size());
        importJobRepository.save(job);

        int successCount = 0;
        int errorCount = 0;
        int processed = 0;

        List<ImportError> errors = new ArrayList<>();

        // Batch in groups of BATCH_SIZE
        for (int start = 0; start < records.size(); start += BATCH_SIZE) {
            int end = Math.min(start + BATCH_SIZE, records.size());
            List<Map<String, Object>> batch = records.subList(start, end);

            try {
                String op = job.getOperation();
                String extIdField = (job.getExternalIdField() != null && !job.getExternalIdField().isBlank())
                        ? job.getExternalIdField() : "Id";

                @SuppressWarnings("unchecked")
                List<Map<?, ?>> results;

                if ("UPSERT".equalsIgnoreCase(op) && "Id".equalsIgnoreCase(extIdField)) {
                    // Standard Id cannot be used as external ID in the PATCH URL.
                    // Split: records with a non-empty Id → UPDATE (PATCH),
                    //        records without Id          → INSERT (POST).
                    // Results are reassembled in original batch order.
                    List<Map<String, Object>> updateRecs = new ArrayList<>();
                    List<Map<String, Object>> insertRecs = new ArrayList<>();
                    List<Integer> updateIdx = new ArrayList<>();
                    List<Integer> insertIdx = new ArrayList<>();

                    for (int i = 0; i < batch.size(); i++) {
                        Map<String, Object> record = batch.get(i);
                        Object idVal = record.get("Id");
                        boolean hasId = idVal != null && !idVal.toString().isBlank();

                        Map<String, Object> typed = new LinkedHashMap<>();
                        typed.put("attributes", Map.of("type", job.getObjectName()));
                        if (hasId) {
                            typed.put("id", idVal.toString());
                            record.entrySet().stream()
                                    .filter(e -> !"Id".equals(e.getKey()))
                                    .forEach(e -> typed.put(e.getKey(), e.getValue()));
                            updateRecs.add(typed);
                            updateIdx.add(i);
                        } else {
                            record.entrySet().stream()
                                    .filter(e -> !"Id".equals(e.getKey()) && !"id".equals(e.getKey()))
                                    .forEach(e -> typed.put(e.getKey(), e.getValue()));
                            insertRecs.add(typed);
                            insertIdx.add(i);
                        }
                    }

                    // Pre-fill with a neutral "skipped" result so every index is set
                    List<Map<?, ?>> ordered = new ArrayList<>(Collections.nCopies(batch.size(), null));

                    if (!updateRecs.isEmpty()) {
                        Map<String, Object> body = new HashMap<>();
                        body.put("allOrNone", false);
                        body.put("records", updateRecs);
                        List<Map<?, ?>> upd = (List<Map<?, ?>>) (List<?>)
                                restApiClient.patchCollection(org, "/composite/sobjects", body);
                        if (upd != null) {
                            for (int i = 0; i < upd.size(); i++) ordered.set(updateIdx.get(i), upd.get(i));
                        }
                    }
                    if (!insertRecs.isEmpty()) {
                        Map<String, Object> body = new HashMap<>();
                        body.put("allOrNone", false);
                        body.put("records", insertRecs);
                        List<Map<?, ?>> ins = (List<Map<?, ?>>) (List<?>)
                                restApiClient.postCollection(org, "/composite/sobjects", body);
                        if (ins != null) {
                            for (int i = 0; i < ins.size(); i++) ordered.set(insertIdx.get(i), ins.get(i));
                        }
                    }
                    results = ordered;

                } else {
                    // INSERT, UPDATE, or UPSERT by custom external ID field
                    List<Map<String, Object>> typedBatch = new ArrayList<>();
                    for (Map<String, Object> record : batch) {
                        Map<String, Object> typed = new LinkedHashMap<>();
                        typed.put("attributes", Map.of("type", job.getObjectName()));
                        if ("INSERT".equalsIgnoreCase(op)) {
                            record.entrySet().stream()
                                    .filter(e -> !"Id".equals(e.getKey()) && !"id".equals(e.getKey()))
                                    .forEach(e -> typed.put(e.getKey(), e.getValue()));
                        } else if ("UPDATE".equalsIgnoreCase(op)) {
                            if (record.containsKey("Id") && !record.containsKey("id")) {
                                typed.put("id", record.get("Id"));
                                record.entrySet().stream()
                                        .filter(e -> !"Id".equals(e.getKey()))
                                        .forEach(e -> typed.put(e.getKey(), e.getValue()));
                            } else {
                                typed.putAll(record);
                            }
                        } else {
                            // UPSERT by custom external ID — keep all fields
                            typed.putAll(record);
                        }
                        typedBatch.add(typed);
                    }

                    Map<String, Object> requestBody = new HashMap<>();
                    requestBody.put("allOrNone", false);
                    requestBody.put("records", typedBatch);

                    if ("UPDATE".equalsIgnoreCase(op)) {
                        results = (List<Map<?, ?>>) (List<?>)
                                restApiClient.patchCollection(org, "/composite/sobjects", requestBody);
                    } else if ("UPSERT".equalsIgnoreCase(op)) {
                        // Custom external ID field — valid PATCH URL
                        results = (List<Map<?, ?>>) (List<?>)
                                restApiClient.patchCollection(org, "/composite/sobjects/" + extIdField, requestBody);
                    } else {
                        results = (List<Map<?, ?>>) (List<?>)
                                restApiClient.postCollection(org, "/composite/sobjects", requestBody);
                    }
                }

                if (results != null) {
                    for (int i = 0; i < results.size(); i++) {
                        Map<?, ?> r = results.get(i);
                        if (r == null) continue; // shouldn't happen, safety guard
                        boolean success = Boolean.TRUE.equals(r.get("success"));
                        if (success) {
                            successCount++;
                        } else {
                            errorCount++;
                            int rowNumber = start + i + 1;
                            String errorMessage = extractErrorMessage(r);
                            String rawData = serializeRecord(batch.get(i));

                            ImportError err = ImportError.builder()
                                    .rowNumber(rowNumber)
                                    .errorMessage(errorMessage)
                                    .rawData(rawData)
                                    .importJob(job)
                                    .build();
                            errors.add(err);
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Batch processing error for job {}, batch starting at {}: {}",
                        jobId, start, e.getMessage(), e);
                // Mark entire batch as errors
                for (int i = 0; i < batch.size(); i++) {
                    errorCount++;
                    int rowNumber = start + i + 1;
                    ImportError err = ImportError.builder()
                            .rowNumber(rowNumber)
                            .errorMessage(e.getMessage())
                            .rawData(serializeRecord(batch.get(i)))
                            .importJob(job)
                            .build();
                    errors.add(err);
                }
            }

            processed += batch.size();
            job.setProcessedRecords(processed);
            job.setSuccessCount(successCount);
            job.setErrorCount(errorCount);
            importJobRepository.save(job);
        }

        // Reload job and attach errors
        job = importJobRepository.findById(jobId).orElseThrow();
        job.getErrors().addAll(errors);
        job.setSuccessCount(successCount);
        job.setErrorCount(errorCount);
        job.setProcessedRecords(processed);
        job.setCompletedAt(LocalDateTime.now());
        job.setStatus(errorCount > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED");
        importJobRepository.save(job);

        log.info("Import job {} completed. Success: {}, Errors: {}", jobId, successCount, errorCount);
    }

    // -------------------------------------------------------------------------
    // Job queries
    // -------------------------------------------------------------------------

    public List<ImportJob> getJobs(String orgId, int page) {
        Page<ImportJob> result = importJobRepository
                .findByOrgIdOrderByCreatedAtDesc(orgId, PageRequest.of(page, 20));
        return result.getContent();
    }

    public ImportJob getJob(Long id) {
        return importJobRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ImportJob not found: " + id));
    }

    // -------------------------------------------------------------------------
    // Field Mappings
    // -------------------------------------------------------------------------

    @Transactional
    public FieldMapping saveMapping(String orgId, String objectName, String mappingName,
                                    String mappingJson, String createdBy) {
        Optional<FieldMapping> existing = fieldMappingRepository
                .findByOrgIdAndObjectNameAndMappingName(orgId, objectName, mappingName);

        FieldMapping mapping = existing.orElseGet(() -> FieldMapping.builder()
                .orgId(orgId)
                .objectName(objectName)
                .mappingName(mappingName)
                .createdBy(createdBy)
                .createdAt(LocalDateTime.now())
                .build());

        mapping.setMappingJson(mappingJson);
        if (existing.isEmpty()) {
            mapping.setCreatedAt(LocalDateTime.now());
        }
        return fieldMappingRepository.save(mapping);
    }

    public List<FieldMapping> getMappings(String orgId, String objectName) {
        return fieldMappingRepository.findByOrgIdAndObjectName(orgId, objectName);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private String extractErrorMessage(Map<?, ?> result) {
        Object errors = result.get("errors");
        if (errors instanceof List) {
            List<Map<?, ?>> errorList = (List<Map<?, ?>>) errors;
            if (!errorList.isEmpty()) {
                Map<?, ?> firstError = errorList.get(0);
                Object msg = firstError.get("message");
                if (msg != null) return msg.toString();
            }
        }
        return "Unknown error";
    }

    private String serializeRecord(Map<String, Object> record) {
        try {
            StringBuilder sb = new StringBuilder("{");
            record.forEach((k, v) -> sb.append('"').append(k).append("\":\"")
                    .append(v != null ? v.toString().replace("\"", "\\\"") : "")
                    .append("\","));
            if (sb.charAt(sb.length() - 1) == ',') sb.deleteCharAt(sb.length() - 1);
            sb.append("}");
            return sb.toString();
        } catch (Exception e) {
            return record.toString();
        }
    }
}
