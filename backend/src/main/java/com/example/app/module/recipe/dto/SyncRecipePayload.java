package com.example.app.module.recipe.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * One recipe inside the import payload, including the full markdown content.
 */
public record SyncRecipePayload(
        @NotBlank(message = "菜谱 ID 不能为空") @Size(max = 32, message = "菜谱 ID 长度不能超过 32") String externalId,
        @NotBlank(message = "菜谱名不能为空") @Size(max = 255, message = "菜谱名长度不能超过 255") String name,
        @NotBlank(message = "所属分类 key 不能为空") String categoryKey,
        @NotBlank(message = "sourcePath 不能为空") @Size(max = 512, message = "sourcePath 长度不能超过 512") String sourcePath,
        @NotBlank(message = "md 原文不能为空") String rawMarkdown,
        @Size(max = 512, message = "imagePath 长度不能超过 512") String imagePath,
        @PositiveOrZero(message = "estMinutes 不能为负数") Integer estMinutes,
        @NotEmpty(message = "食材列表不能为空") List<@NotBlank(message = "食材内容不能为空") String> ingredients,
        @NotEmpty(message = "步骤列表不能为空") List<@NotBlank(message = "步骤内容不能为空") String> steps,
        @Valid List<NutritionPayload> nutrition) {
}