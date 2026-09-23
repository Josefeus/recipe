package com.example.app.common.api;

import com.example.app.common.exception.ErrorCode;

/**
 * Unified response envelope: { code, message, data }.
 * code 0 means success; failures use business codes (see ErrorCode).
 */
public record ApiResponse<T>(int code, String message, T data) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(0, "ok", data);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, String message) {
        return new ApiResponse<>(errorCode.getCode(), message, null);
    }
}