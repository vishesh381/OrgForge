package com.orgforge.modules.flowforge.repository;

import com.orgforge.modules.flowforge.model.FlowRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlowRunRepository extends JpaRepository<FlowRun, Long> {

    Page<FlowRun> findByOrgIdOrderByCreatedAtDesc(String orgId, Pageable pageable);

    List<FlowRun> findByOrgIdAndStatusOrderByCreatedAtDesc(String orgId, String status, Pageable pageable);

    long countByOrgIdAndStatus(String orgId, String status);
}
