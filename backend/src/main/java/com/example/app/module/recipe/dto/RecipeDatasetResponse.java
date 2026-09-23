package com.example.app.module.recipe.dto;

import java.time.Instant;
import java.util.List;

/**
 * Full dataset payload, shape-compatible with the frontend RecipeDataset type.
 */
public record RecipeDatasetResponse(
        Instant generatedAt,
        SourceResponse source,
        List<CategoryResponse> categories,
        List<RecipeItemResponse> recipes) {
}