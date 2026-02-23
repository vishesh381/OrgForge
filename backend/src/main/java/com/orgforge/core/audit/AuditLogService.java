package com.orgforge.core.audit;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class AuditLogService {
    private final AuditLogRepository repo;

    @Async
    public void log(UUID orgId, UUID userId, String module, String action, String details) {
        repo.save(AuditLog.builder().orgId(orgId).userId(userId)
            .module(module).action(action).details(details).build());
    }
}
