package com.example.app.module.recipe.dto;

import java.util.List;

/**
 * One recipe in the dataset / detail payload, mirroring the frontend Recipe type.
 * image stays explicit null when the dish has no photo (frontend expects the key).
 */
public record RecipeItemResponse(
        String id,
        String name,
        String category,
        String image,
        List<String> ingredients,
        List<String> steps,
        List<NutritionItemResponse> nutrition,
        Integer estMinutes) {
}