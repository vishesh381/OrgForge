package com.orgforge.modules.orgchat.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
public class ClaudeAiService {

    @Value("${claude.api-key}")
    private String apiKey;

    @Value("${claude.model}")
    private String model;

    private static final String CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

    /**
     * Generates a SOQL query from a natural language question using Claude AI.
     *
     * @param userQuestion     the natural language question from the user
     * @param orgSchemaContext a list of sObject names available in the org
     * @return a valid SOQL query string
     */
    public String generateSoql(String userQuestion, String orgSchemaContext) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            String systemPrompt = "You are a Salesforce SOQL expert. Given any question about a Salesforce org, " +
                    "generate a valid SOQL query that answers it. Return ONLY the SOQL query — no explanation, no markdown, no code blocks. " +
                    "The query must be a single executable SELECT statement.\n\n" +
                    "CRITICAL SOQL RULES — violations cause runtime errors:\n" +
                    "1. COUNT() with no argument is ONLY valid alone without GROUP BY: SELECT COUNT() FROM Lead\n" +
                    "   When using GROUP BY, always use COUNT(Id): SELECT LeadSource, COUNT(Id) FROM Lead GROUP BY LeadSource\n" +
                    "2. Never mix aggregate functions (COUNT, SUM, AVG, MAX, MIN) with non-aggregated fields unless those fields are in GROUP BY.\n" +
                    "3. Relationship fields use dot notation: Account.Name, Owner.Email — never JOIN.\n" +
                    "4. Always add LIMIT (max 2000) unless using COUNT() alone.\n" +
                    "5. Date literals: LAST_N_DAYS:30, THIS_MONTH, LAST_YEAR — no quotes around them.\n\n" +
                    "Key sObjects for common questions:\n" +
                    "- Org details / org info / org name / org type: SELECT Id, Name, OrganizationType, InstanceName, IsSandbox FROM Organization LIMIT 1\n" +
                    "- Current user / my username / who am I: SELECT Id, Name, Username, Email, Profile.Name FROM User WHERE Id = :$User.Id LIMIT 1\n" +
                    "- All users / list users: SELECT Id, Name, Username, Email, IsActive FROM User ORDER BY Name LIMIT 50\n" +
                    "- Profiles: SELECT Id, Name FROM Profile ORDER BY Name\n" +
                    "- Roles: SELECT Id, Name, DeveloperName FROM UserRole ORDER BY Name\n" +
                    "- Installed packages: SELECT Id, SubscriberPackage.Name, VersionNumber FROM InstalledSubscriberPackage\n\n" +
                    "If a question cannot be answered with SOQL (e.g. Apex code logic, flow internals, debug logs), " +
                    "respond with a single sentence explaining what SOQL cannot retrieve and suggest what to do instead.\n\n" +
                    "Schema context: " + orgSchemaContext;

            HttpHeaders headers = new HttpHeaders();
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", "2023-06-01");
            headers.setContentType(MediaType.APPLICATION_JSON);

            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            userMessage.put("content", userQuestion);
            messages.add(userMessage);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("max_tokens", 500);
            requestBody.put("system", systemPrompt);
            requestBody.put("messages", messages);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    CLAUDE_API_URL,
                    HttpMethod.POST,
                    request,
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new RuntimeException("Empty response from Claude API");
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) responseBody.get("content");
            if (content == null || content.isEmpty()) {
                throw new RuntimeException("No content in Claude API response");
            }

            String soql = (String) content.get(0).get("text");
            if (soql == null) {
                throw new RuntimeException("No text in Claude API response content");
            }

            // Strip any markdown code block wrappers Claude might add
            soql = soql.trim();
            if (soql.startsWith("```")) {
                soql = soql.replaceAll("^```[a-zA-Z]*\\n?", "").replaceAll("```$", "").trim();
            }

            log.debug("Generated SOQL: {}", soql);
            return soql;

        } catch (Exception e) {
            log.error("Failed to generate SOQL from Claude AI: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate SOQL: " + e.getMessage(), e);
        }
    }
}
