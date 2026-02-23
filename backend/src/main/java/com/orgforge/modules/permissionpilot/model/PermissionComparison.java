package com.orgforge.modules.permissionpilot.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "permission_comparisons")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PermissionComparison {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orgId;

    @Column(nullable = false)
    private String profileA;

    @Column(nullable = false)
    private String profileB;

    @Column(columnDefinition = "TEXT")
    private String diffJson;

    private String comparedBy;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
