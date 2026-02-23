package com.orgforge.modules.orglens.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "org_health_scores")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrgHealthScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orgId;

    @Column(precision = 5, scale = 2)
    private BigDecimal overallScore;

    @Column(precision = 5, scale = 2)
    private BigDecimal apexScore;

    @Column(precision = 5, scale = 2)
    private BigDecimal flowScore;

    @Column(precision = 5, scale = 2)
    private BigDecimal permissionScore;

    @Column(precision = 5, scale = 2)
    private BigDecimal dataScore;

    private int metadataCount;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime scoredAt = LocalDateTime.now();
}
