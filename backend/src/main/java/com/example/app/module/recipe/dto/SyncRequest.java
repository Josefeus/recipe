package com.example.app.module.recipe.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Admin import payload assembled by scripts/sync-cooklikehoc.mjs.
 */
public record SyncRequest(
        @NotEmpty(message = "分类列表不能为空") @Valid List<SyncCategoryPayload> categories,
        @NotEmpty(message = "菜谱列表不能为空") @Valid List<SyncRecipePayload> recipes,
        @Valid SyncSourcePayload source) {
}