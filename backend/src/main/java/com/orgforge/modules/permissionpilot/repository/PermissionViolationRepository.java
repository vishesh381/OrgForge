package com.orgforge.modules.permissionpilot.repository;

import com.orgforge.modules.permissionpilot.model.PermissionViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PermissionViolationRepository extends JpaRepository<PermissionViolation, Long> {

    List<PermissionViolation> findByOrgIdAndIsAcknowledgedFalseOrderByRiskLevelAsc(String orgId);

    List<PermissionViolation> findByOrgIdOrderByDetectedAtDesc(String orgId);

    long countByOrgIdAndRiskLevel(String orgId, String riskLevel);
}
