package com.orgforge.modules.deploypilot.repository;

import com.orgforge.modules.deploypilot.model.Deployment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeploymentRepository extends JpaRepository<Deployment, Long> {

    Page<Deployment> findByOrgIdOrderByStartedAtDesc(String orgId, Pageable pageable);

    Optional<Deployment> findByOrgIdAndSfDeploymentId(String orgId, String sfDeploymentId);

    List<Deployment> findTop5ByOrgIdOrderByStartedAtDesc(String orgId);
}
