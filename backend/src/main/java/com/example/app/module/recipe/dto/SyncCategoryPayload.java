package com.example.app.module.recipe.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Category definition inside the import payload.
 */
public record SyncCategoryPayload(
        @NotBlank(message = "分类 key 不能为空") @Size(max = 64, message = "分类 key 长度不能超过 64") String key,
        @NotBlank(message = "分类 tag 不能为空") @Size(max = 64, message = "分类 tag 长度不能超过 64") String tag,
        @Size(max = 16, message = "分类 emoji 长度不能超过 16") String emoji,
        @NotNull(message = "分类排序不能为空") @PositiveOrZero(message = "分类排序不能为负数") Integer sortOrder) {
}