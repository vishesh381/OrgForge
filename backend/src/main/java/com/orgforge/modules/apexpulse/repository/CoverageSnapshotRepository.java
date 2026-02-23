package com.orgforge.modules.apexpulse.repository;

import com.orgforge.modules.apexpulse.model.CoverageSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CoverageSnapshotRepository extends JpaRepository<CoverageSnapshot, Long> {

    List<CoverageSnapshot> findByTestRunIdOrderByClassNameAsc(Long testRunId);

    @Query("SELECT AVG(c.coveragePercent) FROM CoverageSnapshot c WHERE c.testRun.id = :testRunId")
    Double findAverageCoverageByTestRunId(Long testRunId);
}
