package com.orgforge.modules.permissionpilot.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "permission_violations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PermissionViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orgId;

    private String sfUserId;

    private String username;

    private String permissionType;

    private String permissionName;

    private String riskLevel;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    @Builder.Default
    private boolean isAcknowledged = false;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime detectedAt = LocalDateTime.now();
}
