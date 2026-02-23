package com.orgforge.core.salesforce;

import com.orgforge.core.org.OrgConnection;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.List;
import java.util.Map;

@Slf4j @Component
public class RestApiClient {

    private final RestTemplate restTemplate = new RestTemplate(new HttpComponentsClientHttpRequestFactory());

    public Map<?, ?> query(OrgConnection org, String soql) {
        String url = UriComponentsBuilder
            .fromHttpUrl(org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + "/query")
            .queryParam("q", soql).build().toUriString();
        return get(org, url);
    }

    public Map<?, ?> get(OrgConnection org, String fullUrl) {
        return restTemplate.exchange(fullUrl, HttpMethod.GET, headers(org), Map.class).getBody();
    }

    @SuppressWarnings("rawtypes")
    public List<?> getList(OrgConnection org, String fullUrl) {
        return restTemplate.exchange(fullUrl, HttpMethod.GET, headers(org), List.class).getBody();
    }

    public Map<?, ?> getLimits(OrgConnection org) {
        return get(org, org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + "/limits/");
    }

    public Map<?, ?> post(OrgConnection org, String path, Object body) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(org.getAccessToken());
        h.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(
            org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + path,
            HttpMethod.POST, new HttpEntity<>(body, h), Map.class).getBody();
    }

    @SuppressWarnings("rawtypes")
    public List<?> postCollection(OrgConnection org, String path, Object body) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(org.getAccessToken());
        h.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(
            org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + path,
            HttpMethod.POST, new HttpEntity<>(body, h), List.class).getBody();
    }

    @SuppressWarnings("rawtypes")
    public List<?> patchCollection(OrgConnection org, String path, Object body) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(org.getAccessToken());
        h.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(
            org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + path,
            HttpMethod.PATCH, new HttpEntity<>(body, h), List.class).getBody();
    }

    public Map<?, ?> describe(OrgConnection org, String object) {
        return get(org, org.getInstanceUrl() + "/services/data/v" + org.getApiVersion()
            + "/sobjects/" + object + "/describe");
    }

    private HttpEntity<Void> headers(OrgConnection org) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(org.getAccessToken());
        h.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(h);
    }
}
