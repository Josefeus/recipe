package com.example.app.module.recipe.dto;

import java.util.List;

/**
 * Recipe detail including the full upstream markdown for future detail pages.
 */
public record RecipeDetailResponse(
        String id,
        String name,
        String category,
        String image,
        List<String> ingredients,
        List<String> steps,
        List<NutritionItemResponse> nutrition,
        Integer estMinutes,
        String rawMarkdown) {
}