package com.orgforge.core.salesforce;

import com.orgforge.core.org.OrgConnection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class SalesforceAuthController {

    @Value("${app.frontend-url}") private String frontendUrl;
    private final SalesforceAuthService salesforceAuthService;

    @GetMapping("/callback")
    public RedirectView callback(@RequestParam String code,
                                  @RequestParam(required = false) String state,
                                  Authentication auth) {
        String userId = (state != null && state.length() > 10) ? state
                      : (auth != null ? auth.getName() : "anonymous");
        try {
            OrgConnection org = salesforceAuthService.exchangeCodeForTokens(code, userId);
            return new RedirectView(frontendUrl + "/?connected=" + org.getId());
        } catch (Exception e) {
            log.error("Salesforce OAuth callback failed: {}", e.getMessage());
            String msg = URLEncoder.encode(e.getMessage() != null ? e.getMessage() : "Unknown error", StandardCharsets.UTF_8);
            return new RedirectView(frontendUrl + "/?error=" + msg);
        }
    }
}
