package com.orgforge.core.salesforce;

import com.orgforge.core.org.OrgConnection;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.Map;

@Slf4j @Component
public class ToolingApiClient {

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<?, ?> query(OrgConnection org, String soql) {
        String url = UriComponentsBuilder
            .fromHttpUrl(org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + "/tooling/query")
            .queryParam("q", soql).build().toUriString();
        return restTemplate.exchange(url, HttpMethod.GET, headers(org), Map.class).getBody();
    }

    public Map<?, ?> post(OrgConnection org, String path, Object body) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(org.getAccessToken());
        h.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(
            org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + "/tooling" + path,
            HttpMethod.POST, new HttpEntity<>(body, h), Map.class).getBody();
    }

    public Map<?, ?> get(OrgConnection org, String path) {
        return restTemplate.exchange(
            org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + "/tooling" + path,
            HttpMethod.GET, headers(org), Map.class).getBody();
    }

    private HttpEntity<Void> headers(OrgConnection org) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(org.getAccessToken());
        h.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(h);
    }
}
