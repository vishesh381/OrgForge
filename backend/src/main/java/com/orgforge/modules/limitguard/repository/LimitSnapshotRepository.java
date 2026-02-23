package com.orgforge.modules.limitguard.repository;

import com.orgforge.modules.limitguard.model.LimitSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface LimitSnapshotRepository extends JpaRepository<LimitSnapshot, Long> {

    List<LimitSnapshot> findByOrgId(String orgId);

    List<LimitSnapshot> findByOrgIdAndSnapshotAtAfterOrderBySnapshotAtDesc(String orgId, LocalDateTime since);

    Optional<LimitSnapshot> findFirstByOrgIdAndLimitNameOrderBySnapshotAtDesc(String orgId, String limitName);

    List<LimitSnapshot> findTop5ByOrgIdAndLimitNameOrderBySnapshotAtDesc(String orgId, String limitName);
}
