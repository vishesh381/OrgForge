package com.orgforge.modules.flowforge.repository;

import com.orgforge.modules.flowforge.model.FlowOverlap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlowOverlapRepository extends JpaRepository<FlowOverlap, Long> {

    List<FlowOverlap> findByOrgIdOrderByDetectedAtDesc(String orgId);
}
