package com.orgforge.modules.deploypilot.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "deployments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Deployment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_id")
    private String orgId;

    @Column(name = "sf_deployment_id")
    private String sfDeploymentId;

    private String label;

    @Column(name = "component_count")
    @Builder.Default
    private int componentCount = 0;

    @Builder.Default
    private String status = "PENDING";

    @Column(name = "deploy_type")
    private String deployType;

    @Column(name = "validation_only")
    @Builder.Default
    private boolean validationOnly = false;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "deployed_by")
    private String deployedBy;

    @Column(name = "started_at")
    @Builder.Default
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "deployment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DeployComponent> components = new ArrayList<>();
}
