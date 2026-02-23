package com.orgforge.modules.dataforge.repository;

import com.orgforge.modules.dataforge.model.ImportJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ImportJobRepository extends JpaRepository<ImportJob, Long> {

    Page<ImportJob> findByOrgIdOrderByCreatedAtDesc(String orgId, Pageable pageable);

    List<ImportJob> findTop5ByOrgIdOrderByCreatedAtDesc(String orgId);
}
