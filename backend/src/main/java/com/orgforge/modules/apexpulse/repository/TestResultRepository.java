package com.orgforge.modules.apexpulse.repository;

import com.orgforge.modules.apexpulse.model.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestResultRepository extends JpaRepository<TestResult, Long> {

    List<TestResult> findByTestRunIdOrderByClassNameAscMethodNameAsc(Long testRunId);
}
