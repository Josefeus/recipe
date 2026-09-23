package com.example.app.module.recipe.dto;

/**
 * Import statistics returned by the admin sync endpoint.
 */
public record SyncResult(
        long categoriesUpserted,
        long recipesCreated,
        long recipesUpdated,
        long recipesSoftDeleted) {
}