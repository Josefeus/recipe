package com.example.app.module.recipe.dto;

/**
 * One nutrition key/value pair, mirroring the frontend NutritionItem type.
 */
public record NutritionItemResponse(String label, String value) {
}