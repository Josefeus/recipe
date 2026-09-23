package com.example.app.module.recipe.controller;

import com.example.app.common.api.ApiResponse;
import com.example.app.module.recipe.dto.CategoryResponse;
import com.example.app.module.recipe.service.RecipeQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "菜谱分类接口")
public class CategoryController {

    private final RecipeQueryService recipeQueryService;

    @GetMapping
    @Operation(summary = "获取分类列表", description = "按分类排序输出，count 为该分类下未删除菜谱数。")
    public ApiResponse<List<CategoryResponse>> getCategories() {
        return ApiResponse.ok(recipeQueryService.getCategories());
    }
}