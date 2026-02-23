package com.orgforge.modules.flowforge.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "flow_overlaps")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlowOverlap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String orgId;
    private String objectName;
    private String triggerEvent;

    @Column(columnDefinition = "TEXT")
    private String flowNames;

    private String riskLevel;
    private LocalDateTime detectedAt;
}
