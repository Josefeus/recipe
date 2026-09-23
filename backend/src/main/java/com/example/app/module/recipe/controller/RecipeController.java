package com.example.app.module.recipe.controller;

import com.example.app.common.api.ApiResponse;
import com.example.app.module.recipe.dto.RecipeDatasetResponse;
import com.example.app.module.recipe.dto.RecipeDetailResponse;
import com.example.app.module.recipe.service.RecipeQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/recipes")
@RequiredArgsConstructor
@Tag(name = "Recipes", description = "菜谱查询接口")
public class RecipeController {

    private final RecipeQueryService recipeQueryService;

    @GetMapping
    @Operation(summary = "获取全量菜谱数据集",
            description = "返回 generatedAt/source/categories(含实时统计)/recipes，结构与前端 RecipeDataset 类型兼容。")
    public ApiResponse<RecipeDatasetResponse> getDataset() {
        return ApiResponse.ok(recipeQueryService.getDataset());
    }

    @GetMapping("/{externalId}")
    @Operation(summary = "获取菜谱详情", description = "包含 md 原文 rawMarkdown；菜谱不存在或已软删除时返回 404。")
    public ApiResponse<RecipeDetailResponse> getRecipe(
            @Parameter(description = "菜谱业务 ID，如 r46227ed495", example = "r46227ed495")
            @PathVariable String externalId) {
        return ApiResponse.ok(recipeQueryService.getRecipe(externalId));
    }
}