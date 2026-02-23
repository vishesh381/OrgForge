package com.orgforge.modules.orgchat.repository;

import com.orgforge.modules.orgchat.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    List<ChatMessage> findTop10BySessionIdOrderByCreatedAtDesc(Long sessionId);
}
