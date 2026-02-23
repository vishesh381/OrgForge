package com.orgforge.modules.permissionpilot.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orgforge.core.org.OrgConnection;
import com.orgforge.core.org.OrgConnectionRepository;
import com.orgforge.core.salesforce.RestApiClient;
import com.orgforge.core.salesforce.ToolingApiClient;
import com.orgforge.modules.permissionpilot.model.PermissionComparison;
import com.orgforge.modules.permissionpilot.model.PermissionSnapshot;
import com.orgforge.modules.permissionpilot.model.PermissionViolation;
import com.orgforge.modules.permissionpilot.repository.PermissionComparisonRepository;
import com.orgforge.modules.permissionpilot.repository.PermissionSnapshotRepository;
import com.orgforge.modules.permissionpilot.repository.PermissionViolationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PermissionPilotService {

    private final ToolingApiClient toolingApi;
    private final RestApiClient restApi;
    private final OrgConnectionRepository orgRepo;
    private final PermissionSnapshotRepository snapshotRepo;
    private final PermissionComparisonRepository comparisonRepo;
    private final PermissionViolationRepository violationRepo;
    private final ObjectMapper objectMapper;

    // ------------------------------------------------------------------
    // Profiles & Permission Sets
    // ------------------------------------------------------------------

    @Cacheable(value = "profiles", key = "#orgId")
    public List<Map<String, Object>> getProfiles(String orgId) {
        OrgConnection org = resolveOrg(orgId);

        List<Map<String, Object>> combined = new ArrayList<>();

        // Profiles
        Map<?, ?> profileResult = toolingApi.query(org,
                "SELECT Id, Name FROM Profile LIMIT 100");
        List<?> profileRecords = extractRecords(profileResult);
        for (Object rec : profileRecords) {
            if (rec instanceof Map<?, ?> map) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", map.get("Id"));
                item.put("name", map.get("Name"));
                item.put("userType", map.get("UserType"));
                item.put("type", "Profile");
                combined.add(item);
            }
        }

        // Custom Permission Sets
        Map<?, ?> psResult = toolingApi.query(org,
                "SELECT Id, Name, IsCustom FROM PermissionSet WHERE IsCustom=true LIMIT 100");
        List<?> psRecords = extractRecords(psResult);
        for (Object rec : psRecords) {
            if (rec instanceof Map<?, ?> map) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", map.get("Id"));
                item.put("name", map.get("Name"));
                item.put("isCustom", map.get("IsCustom"));
                item.put("type", "PermissionSet");
                combined.add(item);
            }
        }

        return combined;
    }

    // ------------------------------------------------------------------
    // Snapshot
    // ------------------------------------------------------------------

    public PermissionSnapshot snapshotProfile(String orgId, String profileId, String profileName) {
        OrgConnection org = resolveOrg(orgId);

        // Query object permissions for this profile via Tooling API
        String soql = "SELECT SobjectType, PermissionsRead, PermissionsCreate, PermissionsEdit, "
                + "PermissionsDelete, PermissionsViewAllRecords, PermissionsModifyAllRecords "
                + "FROM ObjectPermissions WHERE ParentId='" + profileId + "'";

        Map<?, ?> result = restApi.query(org, soql);
        List<?> records = extractRecords(result);

        List<Map<String, Object>> permList = new ArrayList<>();
        for (Object rec : records) {
            if (rec instanceof Map<?, ?> map) {
                Map<String, Object> perm = new LinkedHashMap<>();
                perm.put("objectName", map.get("SobjectType"));
                perm.put("read", map.get("PermissionsRead"));
                perm.put("create", map.get("PermissionsCreate"));
                perm.put("edit", map.get("PermissionsEdit"));
                perm.put("delete", map.get("PermissionsDelete"));
                perm.put("viewAll", map.get("PermissionsViewAllRecords"));
                perm.put("modifyAll", map.get("PermissionsModifyAllRecords"));
                permList.add(perm);
            }
        }

        String snapshotJson;
        try {
            snapshotJson = objectMapper.writeValueAsString(permList);
        } catch (Exception e) {
            log.error("Failed to serialize snapshot data for profile {}", profileName, e);
            snapshotJson = "[]";
        }

        PermissionSnapshot snapshot = PermissionSnapshot.builder()
                .orgId(orgId)
                .profileId(profileId)
                .profileName(profileName)
                .userCount(records.size())
                .snapshotData(snapshotJson)
                .snappedAt(LocalDateTime.now())
                .build();

        return snapshotRepo.save(snapshot);
    }

    // ------------------------------------------------------------------
    // Comparison
    // ------------------------------------------------------------------

    public PermissionComparison compareProfiles(String orgId, String profileA, String profileB, String comparedBy) {
        PermissionSnapshot snapA = snapshotRepo
                .findFirstByOrgIdAndProfileNameOrderBySnappedAtDesc(orgId, profileA)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No snapshot found for profile: " + profileA + ". Please take a snapshot first."));

        PermissionSnapshot snapB = snapshotRepo
                .findFirstByOrgIdAndProfileNameOrderBySnappedAtDesc(orgId, profileB)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No snapshot found for profile: " + profileB + ". Please take a snapshot first."));

        List<Map<String, Object>> permsA = parseSnapshotData(snapA.getSnapshotData());
        List<Map<String, Object>> permsB = parseSnapshotData(snapB.getSnapshotData());

        // Build lookup maps keyed by objectName
        Map<String, Map<String, Object>> mapA = indexByObjectName(permsA);
        Map<String, Map<String, Object>> mapB = indexByObjectName(permsB);

        Set<String> allObjects = new LinkedHashSet<>();
        allObjects.addAll(mapA.keySet());
        allObjects.addAll(mapB.keySet());

        List<Map<String, Object>> diffRows = new ArrayList<>();
        List<String> permFields = List.of("read", "create", "edit", "delete", "viewAll", "modifyAll");

        for (String objectName : allObjects) {
            Map<String, Object> rowA = mapA.getOrDefault(objectName, Collections.emptyMap());
            Map<String, Object> rowB = mapB.getOrDefault(objectName, Collections.emptyMap());

            boolean hasDiff = false;
            Map<String, Object> diffRow = new LinkedHashMap<>();
            diffRow.put("objectName", objectName);

            for (String field : permFields) {
                Object valA = rowA.get(field);
                Object valB = rowB.get(field);

                // Treat null as false for boolean permission fields
                boolean boolA = Boolean.TRUE.equals(valA);
                boolean boolB = Boolean.TRUE.equals(valB);

                diffRow.put(field + "A", boolA);
                diffRow.put(field + "B", boolB);

                if (boolA != boolB) {
                    hasDiff = true;
                }
            }

            if (hasDiff) {
                diffRows.add(diffRow);
            }
        }

        String diffJson;
        try {
            diffJson = objectMapper.writeValueAsString(diffRows);
        } catch (Exception e) {
            log.error("Failed to serialize diff for profiles {} vs {}", profileA, profileB, e);
            diffJson = "[]";
        }

        PermissionComparison comparison = PermissionComparison.builder()
                .orgId(orgId)
                .profileA(profileA)
                .profileB(profileB)
                .diffJson(diffJson)
                .comparedBy(comparedBy)
                .createdAt(LocalDateTime.now())
                .build();

        return comparisonRepo.save(comparison);
    }

    // ------------------------------------------------------------------
    // Violations
    // ------------------------------------------------------------------

    @CacheEvict(value = "violations", key = "#orgId")
    public List<PermissionViolation> detectViolations(String orgId) {
        OrgConnection org = resolveOrg(orgId);
        LocalDateTime now = LocalDateTime.now();
        List<PermissionViolation> violations = new ArrayList<>();

        // HIGH risk: users with ModifyAllData or ViewAllData system permission
        // PermissionSetAssignment links users to PermissionSets / Profiles
        // We query PermissionSet for system permissions, then join to users
        String highRiskSoql =
                "SELECT Assignee.Id, Assignee.Username, PermissionSet.Name, "
                + "PermissionSet.PermissionsModifyAllData, PermissionSet.PermissionsViewAllData "
                + "FROM PermissionSetAssignment "
                + "WHERE (PermissionSet.PermissionsModifyAllData = true "
                + "OR PermissionSet.PermissionsViewAllData = true) "
                + "AND Assignee.IsActive = true";

        try {
            Map<?, ?> highRiskResult = restApi.query(org, highRiskSoql);
            List<?> highRiskRecords = extractRecords(highRiskResult);

            for (Object rec : highRiskRecords) {
                if (rec instanceof Map<?, ?> map) {
                    Map<?, ?> assignee = (Map<?, ?>) map.get("Assignee");
                    Map<?, ?> permSet = (Map<?, ?>) map.get("PermissionSet");

                    if (assignee == null || permSet == null) continue;

                    String userId = String.valueOf(assignee.get("Id"));
                    String username = String.valueOf(assignee.get("Username"));
                    String psName = String.valueOf(permSet.get("Name"));

                    boolean modifyAll = Boolean.TRUE.equals(permSet.get("PermissionsModifyAllData"));
                    boolean viewAll = Boolean.TRUE.equals(permSet.get("PermissionsViewAllData"));

                    if (modifyAll) {
                        violations.add(PermissionViolation.builder()
                                .orgId(orgId)
                                .sfUserId(userId)
                                .username(username)
                                .permissionType("SystemPermission")
                                .permissionName("ModifyAllData")
                                .riskLevel("HIGH")
                                .notes("User has ModifyAllData via permission set/profile: " + psName)
                                .isAcknowledged(false)
                                .detectedAt(now)
                                .build());
                    }
                    if (viewAll) {
                        violations.add(PermissionViolation.builder()
                                .orgId(orgId)
                                .sfUserId(userId)
                                .username(username)
                                .permissionType("SystemPermission")
                                .permissionName("ViewAllData")
                                .riskLevel("HIGH")
                                .notes("User has ViewAllData via permission set/profile: " + psName)
                                .isAcknowledged(false)
                                .detectedAt(now)
                                .build());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not query HIGH risk violations for org {}: {}", orgId, e.getMessage());
        }

        // MEDIUM risk: users with both ManageUsers AND ResetPasswords
        // Find users who have ManageUsers permission
        String manageUsersSoql =
                "SELECT Assignee.Id, Assignee.Username "
                + "FROM PermissionSetAssignment "
                + "WHERE PermissionSet.PermissionsManageUsers = true "
                + "AND Assignee.IsActive = true";

        String resetPasswordsSoql =
                "SELECT Assignee.Id "
                + "FROM PermissionSetAssignment "
                + "WHERE PermissionSet.PermissionsResetPasswords = true "
                + "AND Assignee.IsActive = true";

        try {
            Map<?, ?> manageResult = restApi.query(org, manageUsersSoql);
            List<?> manageRecords = extractRecords(manageResult);

            Map<?, ?> resetResult = restApi.query(org, resetPasswordsSoql);
            List<?> resetRecords = extractRecords(resetResult);

            // Collect user IDs that have ResetPasswords
            Set<String> resetUserIds = new HashSet<>();
            for (Object rec : resetRecords) {
                if (rec instanceof Map<?, ?> map) {
                    Map<?, ?> assignee = (Map<?, ?>) map.get("Assignee");
                    if (assignee != null) {
                        resetUserIds.add(String.valueOf(assignee.get("Id")));
                    }
                }
            }

            // Find intersection: users with ManageUsers who also have ResetPasswords
            Set<String> alreadyFlagged = new HashSet<>();
            for (Object rec : manageRecords) {
                if (rec instanceof Map<?, ?> map) {
                    Map<?, ?> assignee = (Map<?, ?>) map.get("Assignee");
                    if (assignee == null) continue;

                    String userId = String.valueOf(assignee.get("Id"));
                    String username = String.valueOf(assignee.get("Username"));

                    if (resetUserIds.contains(userId) && alreadyFlagged.add(userId)) {
                        violations.add(PermissionViolation.builder()
                                .orgId(orgId)
                                .sfUserId(userId)
                                .username(username)
                                .permissionType("SystemPermission")
                                .permissionName("ManageUsers+ResetPasswords")
                                .riskLevel("MEDIUM")
                                .notes("User has both ManageUsers and ResetPasswords — potential privilege escalation risk")
                                .isAcknowledged(false)
                                .detectedAt(now)
                                .build());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not query MEDIUM risk violations for org {}: {}", orgId, e.getMessage());
        }

        violationRepo.saveAll(violations);
        log.info("Detected {} violations for org {}", violations.size(), orgId);
        return violations;
    }

    public void acknowledgeViolation(Long id) {
        PermissionViolation violation = violationRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Violation not found: " + id));
        violation.setAcknowledged(true);
        violationRepo.save(violation);
    }

    // ------------------------------------------------------------------
    // Private helpers
    // ------------------------------------------------------------------

    private OrgConnection resolveOrg(String orgId) {
        return orgRepo.findByOrgId(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));
    }

    @SuppressWarnings("unchecked")
    private List<?> extractRecords(Map<?, ?> result) {
        if (result == null) return Collections.emptyList();
        Object records = result.get("records");
        if (records instanceof List<?> list) return list;
        return Collections.emptyList();
    }

    private List<Map<String, Object>> parseSnapshotData(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse snapshot data JSON: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private Map<String, Map<String, Object>> indexByObjectName(List<Map<String, Object>> perms) {
        Map<String, Map<String, Object>> index = new LinkedHashMap<>();
        for (Map<String, Object> perm : perms) {
            Object name = perm.get("objectName");
            if (name != null) {
                index.put(String.valueOf(name), perm);
            }
        }
        return index;
    }
}
