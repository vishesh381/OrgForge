package com.orgforge.core.org;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "org_connections")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class OrgConnection {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String orgId;

    private String orgName;
    private String instanceUrl;

    @Enumerated(EnumType.STRING)
    private OrgType orgType;

    @Column(columnDefinition = "TEXT")
    private String accessToken;

    @Column(columnDefinition = "TEXT")
    private String refreshToken;

    private LocalDateTime tokenExpiry;

    @Builder.Default
    private String apiVersion = "60.0";

    @Builder.Default
    private boolean isActive = true;

    private String connectedByUserId;

    @Column(updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public enum OrgType { PRODUCTION, SANDBOX, DEVELOPER, SCRATCH }
}
