package com.orgforge.modules.permissionpilot.repository;

import com.orgforge.modules.permissionpilot.model.PermissionComparison;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PermissionComparisonRepository extends JpaRepository<PermissionComparison, Long> {

    List<PermissionComparison> findByOrgIdOrderByCreatedAtDesc(String orgId);
}
