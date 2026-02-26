package com.orgforge.core.org;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrgConnectionRepository extends JpaRepository<OrgConnection, UUID> {
    Optional<OrgConnection> findByOrgId(String orgId);
    List<OrgConnection> findByIsActiveTrue();
    List<OrgConnection> findByConnectedByUserIdAndIsActiveTrue(String userId);
}
