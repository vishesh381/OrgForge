package com.orgforge.modules.deploypilot.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "deploy_rollbacks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeployRollback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rollback_reason", columnDefinition = "TEXT")
    private String rollbackReason;

    @Column(name = "rolled_back_by")
    private String rolledBackBy;

    @Column(name = "rolled_back_at")
    @Builder.Default
    private LocalDateTime rolledBackAt = LocalDateTime.now();

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deployment_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Deployment deployment;
}
