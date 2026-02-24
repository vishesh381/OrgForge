package com.orgforge.core.salesforce;

import com.orgforge.core.org.OrgConnection;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

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
        OrgConnection org = salesforceAuthService.exchangeCodeForTokens(code, userId);
        return new RedirectView(frontendUrl + "/?connected=" + org.getId());
    }
}
