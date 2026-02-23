package com.orgforge.core.exception;

public class SalesforceApiException extends RuntimeException {
    public SalesforceApiException(String message) { super(message); }
    public SalesforceApiException(String message, Throwable cause) { super(message, cause); }
}
