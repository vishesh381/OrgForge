package com.orgforge.core.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.time.LocalDateTime;
import java.util.Map;

@Slf4j @RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        log.error("Runtime error: {}", ex.getMessage(), ex);
        return err(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return err(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(SalesforceApiException.class)
    public ResponseEntity<Map<String, Object>> handleSf(SalesforceApiException ex) {
        log.error("SF API error: {}", ex.getMessage());
        return err(HttpStatus.BAD_GATEWAY, "Salesforce API error: " + ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> err(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
            "error", status.getReasonPhrase(),
            "message", message != null ? message : "Unknown error",
            "timestamp", LocalDateTime.now().toString()
        ));
    }
}
