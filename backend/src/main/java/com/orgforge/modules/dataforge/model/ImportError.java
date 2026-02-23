package com.orgforge.modules.dataforge.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "import_errors")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportError {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int rowNumber;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Column(columnDefinition = "TEXT")
    private String rawData;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_job_id")
    private ImportJob importJob;
}
