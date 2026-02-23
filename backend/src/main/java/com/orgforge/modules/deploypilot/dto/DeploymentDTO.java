package com.orgforge.modules.deploypilot.dto;

import java.time.LocalDateTime;

public record DeploymentDTO(
        Long id,
        String sfDeploymentId,
        String label,
        int componentCount,
        String status,
        String deployType,
        boolean validationOnly,
        String errorMessage,
        String deployedBy,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        boolean hasRollback
) {}
