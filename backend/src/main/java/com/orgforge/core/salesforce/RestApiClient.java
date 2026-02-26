package com.orgforge.core.salesforce;

import com.orgforge.core.org.OrgConnection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@Slf4j @Component @RequiredArgsConstructor
public class RestApiClient {

    private final SalesforceAuthService salesforceAuthService;
    private final RestTemplate restTemplate = new RestTemplate(new HttpComponentsClientHttpRequestFactory());

    public Map<?, ?> query(OrgConnection org, String soql) {
        String url = UriComponentsBuilder
            .fromHttpUrl(org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + "/query")
            .queryParam("q", soql).build().toUriString();
        return get(org, url);
    }

    public Map<?, ?> get(OrgConnection org, String fullUrl) {
        return execute(org, () -> restTemplate.exchange(fullUrl, HttpMethod.GET, headers(org), Map.class).getBody());
    }

    @SuppressWarnings("rawtypes")
    public List<?> getList(OrgConnection org, String fullUrl) {
        return execute(org, () -> restTemplate.exchange(fullUrl, HttpMethod.GET, headers(org), List.class).getBody());
    }

    public Map<?, ?> getLimits(OrgConnection org) {
        return get(org, org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + "/limits/");
    }

    public Map<?, ?> post(OrgConnection org, String path, Object body) {
        return execute(org, () -> {
            HttpHeaders h = new HttpHeaders();
            h.setBearerAuth(org.getAccessToken());
            h.setContentType(MediaType.APPLICATION_JSON);
            return restTemplate.exchange(
                org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + path,
                HttpMethod.POST, new HttpEntity<>(body, h), Map.class).getBody();
        });
    }

    @SuppressWarnings("rawtypes")
    public List<?> postCollection(OrgConnection org, String path, Object body) {
        return execute(org, () -> {
            HttpHeaders h = new HttpHeaders();
            h.setBearerAuth(org.getAccessToken());
            h.setContentType(MediaType.APPLICATION_JSON);
            return restTemplate.exchange(
                org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + path,
                HttpMethod.POST, new HttpEntity<>(body, h), List.class).getBody();
        });
    }

    @SuppressWarnings("rawtypes")
    public List<?> patchCollection(OrgConnection org, String path, Object body) {
        return execute(org, () -> {
            HttpHeaders h = new HttpHeaders();
            h.setBearerAuth(org.getAccessToken());
            h.setContentType(MediaType.APPLICATION_JSON);
            return restTemplate.exchange(
                org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + path,
                HttpMethod.PATCH, new HttpEntity<>(body, h), List.class).getBody();
        });
    }

    public Map<?, ?> describe(OrgConnection org, String object) {
        return get(org, org.getInstanceUrl() + "/services/data/v" + org.getApiVersion()
            + "/sobjects/" + object + "/describe");
    }

    // Retry once after refreshing the token on 401
    private <T> T execute(OrgConnection org, Supplier<T> action) {
        try {
            return action.get();
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                log.info("SF access token expired for org {}, refreshing...", org.getOrgId());
                salesforceAuthService.refreshAccessToken(org);
                return action.get();
            }
            throw e;
        }
    }

    private HttpEntity<Void> headers(OrgConnection org) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(org.getAccessToken());
        h.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(h);
    }
}
