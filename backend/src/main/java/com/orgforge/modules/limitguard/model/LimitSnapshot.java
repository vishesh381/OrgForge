package com.orgforge.modules.limitguard.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "limit_snapshots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LimitSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orgId;

    @Column(nullable = false)
    private String limitName;

    private String limitType;

    @Column(nullable = false)
    private Long used;

    @Column(nullable = false)
    private Long total;

    @Column(precision = 5, scale = 2)
    private BigDecimal percentage;

    private LocalDateTime forecastedExhaustionAt;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime snapshotAt = LocalDateTime.now();
}
