package com.orgforge.modules.apexpulse.service;

import com.orgforge.core.org.OrgConnection;
import com.orgforge.modules.apexpulse.dto.ApexTestClassDTO;
import com.orgforge.modules.apexpulse.dto.CodeCoverageDTO;
import com.orgforge.modules.apexpulse.dto.OrgStatsDTO;
import com.orgforge.modules.apexpulse.dto.TestResultDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Calls the Salesforce Tooling API on behalf of a given OrgConnection.
 * All methods accept an {@link OrgConnection} so they can be invoked for any
 * connected org without relying on a session-scoped auth service.
 */
@Service
public class SalesforceToolingService {

    private static final Logger log = LoggerFactory.getLogger(SalesforceToolingService.class);
    private static final String API_VERSION = "v59.0";

    private final RestTemplate restTemplate = new RestTemplate();

    // -------------------------------------------------------------------------
    // Low-level Tooling API call
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    public Map<String, Object> queryToolingApi(OrgConnection org, String soql) {
        String url = org.getInstanceUrl()
                + "/services/data/" + API_VERSION + "/tooling/query?q="
                + soql.replace(" ", "+");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(org.getAccessToken());
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            return response.getBody();
        } catch (RestClientException e) {
            throw new RuntimeException("Tooling API query failed: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Business-level methods
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    @Cacheable(value = "testClasses", key = "#org.orgId")
    public List<ApexTestClassDTO> getTestClasses(OrgConnection org) {
        // Body cannot be filtered in a WHERE clause — select it and filter in Java.
        String soql = "SELECT Id, Name, NamespacePrefix, Body FROM ApexClass "
                + "WHERE Status = 'Active' ORDER BY Name";
        Map<String, Object> result = queryToolingApi(org, soql);
        List<Map<String, Object>> records = (List<Map<String, Object>>) result.get("records");
        if (records == null) return List.of();

        return records.stream()
                .filter(r -> {
                    String body = (String) r.get("Body");
                    if (body == null) return false;
                    String lower = body.toLowerCase();
                    return lower.contains("@istest") || lower.contains("testmethod");
                })
                .map(r -> new ApexTestClassDTO(
                        (String) r.get("Id"),
                        (String) r.get("Name"),
                        (String) r.get("NamespacePrefix")
                ))
                .toList();
    }

    @SuppressWarnings("unchecked")
    @Cacheable(value = "orgStats", key = "#org.orgId")
    public OrgStatsDTO getOrgStats(OrgConnection org) {
        String totalSoql = "SELECT COUNT() FROM ApexClass WHERE Status = 'Active'";
        Map<String, Object> totalResult = queryToolingApi(org, totalSoql);
        int totalClasses = totalResult.get("size") != null
                ? ((Number) totalResult.get("size")).intValue() : 0;

        List<ApexTestClassDTO> testClasses = getTestClasses(org);
        String orgName = org.getOrgName() != null ? org.getOrgName() : "";

        return new OrgStatsDTO(totalClasses, testClasses.size(), orgName);
    }

    @SuppressWarnings("unchecked")
    public String runTestsAsync(OrgConnection org, List<String> classIds) {
        String url = org.getInstanceUrl()
                + "/services/data/" + API_VERSION + "/tooling/runTestsAsynchronous";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(org.getAccessToken());
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("classids", String.join(",", classIds));

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            String testRunId = response.getBody();
            if (testRunId != null) {
                testRunId = testRunId.replace("\"", "");
            }
            return testRunId;
        } catch (RestClientException e) {
            throw new RuntimeException("Failed to start async test run: " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getTestQueueStatus(OrgConnection org, String testRunId) {
        String soql = "SELECT Id, Status, ApexClassId, TestRunResultId "
                + "FROM ApexTestQueueItem WHERE ParentJobId = '" + testRunId + "'";
        return queryToolingApi(org, soql);
    }

    @SuppressWarnings("unchecked")
    public List<TestResultDTO> getTestResults(OrgConnection org, String testRunId) {
        String soql = "SELECT ApexClass.Name, MethodName, Outcome, Message, StackTrace, RunTime "
                + "FROM ApexTestResult WHERE AsyncApexJobId = '" + testRunId + "' "
                + "ORDER BY ApexClass.Name, MethodName";
        Map<String, Object> result = queryToolingApi(org, soql);
        List<Map<String, Object>> records = (List<Map<String, Object>>) result.get("records");
        if (records == null) return List.of();

        return records.stream().map(r -> {
            Map<String, Object> apexClass = (Map<String, Object>) r.get("ApexClass");
            String className = apexClass != null ? (String) apexClass.get("Name") : "Unknown";
            Number runTime = (Number) r.get("RunTime");
            return new TestResultDTO(
                    className,
                    (String) r.get("MethodName"),
                    (String) r.get("Outcome"),
                    (String) r.get("Message"),
                    (String) r.get("StackTrace"),
                    runTime != null ? runTime.longValue() : 0
            );
        }).toList();
    }

    @SuppressWarnings("unchecked")
    public List<CodeCoverageDTO> getCodeCoverage(OrgConnection org, String testRunId) {
        String soql = "SELECT ApexClassOrTrigger.Name, NumLinesCovered, NumLinesUncovered "
                + "FROM ApexCodeCoverage WHERE ApexTestClassId IN "
                + "(SELECT ApexClassId FROM ApexTestQueueItem WHERE ParentJobId = '" + testRunId + "') "
                + "ORDER BY ApexClassOrTrigger.Name";
        try {
            Map<String, Object> result = queryToolingApi(org, soql);
            List<Map<String, Object>> records = (List<Map<String, Object>>) result.get("records");
            if (records == null) return List.of();

            return records.stream().map(r -> {
                Map<String, Object> apexClassOrTrigger = (Map<String, Object>) r.get("ApexClassOrTrigger");
                String name = apexClassOrTrigger != null
                        ? (String) apexClassOrTrigger.get("Name") : "Unknown";
                int covered = ((Number) r.getOrDefault("NumLinesCovered", 0)).intValue();
                int uncovered = ((Number) r.getOrDefault("NumLinesUncovered", 0)).intValue();
                int total = covered + uncovered;
                double pct = total > 0 ? (covered * 100.0 / total) : 0;
                return new CodeCoverageDTO(name, covered, uncovered, Math.round(pct * 100.0) / 100.0);
            }).toList();
        } catch (Exception e) {
            log.warn("Could not fetch code coverage: {}", e.getMessage());
            return List.of();
        }
    }
}
