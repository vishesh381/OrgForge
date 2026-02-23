package com.orgforge.core.notification;

import com.orgforge.core.websocket.WebSocketBroker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class NotificationService {

    private final WebSocketBroker broker;

    public void notifyOrg(UUID orgId, String type, String message, Object data) {
        broker.broadcast("notifications." + orgId, Map.of(
            "type", type, "message", message,
            "data", data != null ? data : Map.of(),
            "timestamp", LocalDateTime.now().toString()
        ));
    }

    public void notifyAlert(UUID orgId, String module, String alertType, String message) {
        broker.broadcast("alerts." + orgId, Map.of(
            "module", module, "alertType", alertType,
            "message", message, "severity", "WARNING",
            "timestamp", LocalDateTime.now().toString()
        ));
    }
}
