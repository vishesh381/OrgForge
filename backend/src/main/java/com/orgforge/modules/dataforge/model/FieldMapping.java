package com.orgforge.modules.dataforge.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "field_mappings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FieldMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String orgId;
    private String objectName;
    private String mappingName;

    @Column(columnDefinition = "TEXT")
    private String mappingJson;

    private String createdBy;
    private LocalDateTime createdAt;
}
