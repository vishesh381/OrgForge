package com.orgforge.modules.deploypilot.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "deploy_components")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeployComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "component_type")
    private String componentType;

    @Column(name = "component_name")
    private String componentName;

    private String status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deployment_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Deployment deployment;
}
