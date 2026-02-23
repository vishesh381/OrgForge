package com.orgforge.modules.orglens.repository;

import com.orgforge.modules.orglens.model.OrgHealthScore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrgHealthScoreRepository extends JpaRepository<OrgHealthScore, Long> {

    Optional<OrgHealthScore> findFirstByOrgIdOrderByScoredAtDesc(String orgId);

    List<OrgHealthScore> findTop10ByOrgIdOrderByScoredAtDesc(String orgId);
}
