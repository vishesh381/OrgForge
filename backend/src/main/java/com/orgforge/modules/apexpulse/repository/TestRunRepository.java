package com.orgforge.modules.apexpulse.repository;

import com.orgforge.modules.apexpulse.model.TestRun;
import com.orgforge.modules.apexpulse.model.TestRunStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TestRunRepository extends JpaRepository<TestRun, Long> {

    Page<TestRun> findAllByOrderByStartedAtDesc(Pageable pageable);

    List<TestRun> findByOrgIdOrderByStartedAtDesc(String orgId);

    Optional<TestRun> findByAsyncApexJobId(String asyncApexJobId);

    List<TestRun> findByStatusAndOrgId(TestRunStatus status, String orgId);

    @Query("SELECT t FROM TestRun t WHERE t.orgId = :orgId AND t.status = 'COMPLETED' AND t.startedAt >= :since ORDER BY t.startedAt ASC")
    List<TestRun> findCompletedRunsSince(String orgId, LocalDateTime since);

    @Query("SELECT t FROM TestRun t WHERE t.orgId = :orgId AND t.status = 'COMPLETED' ORDER BY t.startedAt DESC")
    List<TestRun> findRecentCompleted(String orgId, Pageable pageable);
}
