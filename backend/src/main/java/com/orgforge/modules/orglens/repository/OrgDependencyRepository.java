package com.orgforge.modules.orglens.repository;

import com.orgforge.modules.orglens.model.OrgDependency;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrgDependencyRepository extends JpaRepository<OrgDependency, Long> {

    List<OrgDependency> findByOrgId(String orgId);
}
