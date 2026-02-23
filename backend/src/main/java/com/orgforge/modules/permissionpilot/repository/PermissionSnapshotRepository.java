package com.orgforge.modules.permissionpilot.repository;

import com.orgforge.modules.permissionpilot.model.PermissionSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermissionSnapshotRepository extends JpaRepository<PermissionSnapshot, Long> {

    List<PermissionSnapshot> findByOrgIdOrderBySnappedAtDesc(String orgId);

    Optional<PermissionSnapshot> findFirstByOrgIdAndProfileNameOrderBySnappedAtDesc(String orgId, String profileName);
}
