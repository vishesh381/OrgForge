package com.orgforge.modules.deploypilot.repository;

import com.orgforge.modules.deploypilot.model.DeployRollback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeployRollbackRepository extends JpaRepository<DeployRollback, Long> {

    Optional<DeployRollback> findByDeploymentId(Long deploymentId);
}
