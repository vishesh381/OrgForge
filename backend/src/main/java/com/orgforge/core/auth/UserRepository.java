package com.orgforge.core.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<OrgForgeUser, UUID> {
    Optional<OrgForgeUser> findByEmail(String email);
    boolean existsByEmail(String email);
}
