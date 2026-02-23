package com.orgforge.modules.deploypilot.repository;

import com.orgforge.modules.deploypilot.model.DeployComponent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeployComponentRepository extends JpaRepository<DeployComponent, Long> {

    List<DeployComponent> findByDeploymentId(Long deploymentId);
}
