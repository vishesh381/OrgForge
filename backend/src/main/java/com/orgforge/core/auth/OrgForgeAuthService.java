package com.orgforge.core.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrgForgeAuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public Optional<OrgForgeUser> login(String email, String password) {
        return userRepository.findByEmail(email)
            .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()));
    }

    public OrgForgeUser register(String name, String email, String password) {
        if (userRepository.existsByEmail(email))
            throw new IllegalArgumentException("Email already registered");
        return userRepository.save(OrgForgeUser.builder()
            .name(name).email(email)
            .passwordHash(passwordEncoder.encode(password))
            .build());
    }

    public OrgForgeUser findById(String id) {
        return userRepository.findById(UUID.fromString(id))
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public OrgForgeUser savePreferences(String userId, String accentColor, String bgTheme, String activeOrgId) {
        OrgForgeUser user = findById(userId);
        if (accentColor != null) user.setAccentColor(accentColor);
        if (bgTheme != null) user.setBgTheme(bgTheme);
        if (activeOrgId != null) user.setActiveOrgId(activeOrgId);
        return userRepository.save(user);
    }
}
