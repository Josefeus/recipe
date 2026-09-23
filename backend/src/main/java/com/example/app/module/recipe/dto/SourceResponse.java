package com.example.app.module.recipe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Upstream source info of the dataset. commit/ref are omitted when unknown so
 * the payload stays compatible with the optional fields of RecipeSource.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SourceResponse(String repo, String note, String commit, String ref) {
}