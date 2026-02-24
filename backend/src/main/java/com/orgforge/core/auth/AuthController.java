package com.orgforge.core.auth;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final OrgForgeAuthService authService;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req, HttpServletResponse response) {
        OrgForgeUser user = authService.login(req.email(), req.password()).orElse(null);
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
        setJwtCookie(response, jwtTokenProvider.generateToken(user.getId().toString(), user.getEmail()));
        return ResponseEntity.ok(Map.of("user", toMap(user)));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req, HttpServletResponse response) {
        OrgForgeUser user = authService.register(req.name(), req.email(), req.password());
        setJwtCookie(response, jwtTokenProvider.generateToken(user.getId().toString(), user.getEmail()));
        return ResponseEntity.ok(Map.of("user", toMap(user)));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        ResponseCookie clear = ResponseCookie.from("jwt", "")
            .httpOnly(true).secure(cookieSecure).sameSite(cookieSameSite)
            .path("/").maxAge(0).build();
        response.addHeader(HttpHeaders.SET_COOKIE, clear.toString());
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        return ResponseEntity.ok(toMap(authService.findById(auth.getName())));
    }

    @PatchMapping("/preferences")
    public ResponseEntity<?> updatePreferences(@RequestBody PreferencesRequest req, Authentication auth) {
        OrgForgeUser updated = authService.savePreferences(
            auth.getName(), req.accentColor(), req.bgTheme(), req.activeOrgId());
        return ResponseEntity.ok(toMap(updated));
    }

    private void setJwtCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("jwt", token)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path("/")
            .maxAge(Duration.ofMillis(jwtExpirationMs))
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private Map<String, Object> toMap(OrgForgeUser u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("name", u.getName() != null ? u.getName() : "");
        m.put("email", u.getEmail());
        m.put("role", u.getRole());
        m.put("accentColor", u.getAccentColor() != null ? u.getAccentColor() : "indigo");
        m.put("bgTheme", u.getBgTheme() != null ? u.getBgTheme() : "dark");
        if (u.getActiveOrgId() != null) m.put("activeOrgId", u.getActiveOrgId());
        return m;
    }

    record LoginRequest(String email, String password) {}
    record RegisterRequest(String name, String email, String password) {}
    record PreferencesRequest(String accentColor, String bgTheme, String activeOrgId) {}
}
