package com.orgforge.modules.orgchat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orgforge.core.org.OrgConnection;
import com.orgforge.core.org.OrgConnectionRepository;
import com.orgforge.core.salesforce.RestApiClient;
import com.orgforge.modules.orgchat.model.ChatMessage;
import com.orgforge.modules.orgchat.model.ChatSession;
import com.orgforge.modules.orgchat.repository.ChatMessageRepository;
import com.orgforge.modules.orgchat.repository.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrgChatService {

    private final ClaudeAiService claude;
    private final RestApiClient restApi;
    private final OrgConnectionRepository orgRepo;
    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;
    private final ObjectMapper objectMapper;

    public ChatSession createSession(String orgId, String userId) {
        ChatSession session = ChatSession.builder()
                .orgId(orgId)
                .userId(userId)
                .title("New Chat")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        return sessionRepo.save(session);
    }

    public List<ChatSession> getSessions(String orgId) {
        return sessionRepo.findByOrgIdOrderByUpdatedAtDesc(orgId);
    }

    public List<ChatMessage> getMessages(Long sessionId) {
        return messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    @Transactional
    public ChatMessage sendMessage(Long sessionId, String userContent, String orgId) {
        ChatSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        // 1. Save user message
        ChatMessage userMessage = ChatMessage.builder()
                .session(session)
                .role("user")
                .content(userContent)
                .createdAt(LocalDateTime.now())
                .build();
        messageRepo.save(userMessage);

        // Update session title if this is the first message
        if (session.getTitle().equals("New Chat")) {
            String title = userContent.length() > 50
                    ? userContent.substring(0, 47) + "..."
                    : userContent;
            session.setTitle(title);
        }

        try {
            // 2. Get org connection
            OrgConnection org = orgRepo.findByOrgId(orgId)
                    .orElseThrow(() -> new RuntimeException("Org not found: " + orgId));

            // 3. Get org schema context
            String schemaContext = getSchemaContext(org);

            // 4. Generate SOQL via Claude AI
            String soql = claude.generateSoql(userContent, schemaContext);
            log.info("Generated SOQL for session {}: {}", sessionId, soql);

            // 5. Validate that Claude returned a SOQL query (not a conversational response)
            if (!soql.trim().toUpperCase().startsWith("SELECT")) {
                ChatMessage clarifyMessage = ChatMessage.builder()
                        .session(session)
                        .role("assistant")
                        .content(soql)
                        .createdAt(LocalDateTime.now())
                        .build();
                ChatMessage saved = messageRepo.save(clarifyMessage);
                session.setUpdatedAt(LocalDateTime.now());
                sessionRepo.save(session);
                return saved;
            }

            // 6. Execute SOQL against Salesforce
            @SuppressWarnings("unchecked")
            Map<String, Object> queryResponse = (Map<String, Object>) restApi.query(org, soql);

            // 7. Serialize results to JSON string
            String queryResultsJson = objectMapper.writeValueAsString(queryResponse);

            // 8. Build assistant message
            ChatMessage assistantMessage = ChatMessage.builder()
                    .session(session)
                    .role("assistant")
                    .content("Here are the results for your query.")
                    .soqlQuery(soql)
                    .queryResults(queryResultsJson)
                    .createdAt(LocalDateTime.now())
                    .build();

            // 8. Save assistant message and update session
            ChatMessage saved = messageRepo.save(assistantMessage);
            session.setUpdatedAt(LocalDateTime.now());
            sessionRepo.save(session);

            return saved;

        } catch (Exception e) {
            log.error("Error processing message for session {}: {}", sessionId, e.getMessage(), e);

            // 9. Save error message instead
            ChatMessage errorMessage = ChatMessage.builder()
                    .session(session)
                    .role("assistant")
                    .content("I encountered an error processing your request.")
                    .errorMessage(e.getMessage())
                    .createdAt(LocalDateTime.now())
                    .build();

            ChatMessage saved = messageRepo.save(errorMessage);
            session.setUpdatedAt(LocalDateTime.now());
            sessionRepo.save(session);

            return saved;
        }
    }

    @Transactional
    public void deleteSession(Long sessionId) {
        // Delete all messages in the session first
        List<ChatMessage> messages = messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
        messageRepo.deleteAll(messages);
        sessionRepo.deleteById(sessionId);
    }

    private String getSchemaContext(OrgConnection org) {
        try {
            String sobjectsUrl = org.getInstanceUrl() + "/services/data/v" + org.getApiVersion() + "/sobjects";

            @SuppressWarnings("unchecked")
            Map<String, Object> response = (Map<String, Object>) restApi.get(org, sobjectsUrl);

            if (response != null && response.containsKey("sobjects")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> sobjects = (List<Map<String, Object>>) response.get("sobjects");

                String names = sobjects.stream()
                        .map(obj -> (String) obj.get("name"))
                        .filter(Objects::nonNull)
                        .limit(200)
                        .collect(Collectors.joining(", "));

                return "Available sObjects: " + names;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch org schema context: {}", e.getMessage());
        }
        return "Standard Salesforce objects: Account, Contact, Lead, Opportunity, Case, Task, Event, User";
    }
}
