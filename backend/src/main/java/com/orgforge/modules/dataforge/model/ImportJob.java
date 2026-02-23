package com.orgforge.modules.dataforge.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "import_jobs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String orgId;
    private String objectName;
    private String status;

    private int totalRecords;
    private int processedRecords;
    private int successCount;
    private int errorCount;

    private String fileName;

    @Builder.Default
    private String operation = "INSERT";

    private String externalIdField;

    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    @Builder.Default
    @OneToMany(mappedBy = "importJob", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ImportError> errors = new ArrayList<>();
}
