package com.orgforge.modules.orgchat.controller;

import com.orgforge.modules.orgchat.model.ChatMessage;
import com.orgforge.modules.orgchat.model.ChatSession;
import com.orgforge.modules.orgchat.service.OrgChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/org-chat")
@RequiredArgsConstructor
public class OrgChatController {

    private final OrgChatService orgChatService;

    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSession>> getSessions(@RequestParam String orgId) {
        return ResponseEntity.ok(orgChatService.getSessions(orgId));
    }

    @PostMapping("/sessions")
    public ResponseEntity<ChatSession> createSession(
            @RequestParam String orgId,
            @RequestParam(required = false, defaultValue = "anonymous") String userId) {
        return ResponseEntity.ok(orgChatService.createSession(orgId, userId));
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable Long id) {
        orgChatService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sessions/{id}/messages")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable Long id) {
        return ResponseEntity.ok(orgChatService.getMessages(id));
    }

    @PostMapping("/sessions/{id}/messages")
    public ResponseEntity<ChatMessage> sendMessage(
            @PathVariable Long id,
            @RequestParam String orgId,
            @RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(orgChatService.sendMessage(id, content, orgId));
    }
}
