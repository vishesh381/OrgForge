package com.orgforge.modules.flowforge.service;

import com.orgforge.core.org.OrgConnection;
import com.orgforge.core.org.OrgConnectionRepository;
import com.orgforge.core.salesforce.RestApiClient;
import com.orgforge.core.salesforce.ToolingApiClient;
import com.orgforge.modules.flowforge.model.FlowOverlap;
import com.orgforge.modules.flowforge.model.FlowRun;
import com.orgforge.modules.flowforge.repository.FlowOverlapRepository;
import com.orgforge.modules.flowforge.repository.FlowRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FlowForgeService {

    private final FlowRunRepository flowRunRepository;
    private final FlowOverlapRepository flowOverlapRepository;
    private final OrgConnectionRepository orgConnectionRepository;
    private final ToolingApiClient toolingApiClient;
    private final RestApiClient restApiClient;

    // -------------------------------------------------------------------------
    // Dashboard stats
    // -------------------------------------------------------------------------

    @Cacheable(value = "flowStats", key = "#orgId")
    public Map<String, Object> getDashboardStats(String orgId) {
        OrgConnection org = resolveOrg(orgId);

        long errorCount = flowRunRepository.countByOrgIdAndStatus(orgId, "Error")
                + flowRunRepository.countByOrgIdAndStatus(orgId, "Fault");

        long totalRuns = flowRunRepository.findByOrgIdOrderByCreatedAtDesc(orgId, Pageable.unpaged()).getTotalElements();

        double faultRate = totalRuns > 0
                ? Math.round((errorCount * 100.0 / totalRuns) * 100.0) / 100.0
                : 0.0;

        long overlapsDetected = flowOverlapRepository.findByOrgIdOrderByDetectedAtDesc(orgId).size();

        // Fetch total active flows — use FlowDefinition (API v57+)
        long totalFlows = 0;
        try {
            Map<?, ?> result = restApiClient.query(org,
                    "SELECT COUNT() FROM FlowDefinitionView WHERE IsActive = true");
            if (result != null && result.get("totalSize") instanceof Number n) {
                totalFlows = n.longValue();
            }
            log.info("FlowDefinition COUNT for org {}: {}", orgId, totalFlows);
        } catch (Exception e) {
            log.warn("Could not fetch flow count for org {}: {}", orgId, e.getMessage());
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalFlows", totalFlows);
        stats.put("errorCount", errorCount);
        stats.put("faultRate", faultRate);
        stats.put("overlapsDetected", overlapsDetected);
        return stats;
    }

    // -------------------------------------------------------------------------
    // Flow runs
    // -------------------------------------------------------------------------

    public List<FlowRun> getFlowRuns(String orgId, String status, int page) {
        Pageable pageable = PageRequest.of(page, 20);
        if (status != null && !status.isBlank() && !"All".equalsIgnoreCase(status)) {
            return flowRunRepository.findByOrgIdAndStatusOrderByCreatedAtDesc(orgId, status, pageable);
        }
        return flowRunRepository.findByOrgIdOrderByCreatedAtDesc(orgId, pageable).getContent();
    }

    @Transactional(readOnly = true)
    public FlowRun getFlowRunDetail(Long id) {
        FlowRun run = flowRunRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("FlowRun not found: " + id));
        // Force-load errors while still in transaction context
        run.getErrors().size();
        return run;
    }

    // -------------------------------------------------------------------------
    // Overlap detection
    // -------------------------------------------------------------------------

    @Transactional
    @Caching(
        evict = @CacheEvict(value = "flowStats", key = "#orgId"),
        cacheable = @Cacheable(value = "overlaps", key = "#orgId")
    )
    public List<FlowOverlap> detectOverlaps(String orgId) {
        OrgConnection org = resolveOrg(orgId);

        Map<?, ?> result = restApiClient.query(org,
                "SELECT Id, Label, TriggerType FROM FlowDefinitionView WHERE IsActive = true");

        List<?> records = result != null ? (List<?>) result.get("records") : Collections.emptyList();

        // Group flows by ProcessType to detect multiple flows of the same type
        Map<String, List<String>> grouped = new LinkedHashMap<>();
        if (records != null) {
            for (Object rec : records) {
                if (!(rec instanceof Map<?, ?> flow)) continue;
                Object rawProcessType = flow.get("TriggerType");
                Object rawLabel = flow.get("Label");
                String processType = rawProcessType != null ? String.valueOf(rawProcessType) : "";
                String apiName = rawLabel != null ? String.valueOf(rawLabel) : "";

                if (processType.isBlank() || "null".equals(processType)) {
                    continue;
                }

                grouped.computeIfAbsent(processType, k -> new ArrayList<>()).add(apiName);
            }
        }

        // Delete existing overlaps for this org before saving fresh ones
        List<FlowOverlap> existing = flowOverlapRepository.findByOrgIdOrderByDetectedAtDesc(orgId);
        flowOverlapRepository.deleteAll(existing);

        List<FlowOverlap> overlaps = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Map.Entry<String, List<String>> entry : grouped.entrySet()) {
            List<String> flows = entry.getValue();
            if (flows.size() <= 1) continue;

            String objectName = entry.getKey();
            String triggerEvent = entry.getKey();

            String riskLevel;
            if (flows.size() > 3) {
                riskLevel = "HIGH";
            } else if (flows.size() >= 2) {
                riskLevel = "MEDIUM";
            } else {
                riskLevel = "LOW";
            }

            FlowOverlap overlap = FlowOverlap.builder()
                    .orgId(orgId)
                    .objectName(objectName)
                    .triggerEvent(triggerEvent)
                    .flowNames(String.join(", ", flows))
                    .riskLevel(riskLevel)
                    .detectedAt(now)
                    .build();

            overlaps.add(flowOverlapRepository.save(overlap));
        }

        return overlaps;
    }

    // -------------------------------------------------------------------------
    // Flow invocation
    // -------------------------------------------------------------------------

    public List<Map<String, Object>> getFlowInputVariables(String orgId, String invocableApiName) {
        OrgConnection org = resolveOrg(orgId);
        String url = org.getInstanceUrl() + "/services/data/v" + org.getApiVersion()
                + "/actions/custom/flow/" + invocableApiName;
        try {
            Map<?, ?> result = restApiClient.get(org, url);
            if (result == null) return Collections.emptyList();
            Object inputs = result.get("inputs");
            if (!(inputs instanceof List<?>)) return Collections.emptyList();
            List<Map<String, Object>> vars = new ArrayList<>();
            for (Object item : (List<?>) inputs) {
                if (!(item instanceof Map<?, ?> m)) continue;
                log.debug("Raw flow input variable: {}", m);

                // Salesforce returns type info in multiple ways depending on API version:
                // 1. dataType="String", type="String", sobjectType=null  (scalar)
                // 2. dataType=null, type="sobjecttype", sobjectType="Contact"  (SObject)
                // 3. dataType="Contact", type="Contact", sobjectType=null  (SObject, type IS the name)
                String rawDataType = m.get("dataType") != null ? m.get("dataType").toString() : null;
                String rawType     = m.get("type")     != null ? m.get("type").toString()     : null;
                // SF uses "sObjectType" (capital O) — also check lowercase variant for safety
                String rawSobj = m.get("sObjectType") != null ? m.get("sObjectType").toString()
                               : m.get("sobjectType") != null ? m.get("sobjectType").toString() : null;

                // Resolve effective type exposed to frontend
                String effectiveType;
                String effectiveSobjectType = rawSobj;

                if ("sobject".equalsIgnoreCase(rawType) || "sobjecttype".equalsIgnoreCase(rawType)
                        || "sobject".equalsIgnoreCase(rawDataType) || "sobjecttype".equalsIgnoreCase(rawDataType)) {
                    // SF returns type=SOBJECT or type=sobjecttype for SObject inputs
                    effectiveType = "SObject";
                } else if (rawDataType != null && rawDataType.matches("[A-Z][a-zA-Z0-9_]+")
                        && !List.of("String","Number","Integer","Double","Boolean","Date","DateTime",
                                    "Currency","Percent","Reference","Long","Email","Phone","URL",
                                    "TextArea","Picklist","MultiPicklist","Base64").contains(rawDataType)) {
                    // Case 3: dataType is the SObject name (e.g. "Contact", "Account", "My_Custom__c")
                    effectiveType = "SObject";
                    if (effectiveSobjectType == null) effectiveSobjectType = rawDataType;
                } else {
                    effectiveType = rawDataType != null ? rawDataType : (rawType != null ? rawType : "String");
                }

                Map<String, Object> v = new LinkedHashMap<>();
                v.put("name", m.get("name"));
                v.put("label", m.get("label"));
                v.put("description", m.get("description"));
                v.put("required", m.get("required"));
                v.put("type", effectiveType);
                v.put("sobjectType", effectiveSobjectType);
                log.debug("Resolved input var '{}': type={}, sobjectType={}", m.get("name"), effectiveType, effectiveSobjectType);
                vars.add(v);
            }
            return vars;
        } catch (Exception e) {
            log.error("Failed to get input variables for flow {}: {}", invocableApiName, e.getMessage(), e);
            throw new RuntimeException("Failed to get flow inputs: " + e.getMessage(), e);
        }
    }

    @Transactional
    @CacheEvict(value = "flowStats", key = "#orgId")
    public FlowRun invokeFlow(String orgId, String flowApiName, String flowLabel,
                              Map<String, Object> inputValues) {
        OrgConnection org = resolveOrg(orgId);
        LocalDateTime startedAt = LocalDateTime.now();
        long startMs = System.currentTimeMillis();

        String status;
        String errorMessage = null;

        try {
            Map<String, Object> inputRecord = inputValues != null ? new HashMap<>(inputValues) : new HashMap<>();
            Map<String, Object> body = new HashMap<>();
            body.put("inputs", List.of(inputRecord));

            @SuppressWarnings("unchecked")
            List<Map<?, ?>> results = (List<Map<?, ?>>) (List<?>)
                    restApiClient.postCollection(org, "/actions/custom/flow/" + flowApiName, body);

            boolean success = true;
            if (results != null && !results.isEmpty()) {
                Map<?, ?> r = results.get(0);
                Boolean isSuccess = (Boolean) r.get("isSuccess");
                success = Boolean.TRUE.equals(isSuccess);
                if (!success) {
                    Object errors = r.get("errors");
                    if (errors instanceof List<?> errList && !errList.isEmpty()) {
                        Object err = errList.get(0);
                        if (err instanceof Map<?, ?> errMap) {
                            errorMessage = String.valueOf(errMap.get("message"));
                        }
                    }
                    if (errorMessage == null) errorMessage = "Flow invocation failed";
                }
            }
            status = success ? "Success" : "Error";
        } catch (org.springframework.web.client.HttpClientErrorException hce) {
            // Salesforce returned 4xx — extract readable message from response body
            status = "Error";
            errorMessage = parseSfErrorMessage(hce.getResponseBodyAsString());
            log.warn("Salesforce rejected flow invocation for {} in org {}: {}",
                    flowApiName, orgId, hce.getResponseBodyAsString());
        } catch (Exception e) {
            status = "Error";
            errorMessage = e.getMessage();
            log.error("Failed to invoke flow {} for org {}: {}", flowApiName, orgId, e.getMessage(), e);
        }

        long durationMs = System.currentTimeMillis() - startMs;
        FlowRun run = FlowRun.builder()
                .orgId(orgId)
                .flowName(flowLabel != null && !flowLabel.isBlank() ? flowLabel : flowApiName)
                .flowType("AutoLaunchedFlow")
                .flowId(flowApiName)
                .status(status)
                .errorMessage(errorMessage)
                .startedAt(startedAt)
                .durationMs(durationMs)
                .triggeredBy("OrgForge")
                .createdAt(LocalDateTime.now())
                .build();

        return flowRunRepository.save(run);
    }

    public List<FlowOverlap> getOverlaps(String orgId) {
        return flowOverlapRepository.findByOrgIdOrderByDetectedAtDesc(orgId);
    }

    // -------------------------------------------------------------------------
    // Analytics
    // -------------------------------------------------------------------------

    public List<Map<String, Object>> getFlowAnalytics(String orgId, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<FlowRun> runs = flowRunRepository
                .findByOrgIdOrderByCreatedAtDesc(orgId, Pageable.unpaged())
                .stream()
                .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().isAfter(since))
                .collect(Collectors.toList());

        // Group by date (yyyy-MM-dd)
        Map<LocalDate, long[]> byDate = new TreeMap<>();
        for (FlowRun run : runs) {
            LocalDate date = run.getCreatedAt().toLocalDate();
            long[] counts = byDate.computeIfAbsent(date, k -> new long[]{0, 0});
            String status = run.getStatus();
            if ("Error".equalsIgnoreCase(status) || "Fault".equalsIgnoreCase(status)) {
                counts[1]++;
            } else {
                counts[0]++;
            }
        }

        List<Map<String, Object>> analytics = new ArrayList<>();
        for (Map.Entry<LocalDate, long[]> entry : byDate.entrySet()) {
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", entry.getKey().toString());
            point.put("success", entry.getValue()[0]);
            point.put("error", entry.getValue()[1]);
            analytics.add(point);
        }
        return analytics;
    }

    // -------------------------------------------------------------------------
    // Flows list (live from Salesforce)
    // -------------------------------------------------------------------------

    public List<Map<String, Object>> getFlows(String orgId) {
        OrgConnection org = resolveOrg(orgId);
        // FlowDefinition has one record per unique flow (API v57+).
        // ActiveVersionId != null means the flow has an active version.
        String soql = "SELECT Id, Label, ApiName, ProcessType, TriggerType FROM FlowDefinitionView WHERE IsActive = true LIMIT 500";
        log.info("Fetching flows for org {} via FlowDefinitionView", orgId);
        try {
            Map<?, ?> result = restApiClient.query(org, soql);
            log.info("FlowDefinitionView query result: totalSize={}", result != null ? result.get("totalSize") : "null");

            // Fetch shortName→fullName map from Salesforce invocable actions API
            Map<String, String> invocableMap = fetchInvocableFlowNames(org);

            List<?> records = result != null ? (List<?>) result.get("records") : Collections.emptyList();
            List<Map<String, Object>> flows = new ArrayList<>();
            if (records != null) {
                for (Object rec : records) {
                    if (!(rec instanceof Map<?, ?> r)) continue;
                    String apiName = r.get("ApiName") != null ? String.valueOf(r.get("ApiName")) : null;
                    Map<String, Object> flow = new LinkedHashMap<>();
                    flow.put("id", r.get("Id"));
                    flow.put("label", r.get("Label"));
                    flow.put("apiName", apiName);
                    flow.put("processType", r.get("ProcessType"));
                    flow.put("triggerType", r.get("TriggerType"));
                    flow.put("status", "Active");
                    String invocableApiName = apiName != null ? invocableMap.get(apiName) : null;
                    flow.put("invocable", invocableApiName != null);
                    flow.put("invocableApiName", invocableApiName); // full namespaced name for POST
                    flows.add(flow);
                }
            }
            long actualInvocable = flows.stream().filter(f -> Boolean.TRUE.equals(f.get("invocable"))).count();
            log.info("Returning {} flows ({} invocable) for org {}", flows.size(), actualInvocable, orgId);
            return flows;
        } catch (Exception e) {
            log.error("Failed to fetch flows for org {}: {}", orgId, e.getMessage(), e);
            throw e;
        }
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    /**
     * Registers a flow action name into the map:
     *  key   = short name without namespace (e.g. "CreateSalesPA")
     *  value = full name as Salesforce expects for invocation (e.g. "sales_sfa_flows__CreateSalesPA")
     * FlowDefinitionView.ApiName returns the short form, so we key by short name
     * but invoke using the full namespaced name.
     */
    private void addInvocableName(Map<String, String> map, Object raw) {
        if (raw == null) return;
        String fullName = raw.toString();
        map.put(fullName, fullName); // also allow matching by full name
        int nsIdx = fullName.indexOf("__");
        if (nsIdx > 0) {
            String shortName = fullName.substring(nsIdx + 2);
            map.put(shortName, fullName); // short name → full name for invocation
        }
    }

    /**
     * Returns a map of shortName → fullInvocableName from GET /actions/custom/flow.
     * FlowDefinitionView.ApiName (short) is used as the key;
     * the full namespaced name is the value to use in the POST invocation URL.
     */
    private Map<String, String> fetchInvocableFlowNames(OrgConnection org) {
        String url = org.getInstanceUrl()
                + "/services/data/v" + org.getApiVersion()
                + "/actions/custom/flow";
        Map<String, String> nameMap = new HashMap<>();

        // Try array format first: [...] where each item has a "name" field
        try {
            List<?> list = restApiClient.getList(org, url);
            if (list != null) {
                for (Object item : list) {
                    if (item instanceof Map<?, ?> m) {
                        addInvocableName(nameMap, m.get("name"));
                    }
                }
                log.info("Invocable flows (array format): {} entries for org {}", nameMap.size(), org.getOrgId());
                return nameMap;
            }
        } catch (Exception arrayEx) {
            log.debug("Array format failed for invocable flows: {}", arrayEx.getMessage());
        }

        // Try map format: {"actions": [...]} or {"FlowApiName": {...}, ...}
        try {
            Map<?, ?> result = restApiClient.get(org, url);
            if (result != null) {
                Object actions = result.get("actions");
                if (actions instanceof List<?> actionList) {
                    for (Object item : actionList) {
                        if (item instanceof Map<?, ?> m) {
                            addInvocableName(nameMap, m.get("name"));
                        }
                    }
                } else {
                    result.keySet().forEach(k -> addInvocableName(nameMap, k));
                }
                log.info("Invocable flows (map format): {} entries for org {}", nameMap.size(), org.getOrgId());
            }
        } catch (Exception mapEx) {
            log.warn("Could not fetch invocable flow list for org {}: {}", org.getOrgId(), mapEx.getMessage());
        }

        return nameMap;
    }

    // -------------------------------------------------------------------------
    // Record lookup (for REFERENCE-type flow inputs)
    // -------------------------------------------------------------------------

    /**
     * Searches Salesforce records of {@code sobjectType} matching {@code q}.
     * Smart detection:
     *  - If q looks like a Salesforce ID (15 or 18 alphanumeric chars) → search by Id
     *  - Otherwise → search by Name LIKE '%q%'
     * Returns up to 10 results as [{id, name}].
     */
    public List<Map<String, Object>> lookupRecords(String orgId, String sobjectType, String q) {
        if (sobjectType == null || sobjectType.isBlank() || q == null || q.isBlank()) {
            return Collections.emptyList();
        }
        // Validate sobjectType — only letters, digits, underscores (no injection)
        if (!sobjectType.matches("[a-zA-Z][a-zA-Z0-9_]*")) {
            throw new IllegalArgumentException("Invalid sobjectType: " + sobjectType);
        }
        OrgConnection org = resolveOrg(orgId);

        // Escape single quotes to prevent SOQL injection
        String safe = q.replace("'", "\\'");
        String soql;
        if (q.matches("[a-zA-Z0-9]{15}|[a-zA-Z0-9]{18}")) {
            // Looks like an SF record ID — search by Id
            soql = "SELECT Id, Name FROM " + sobjectType + " WHERE Id = '" + safe + "' LIMIT 1";
        } else {
            soql = "SELECT Id, Name FROM " + sobjectType + " WHERE Name LIKE '%" + safe + "%' LIMIT 10";
        }

        try {
            Map<?, ?> result = restApiClient.query(org, soql);
            List<?> records = result != null ? (List<?>) result.get("records") : null;
            if (records == null) return Collections.emptyList();
            List<Map<String, Object>> out = new ArrayList<>();
            for (Object rec : records) {
                if (!(rec instanceof Map<?, ?> r)) continue;
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", r.get("Id"));
                item.put("name", r.get("Name") != null ? r.get("Name") : r.get("Id"));
                out.add(item);
            }
            return out;
        } catch (Exception e) {
            log.warn("Lookup failed for {} q='{}': {}", sobjectType, q, e.getMessage());
            // Surface a readable message rather than a 500
            throw new RuntimeException("Lookup failed: " + e.getMessage(), e);
        }
    }

    private String parseSfErrorMessage(String responseBody) {
        try {
            int idx = responseBody.indexOf("\"message\":\"");
            if (idx >= 0) {
                int start = idx + 11;
                int end = responseBody.indexOf('"', start);
                if (end > start) return responseBody.substring(start, end);
            }
        } catch (Exception ignored) {}
        return "Flow invocation failed";
    }

    private OrgConnection resolveOrg(String orgId) {
        return orgConnectionRepository.findByOrgId(orgId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No active OrgConnection found for orgId: " + orgId));
    }
}
