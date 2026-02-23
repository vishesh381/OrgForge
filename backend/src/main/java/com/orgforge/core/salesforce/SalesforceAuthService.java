package com.orgforge.core.salesforce;

import com.orgforge.core.org.OrgConnection;
import com.orgforge.core.org.OrgConnectionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j @Service @RequiredArgsConstructor
public class SalesforceAuthService {

    @Value("${salesforce.client-id}") private String clientId;
    @Value("${salesforce.client-secret}") private String clientSecret;
    @Value("${salesforce.login-url}") private String loginUrl;
    @Value("${salesforce.redirect-uri}") private String redirectUri;

    private final OrgConnectionManager orgConnectionManager;
    private final RestTemplate restTemplate = new RestTemplate();

    public String buildAuthUrl(String state) {
        return UriComponentsBuilder.fromHttpUrl(loginUrl + "/services/oauth2/authorize")
            .queryParam("response_type", "code")
            .queryParam("client_id", clientId)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("scope", "full refresh_token api")
            .queryParam("state", state)
            .build().toUriString();
    }

    @SuppressWarnings("unchecked")
    public OrgConnection exchangeCodeForTokens(String code, String userId) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("redirect_uri", redirectUri);
        params.add("code", code);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        Map<String, Object> body = restTemplate.postForEntity(
            loginUrl + "/services/oauth2/token", new HttpEntity<>(params, headers), Map.class
        ).getBody();

        String instanceUrl = (String) body.get("instance_url");
        String accessToken = (String) body.get("access_token");
        String refreshToken = (String) body.get("refresh_token");
        String orgId = extractOrgId((String) body.get("id"));

        // Upsert: update tokens if org already connected, otherwise create new
        OrgConnection org;
        try {
            org = orgConnectionManager.getOrgBySfId(orgId);
            org.setAccessToken(accessToken);
            org.setRefreshToken(refreshToken);
            org.setInstanceUrl(instanceUrl);
            org.setConnectedByUserId(userId);
            org.setActive(true);
        } catch (RuntimeException e) {
            org = OrgConnection.builder()
                .orgId(orgId).instanceUrl(instanceUrl)
                .accessToken(accessToken).refreshToken(refreshToken)
                .apiVersion("60.0").connectedByUserId(userId)
                .build();
        }

        fetchOrgInfo(org, accessToken);
        return orgConnectionManager.saveOrg(org);
    }

    @SuppressWarnings("unchecked")
    public String refreshAccessToken(OrgConnection org) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "refresh_token");
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("refresh_token", org.getRefreshToken());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        Map<String, Object> body = restTemplate.postForEntity(
            loginUrl + "/services/oauth2/token", new HttpEntity<>(params, headers), Map.class
        ).getBody();
        String newToken = (String) body.get("access_token");
        org.setAccessToken(newToken);
        org.setTokenExpiry(LocalDateTime.now().plusHours(2));
        orgConnectionManager.saveOrg(org);
        return newToken;
    }

    @SuppressWarnings("unchecked")
    private void fetchOrgInfo(OrgConnection org, String accessToken) {
        try {
            HttpHeaders h = new HttpHeaders();
            h.setBearerAuth(accessToken);
            Map<?, ?> resp = restTemplate.exchange(
                org.getInstanceUrl() + "/services/data/v60.0/query?q=SELECT+Id,+Name,+OrganizationType+FROM+Organization",
                HttpMethod.GET, new HttpEntity<>(h), Map.class).getBody();
            List<Map<String, Object>> records = (List<Map<String, Object>>) resp.get("records");
            if (records != null && !records.isEmpty()) {
                org.setOrgName((String) records.get(0).get("Name"));
                String type = (String) records.get(0).get("OrganizationType");
                if (type != null) {
                    try { org.setOrgType(OrgConnection.OrgType.valueOf(type.toUpperCase().replace(" ", "_"))); }
                    catch (Exception e) { org.setOrgType(OrgConnection.OrgType.SANDBOX); }
                }
            }
        } catch (Exception e) { log.warn("Could not fetch org info: {}", e.getMessage()); }
    }

    private String extractOrgId(String idUrl) {
        if (idUrl == null) return UUID.randomUUID().toString();
        String[] parts = idUrl.split("/");
        return parts.length >= 2 ? parts[parts.length - 2] : UUID.randomUUID().toString();
    }
}
