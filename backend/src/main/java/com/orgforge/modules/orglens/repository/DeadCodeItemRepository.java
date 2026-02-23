package com.orgforge.modules.orglens.repository;

import com.orgforge.modules.orglens.model.DeadCodeItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeadCodeItemRepository extends JpaRepository<DeadCodeItem, Long> {

    List<DeadCodeItem> findByOrgIdOrderByDetectedAtDesc(String orgId);

    List<DeadCodeItem> findByOrgIdAndIsReviewedFalse(String orgId);
}
