package com.orgforge.core.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service @RequiredArgsConstructor
public class WebSocketBroker {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcast(String topic, Object payload) {
        messagingTemplate.convertAndSend("/topic/" + topic, payload);
    }

    public void sendToUser(String userId, String topic, Object payload) {
        messagingTemplate.convertAndSendToUser(userId, "/queue/" + topic, payload);
    }
}
