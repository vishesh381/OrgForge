package com.orgforge.modules.deploypilot.service;

import com.orgforge.core.org.OrgConnection;
import com.orgforge.core.org.OrgConnectionRepository;
import com.orgforge.core.salesforce.RestApiClient;
import com.orgforge.core.salesforce.ToolingApiClient;
import com.orgforge.modules.deploypilot.dto.DeploymentDTO;
import com.orgforge.modules.deploypilot.model.DeployComponent;
import com.orgforge.modules.deploypilot.model.DeployRollback;
import com.orgforge.modules.deploypilot.model.Deployment;
import com.orgforge.modules.deploypilot.repository.DeployComponentRepository;
import com.orgforge.modules.deploypilot.repository.DeployRollbackRepository;
import com.orgforge.modules.deploypilot.repository.DeploymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeployPilotService {

    private final DeploymentRepository deploymentRepository;
    private final DeployComponentRepository deployComponentRepository;
    private final DeployRollbackRepository deployRollbackRepository;
    private final OrgConnectionRepository orgConnectionRepository;
    private final ToolingApiClient toolingApiClient;
    private final RestApiClient restApiClient;

    // -------------------------------------------------------------------------
    // Query methods
    // -------------------------------------------------------------------------

    public List<DeploymentDTO> getDeployments(String orgId, int page) {
        Page<Deployment> deployments = deploymentRepository
                .findByOrgIdOrderByStartedAtDesc(orgId, PageRequest.of(page, 100));
        return deployments.getContent().stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public DeploymentDTO getDeployment(String orgId, Long id) {
        Deployment deployment = deploymentRepository.findById(id)
                .filter(d -> d.getOrgId().equals(orgId))
                .orElseThrow(() -> new NoSuchElementException(
                        "Deployment not found: id=" + id + ", orgId=" + orgId));
        // Eagerly load components for detail view
        List<DeployComponent> components = deployComponentRepository.findByDeploymentId(id);
        deployment.setComponents(components);
        return toDTO(deployment);
    }

    // -------------------------------------------------------------------------
    // Impact analysis
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    @Cacheable(value = "impact", key = "#orgId + ':' + #componentNames.hashCode()")
    public Map<String, Object> analyzeImpact(String orgId, List<String> componentNames) {
        OrgConnection org = resolveOrg(orgId);

        List<Map<String, Object>> allDependencies = new ArrayList<>();
        Set<String> impactedSet = new LinkedHashSet<>();

        for (String name : componentNames) {
            try {
                String soql = "SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, "
                        + "RefMetadataComponentName, RefMetadataComponentType "
                        + "FROM MetadataComponentDependency "
                        + "WHERE RefMetadataComponentName = '" + name.replace("'", "\\'") + "'";

                Map<?, ?> result = toolingApiClient.query(org, soql);
                List<Map<String, Object>> records =
                        (List<Map<String, Object>>) result.get("records");

                if (records != null) {
                    for (Map<String, Object> record : records) {
                        Map<String, Object> dep = new HashMap<>();
                        dep.put("dependentName", record.get("MetadataComponentName"));
                        dep.put("dependentType", record.get("MetadataComponentType"));
                        dep.put("referencedName", record.get("RefMetadataComponentName"));
                        dep.put("referencedType", record.get("RefMetadataComponentType"));
                        allDependencies.add(dep);
                        String depName = (String) record.get("MetadataComponentName");
                        if (depName != null) impactedSet.add(depName);
                    }
                }
            } catch (Exception e) {
                log.warn("Impact analysis query failed for component '{}': {}", name, e.getMessage());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("components", componentNames);
        result.put("impactedCount", impactedSet.size());
        result.put("impactedComponents", new ArrayList<>(impactedSet));
        result.put("dependencies", allDependencies);
        return result;
    }

    // -------------------------------------------------------------------------
    // Deployment lifecycle
    // -------------------------------------------------------------------------

    @Transactional
    public Deployment startDeployment(String orgId, String label, boolean validationOnly, String deployedBy) {
        Deployment deployment = Deployment.builder()
                .orgId(orgId)
                .label(label)
                .status("PENDING")
                .validationOnly(validationOnly)
                .deployedBy(deployedBy)
                .startedAt(LocalDateTime.now())
                .build();
        return deploymentRepository.save(deployment);
    }

    // -------------------------------------------------------------------------
    // Sync from Salesforce
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    @Transactional
    public void syncDeploymentsFromSalesforce(String orgId) {
        OrgConnection org = resolveOrg(orgId);

        try {
            String soql = "SELECT Id, Status, StartDate, CompletedDate, CreatedBy.Name, "
                    + "CheckOnly, NumberComponentsTotal, ErrorMessage "
                    + "FROM DeployRequest ORDER BY StartDate DESC LIMIT 100";

            Map<?, ?> response = toolingApiClient.query(org, soql);
            if (response == null) return;

            Object deploymentsObj = response.get("records");
            if (!(deploymentsObj instanceof List)) return;

            List<Map<String, Object>> sfDeployments = (List<Map<String, Object>>) deploymentsObj;

            for (Map<String, Object> sfDeploy : sfDeployments) {
                String sfId = (String) sfDeploy.get("Id");
                if (sfId == null) continue;

                Deployment deployment = deploymentRepository
                        .findByOrgIdAndSfDeploymentId(orgId, sfId)
                        .orElseGet(() -> Deployment.builder()
                                .orgId(orgId)
                                .sfDeploymentId(sfId)
                                .startedAt(LocalDateTime.now())
                                .build());

                String status = (String) sfDeploy.get("Status");
                if (status != null) deployment.setStatus(status.toUpperCase());

                Object numberComponents = sfDeploy.get("NumberComponentsTotal");
                if (numberComponents instanceof Number) {
                    deployment.setComponentCount(((Number) numberComponents).intValue());
                }

                String errorMessage = (String) sfDeploy.get("ErrorMessage");
                if (errorMessage != null) deployment.setErrorMessage(errorMessage);

                deployment.setDeployType("METADATA");
                Object validationOnly = sfDeploy.get("CheckOnly");
                if (validationOnly instanceof Boolean) {
                    deployment.setValidationOnly((Boolean) validationOnly);
                }

                deploymentRepository.save(deployment);
            }
        } catch (Exception e) {
            log.error("Failed to sync deployments from Salesforce for orgId={}: {}", orgId, e.getMessage());
            throw new RuntimeException("Sync failed: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Rollback
    // -------------------------------------------------------------------------

    @Transactional
    public void performRollback(String orgId, Long deploymentId, String reason, String rolledBackBy) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .filter(d -> d.getOrgId().equals(orgId))
                .orElseThrow(() -> new NoSuchElementException(
                        "Deployment not found: id=" + deploymentId + ", orgId=" + orgId));

        DeployRollback rollback = DeployRollback.builder()
                .deployment(deployment)
                .rollbackReason(reason)
                .rolledBackBy(rolledBackBy)
                .rolledBackAt(LocalDateTime.now())
                .build();
        deployRollbackRepository.save(rollback);

        deployment.setStatus("ROLLED_BACK");
        deployment.setCompletedAt(LocalDateTime.now());
        deploymentRepository.save(deployment);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private OrgConnection resolveOrg(String orgId) {
        return orgConnectionRepository.findByOrgId(orgId)
                .orElseThrow(() -> new NoSuchElementException(
                        "No OrgConnection found for orgId: " + orgId));
    }

    private DeploymentDTO toDTO(Deployment d) {
        boolean hasRollback = deployRollbackRepository.findByDeploymentId(d.getId()).isPresent();
        return new DeploymentDTO(
                d.getId(),
                d.getSfDeploymentId(),
                d.getLabel(),
                d.getComponentCount(),
                d.getStatus(),
                d.getDeployType(),
                d.isValidationOnly(),
                d.getErrorMessage(),
                d.getDeployedBy(),
                d.getStartedAt(),
                d.getCompletedAt(),
                hasRollback
        );
    }
}
