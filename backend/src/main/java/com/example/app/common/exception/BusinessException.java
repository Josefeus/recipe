package com.example.app.common.exception;

import lombok.Getter;

/**
 * Business failure carrying a machine-readable ErrorCode and a human-readable message.
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}