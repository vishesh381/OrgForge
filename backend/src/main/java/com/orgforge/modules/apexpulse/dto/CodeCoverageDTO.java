package com.orgforge.modules.apexpulse.dto;

public record CodeCoverageDTO(
        String classOrTriggerName,
        int linesCovered,
        int linesUncovered,
        double coveragePercent
) {
}
