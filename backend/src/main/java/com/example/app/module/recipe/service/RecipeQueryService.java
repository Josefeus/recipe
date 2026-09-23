package com.example.app.module.recipe.service;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.exception.ErrorCode;
import com.example.app.module.recipe.dto.CategoryResponse;
import com.example.app.module.recipe.dto.RecipeDatasetResponse;
import com.example.app.module.recipe.dto.RecipeDetailResponse;
import com.example.app.module.recipe.dto.RecipeItemResponse;
import com.example.app.module.recipe.dto.SourceResponse;
import com.example.app.module.recipe.entity.Category;
import com.example.app.module.recipe.entity.Recipe;
import com.example.app.module.recipe.entity.RecipeIngredient;
import com.example.app.module.recipe.entity.RecipeNutrition;
import com.example.app.module.recipe.entity.RecipeStep;
import com.example.app.module.recipe.entity.SyncMeta;
import com.example.app.module.recipe.mapper.RecipeMapper;
import com.example.app.module.recipe.repository.CategoryRepository;
import com.example.app.module.recipe.repository.RecipeIngredientRepository;
import com.example.app.module.recipe.repository.RecipeNutritionRepository;
import com.example.app.module.recipe.repository.RecipeRepository;
import com.example.app.module.recipe.repository.RecipeStepRepository;
import com.example.app.module.recipe.repository.SyncMetaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Read-side service assembling the dataset / detail / category payloads.
 */
@Service
@RequiredArgsConstructor
public class RecipeQueryService {

    static final String DEFAULT_SOURCE_REPO = "https://github.com/Gar-b-age/CookLikeHOC";
    static final String SOURCE_NOTE = "菜谱内容整理自《老乡鸡菜品溯源报告》，版权归原作者所有，此处仅作演示数据。";

    private final RecipeRepository recipeRepository;
    private final CategoryRepository categoryRepository;
    private final RecipeIngredientRepository ingredientRepository;
    private final RecipeStepRepository stepRepository;
    private final RecipeNutritionRepository nutritionRepository;
    private final SyncMetaRepository syncMetaRepository;
    private final RecipeMapper recipeMapper;

    @Transactional(readOnly = true)
    public RecipeDatasetResponse getDataset() {
        Map<Long, Long> counts = activeCountsByCategory();

        List<CategoryResponse> categories = categoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(category -> toCategoryResponse(category, counts))
                .toList();

        List<Recipe> recipes = recipeRepository.findAllByDeletedAtIsNull();
        attachChildren(recipes);
        List<RecipeItemResponse> items = recipes.stream()
                .map(recipeMapper::toItem)
                .toList();

        return new RecipeDatasetResponse(Instant.now(), toSourceResponse(), categories, items);
    }

    @Transactional(readOnly = true)
    public RecipeDetailResponse getRecipe(String externalId) {
        Recipe recipe = recipeRepository.findByExternalIdAndDeletedAtIsNull(externalId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "菜谱不存在：" + externalId));
        attachChildren(List.of(recipe));
        return recipeMapper.toDetail(recipe);
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategories() {
        Map<Long, Long> counts = activeCountsByCategory();
        return categoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(category -> toCategoryResponse(category, counts))
                .toList();
    }

    private Map<Long, Long> activeCountsByCategory() {
        return recipeRepository.countActiveByCategory().stream()
                .collect(Collectors.toMap(
                        RecipeRepository.CategoryRecipeCount::getCategoryId,
                        RecipeRepository.CategoryRecipeCount::getRecipeCount));
    }

    private CategoryResponse toCategoryResponse(Category category, Map<Long, Long> counts) {
        return new CategoryResponse(
                category.getKey(),
                category.getTag(),
                category.getEmoji(),
                counts.getOrDefault(category.getId(), 0L));
    }

    /**
     * Batch-fetches ingredients / steps / nutrition for the given recipes and
     * attaches them to the aggregates (three queries total, no N+1).
     */
    private void attachChildren(List<Recipe> recipes) {
        if (recipes.isEmpty()) {
            return;
        }
        List<Long> recipeIds = recipes.stream().map(Recipe::getId).toList();

        Map<Long, List<RecipeIngredient>> ingredients = ingredientRepository.findByRecipeIds(recipeIds).stream()
                .collect(Collectors.groupingBy(item -> item.getRecipe().getId()));
        Map<Long, List<RecipeStep>> steps = stepRepository.findByRecipeIds(recipeIds).stream()
                .collect(Collectors.groupingBy(item -> item.getRecipe().getId()));
        Map<Long, List<RecipeNutrition>> nutritions = nutritionRepository.findByRecipeIds(recipeIds).stream()
                .collect(Collectors.groupingBy(item -> item.getRecipe().getId()));

        for (Recipe recipe : recipes) {
            recipe.setIngredients(ingredients.getOrDefault(recipe.getId(), List.of()));
            recipe.setSteps(steps.getOrDefault(recipe.getId(), List.of()));
            recipe.setNutritions(nutritions.getOrDefault(recipe.getId(), List.of()));
        }
    }

    private SourceResponse toSourceResponse() {
        return syncMetaRepository.findTopByOrderByImportedAtDesc()
                .map(this::toSourceResponse)
                .orElseGet(() -> new SourceResponse(DEFAULT_SOURCE_REPO, SOURCE_NOTE, null, null));
    }

    private SourceResponse toSourceResponse(SyncMeta meta) {
        return new SourceResponse(meta.getRepo(), SOURCE_NOTE, meta.getUpstreamCommit(), meta.getUpstreamRef());
    }
}