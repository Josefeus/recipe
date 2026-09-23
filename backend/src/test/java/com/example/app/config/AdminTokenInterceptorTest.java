package com.example.app.config;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AdminTokenInterceptorTest {

    private final MockHttpServletRequest request = new MockHttpServletRequest();
    private final MockHttpServletResponse response = new MockHttpServletResponse();

    @Test
    void rejectsEverythingWhenTokenNotConfigured() {
        AdminTokenInterceptor interceptor = new AdminTokenInterceptor(" ");
        request.addHeader("Authorization", "Bearer anything");

        assertThatThrownBy(() -> interceptor.preHandle(request, response, new Object()))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void rejectsMissingAuthorizationHeader() {
        AdminTokenInterceptor interceptor = new AdminTokenInterceptor("secret");

        assertThatThrownBy(() -> interceptor.preHandle(request, response, new Object()))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void rejectsWrongToken() {
        AdminTokenInterceptor interceptor = new AdminTokenInterceptor("secret");
        request.addHeader("Authorization", "Bearer wrong");

        assertThatThrownBy(() -> interceptor.preHandle(request, response, new Object()))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void acceptsMatchingToken() {
        AdminTokenInterceptor interceptor = new AdminTokenInterceptor("secret");
        request.addHeader("Authorization", "Bearer secret");

        assertThat(interceptor.preHandle(request, response, new Object())).isTrue();
    }
}