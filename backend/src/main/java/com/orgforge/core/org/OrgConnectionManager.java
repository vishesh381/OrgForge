package com.orgforge.core.org;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Slf4j @Service @RequiredArgsConstructor
public class OrgConnectionManager {

    private final OrgConnectionRepository repo;

    public List<OrgConnection> getAllActiveOrgs() { return repo.findByIsActiveTrue(); }
    public List<OrgConnection> getOrgsByUser(String userId) { return repo.findByConnectedByUserIdAndIsActiveTrue(userId); }

    public OrgConnection getOrg(UUID id) {
        return repo.findById(id).orElseThrow(() -> new RuntimeException("Org not found: " + id));
    }

    public OrgConnection getOrgBySfId(String sfId) {
        return repo.findByOrgId(sfId).orElseThrow(() -> new RuntimeException("Org not found: " + sfId));
    }

    public OrgConnection saveOrg(OrgConnection org) { return repo.save(org); }

    public void disconnectOrg(UUID id) {
        repo.findById(id).ifPresent(org -> {
            org.setActive(false);
            repo.save(org);
            log.info("Disconnected org: {}", org.getOrgName());
        });
    }
}
