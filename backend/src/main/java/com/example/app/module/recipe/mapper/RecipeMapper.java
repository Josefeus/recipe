package com.example.app.module.recipe.mapper;

import com.example.app.module.recipe.dto.NutritionItemResponse;
import com.example.app.module.recipe.dto.RecipeDetailResponse;
import com.example.app.module.recipe.dto.RecipeItemResponse;
import com.example.app.module.recipe.entity.Recipe;
import com.example.app.module.recipe.entity.RecipeIngredient;
import com.example.app.module.recipe.entity.RecipeNutrition;
import com.example.app.module.recipe.entity.RecipeStep;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Maps recipe aggregates to API response payloads. Field mapping is trivial,
 * so this is a plain component instead of a MapStruct generated mapper.
 */
@Component
public class RecipeMapper {

    public RecipeItemResponse toItem(Recipe recipe) {
        return new RecipeItemResponse(
                recipe.getExternalId(),
                recipe.getName(),
                recipe.getCategory().getKey(),
                recipe.getImagePath(),
                toIngredientContents(recipe.getIngredients()),
                toStepContents(recipe.getSteps()),
                toNutrition(recipe.getNutritions()),
                recipe.getEstMinutes());
    }

    public RecipeDetailResponse toDetail(Recipe recipe) {
        return new RecipeDetailResponse(
                recipe.getExternalId(),
                recipe.getName(),
                recipe.getCategory().getKey(),
                recipe.getImagePath(),
                toIngredientContents(recipe.getIngredients()),
                toStepContents(recipe.getSteps()),
                toNutrition(recipe.getNutritions()),
                recipe.getEstMinutes(),
                recipe.getRawMarkdown());
    }

    private List<String> toIngredientContents(List<RecipeIngredient> ingredients) {
        return ingredients.stream().map(RecipeIngredient::getContent).toList();
    }

    private List<String> toStepContents(List<RecipeStep> steps) {
        return steps.stream().map(RecipeStep::getContent).toList();
    }

    private List<NutritionItemResponse> toNutrition(List<RecipeNutrition> nutritions) {
        return nutritions.stream()
                .map(item -> new NutritionItemResponse(item.getLabel(), item.getValue()))
                .toList();
    }
}