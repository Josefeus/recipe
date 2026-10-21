package com.example.app.config;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Protects /api/v1/admin/** with a static Bearer token injected via the
 * ADMIN_TOKEN environment variable. When the token is not configured the
 * endpoints reject every request.
 */
@Component
public class AdminTokenInterceptor implements HandlerInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final String adminToken;

    public AdminTokenInterceptor(@Value("${app.admin.token:}") String adminToken) {
        this.adminToken = adminToken == null ? "" : adminToken.trim();
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (adminToken.isEmpty()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "服务端未配置管理 token，拒绝导入");
        }
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "缺少管理凭证");
        }
        String token = header.substring(BEARER_PREFIX.length()).trim();
        if (!MessageDigest.isEqual(
                adminToken.getBytes(StandardCharsets.UTF_8),
                token.getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "管理 token 错误");
        }
        return true;
    }
}