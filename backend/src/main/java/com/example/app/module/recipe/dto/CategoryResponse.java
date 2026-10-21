package com.example.app.module.recipe.dto;

/**
 * Category with the live count of its non-deleted recipes.
 */
public record CategoryResponse(String key, String tag, String emoji, long count) {
}