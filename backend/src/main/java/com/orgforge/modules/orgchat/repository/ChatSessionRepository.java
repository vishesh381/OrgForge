package com.orgforge.modules.orgchat.repository;

import com.orgforge.modules.orgchat.model.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    List<ChatSession> findByOrgIdOrderByUpdatedAtDesc(String orgId);
}
