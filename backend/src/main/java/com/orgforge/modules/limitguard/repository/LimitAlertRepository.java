package com.orgforge.modules.limitguard.repository;

import com.orgforge.modules.limitguard.model.LimitAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LimitAlertRepository extends JpaRepository<LimitAlert, Long> {

    List<LimitAlert> findByOrgIdAndIsActiveTrue(String orgId);

    Optional<LimitAlert> findByOrgIdAndLimitName(String orgId, String limitName);
}
