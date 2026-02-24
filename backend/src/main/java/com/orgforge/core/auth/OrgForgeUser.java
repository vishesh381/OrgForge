package com.orgforge.core.auth;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class OrgForgeUser {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    private String name;
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private UserRole role = UserRole.USER;

    // UI preferences — persisted cross-browser
    @Builder.Default
    private String accentColor = "indigo";

    @Builder.Default
    private String bgTheme = "dark";

    private String activeOrgId;  // last selected Salesforce org ID

    @Column(updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum UserRole { ADMIN, USER, VIEWER }
}
