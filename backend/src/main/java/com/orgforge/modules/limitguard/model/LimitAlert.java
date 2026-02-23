package com.orgforge.modules.limitguard.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "limit_alerts",
    uniqueConstraints = @UniqueConstraint(columnNames = {"org_id", "limit_name"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LimitAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orgId;

    @Column(nullable = false)
    private String limitName;

    @Column(precision = 5, scale = 2)
    private BigDecimal thresholdPct;

    private String notifyEmail;

    @Column(nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
