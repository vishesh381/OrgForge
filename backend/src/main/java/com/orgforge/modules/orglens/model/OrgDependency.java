package com.orgforge.modules.orglens.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "org_dependencies")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrgDependency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orgId;

    private String sourceType;

    private String sourceName;

    private String targetType;

    private String targetName;

    private String dependencyType;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
