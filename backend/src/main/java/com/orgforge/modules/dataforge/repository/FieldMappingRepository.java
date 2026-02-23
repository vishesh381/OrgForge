package com.orgforge.modules.dataforge.repository;

import com.orgforge.modules.dataforge.model.FieldMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FieldMappingRepository extends JpaRepository<FieldMapping, Long> {

    List<FieldMapping> findByOrgIdAndObjectName(String orgId, String objectName);

    Optional<FieldMapping> findByOrgIdAndObjectNameAndMappingName(
            String orgId, String objectName, String mappingName);
}
