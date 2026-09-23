package com.example.app.module.recipe.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Nutrition item inside the import payload.
 */
public record NutritionPayload(
        @NotBlank(message = "营养成分名不能为空") @Size(max = 128, message = "营养成分名长度不能超过 128") String label,
        @NotBlank(message = "营养成分值不能为空") @Size(max = 128, message = "营养成分值长度不能超过 128") String value) {
}