package com.orgforge.modules.permissionpilot.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "permission_snapshots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PermissionSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orgId;

    @Column(nullable = false)
    private String profileName;

    private String profileId;

    private String permissionSet;

    private int userCount;

    @Column(columnDefinition = "TEXT")
    private String snapshotData;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime snappedAt = LocalDateTime.now();
}
