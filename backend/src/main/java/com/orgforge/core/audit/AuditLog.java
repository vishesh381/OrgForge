package com.orgforge.core.audit;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "audit_logs")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private UUID orgId;
    private UUID userId;
    private String module;
    private String action;
    @Column(columnDefinition = "TEXT") private String details;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
