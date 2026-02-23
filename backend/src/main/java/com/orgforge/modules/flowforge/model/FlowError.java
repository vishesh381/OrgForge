package com.orgforge.modules.flowforge.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "flow_errors")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlowError {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String errorType;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Column(columnDefinition = "TEXT")
    private String stackTrace;

    private String elementLabel;
    private String elementApiName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flow_run_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private FlowRun flowRun;
}
