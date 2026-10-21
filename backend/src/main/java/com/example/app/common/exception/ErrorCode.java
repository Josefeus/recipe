package com.example.app.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Business error codes aligned with the API contract in docs/specs/backend-recipes/design.md.
 */
public enum ErrorCode {
    BAD_REQUEST(40000, HttpStatus.BAD_REQUEST),
    UNAUTHORIZED(40100, HttpStatus.UNAUTHORIZED),
    NOT_FOUND(40400, HttpStatus.NOT_FOUND),
    INTERNAL_ERROR(50000, HttpStatus.INTERNAL_SERVER_ERROR);

    private final int code;
    private final HttpStatus httpStatus;

    ErrorCode(int code, HttpStatus httpStatus) {
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public int getCode() {
        return code;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }
}