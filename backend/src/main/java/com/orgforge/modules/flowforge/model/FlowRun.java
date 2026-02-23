package com.orgforge.modules.flowforge.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "flow_runs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlowRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String orgId;
    private String flowName;
    private String flowType;
    private String flowId;
    private String status;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    private LocalDateTime startedAt;
    private Long durationMs;
    private String recordId;
    private String triggeredBy;

    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "flowRun", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<FlowError> errors = new ArrayList<>();
}
