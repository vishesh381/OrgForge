package com.orgforge.modules.limitguard.dto;

import java.time.LocalDateTime;

public record LimitDataDTO(
        String limitName,
        String limitType,
        long used,
        long total,
        double percentage,
        String status,
        LocalDateTime forecastedExhaustionAt
) {
    public static String resolveStatus(double percentage) {
        if (percentage >= 90) return "CRITICAL";
        if (percentage >= 70) return "WARNING";
        return "HEALTHY";
    }
}
