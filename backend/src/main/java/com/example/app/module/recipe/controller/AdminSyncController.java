package com.example.app.module.recipe.controller;

import com.example.app.common.api.ApiResponse;
import com.example.app.module.recipe.dto.SyncRequest;
import com.example.app.module.recipe.dto.SyncResult;
import com.example.app.module.recipe.service.RecipeSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "管理端接口（Bearer token 鉴权）")
public class AdminSyncController {

    private final RecipeSyncService recipeSyncService;

    @PostMapping("/sync")
    @SecurityRequirement(name = "AdminToken")
    @Operation(summary = "导入上游菜谱数据",
            description = "单事务内按 sourcePath 幂等 upsert 分类与菜谱；上游已移除的菜谱做软删除。需 Authorization: Bearer <ADMIN_TOKEN>。")
    public ApiResponse<SyncResult> sync(@Valid @RequestBody SyncRequest request) {
        return ApiResponse.ok(recipeSyncService.sync(request));
    }
}