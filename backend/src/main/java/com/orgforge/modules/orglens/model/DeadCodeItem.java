package com.orgforge.modules.orglens.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "dead_code_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeadCodeItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orgId;

    private String componentType;

    private String componentName;

    private String apiName;

    private String namespace;

    private LocalDateTime lastModified;

    @Builder.Default
    private boolean isReviewed = false;

    private String reviewedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime detectedAt = LocalDateTime.now();
}
