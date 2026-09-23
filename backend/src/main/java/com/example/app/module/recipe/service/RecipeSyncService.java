package com.example.app.module.recipe.service;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.exception.ErrorCode;
import com.example.app.module.recipe.dto.NutritionPayload;
import com.example.app.module.recipe.dto.SyncCategoryPayload;
import com.example.app.module.recipe.dto.SyncRecipePayload;
import com.example.app.module.recipe.dto.SyncRequest;
import com.example.app.module.recipe.dto.SyncResult;
import com.example.app.module.recipe.dto.SyncSourcePayload;
import com.example.app.module.recipe.entity.Category;
import com.example.app.module.recipe.entity.Recipe;
import com.example.app.module.recipe.entity.RecipeIngredient;
import com.example.app.module.recipe.entity.RecipeNutrition;
import com.example.app.module.recipe.entity.RecipeStep;
import com.example.app.module.recipe.entity.SyncMeta;
import com.example.app.module.recipe.repository.CategoryRepository;
import com.example.app.module.recipe.repository.RecipeRepository;
import com.example.app.module.recipe.repository.SyncMetaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Write-side service for the admin sync import. Idempotent upsert keyed by
 * sourcePath; upstream-removed recipes are soft-deleted, never hard-deleted.
 */
@Service
@RequiredArgsConstructor
public class RecipeSyncService {

    private final CategoryRepository categoryRepository;
    private final RecipeRepository recipeRepository;
    private final SyncMetaRepository syncMetaRepository;

    @Transactional
    public SyncResult sync(SyncRequest request) {
        Map<String, Category> categories = upsertCategories(request.categories());

        long created = 0;
        long updated = 0;
        for (SyncRecipePayload payload : request.recipes()) {
            Category category = categories.get(payload.categoryKey());
            if (category == null) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                        "菜谱 " + payload.externalId() + " 引用了未知分类：" + payload.categoryKey());
            }
            Recipe recipe = findExisting(payload).orElseGet(Recipe::new);
            boolean isNew = recipe.getId() == null;
            applyPayload(recipe, payload, category);
            recipeRepository.save(recipe);
            if (isNew) {
                created++;
            } else {
                updated++;
            }
        }

        int softDeleted = softDeleteRemovedRecipes(request);
        recordSyncMeta(request.source());
        return new SyncResult(categories.size(), created, updated, softDeleted);
    }

    private Optional<Recipe> findExisting(SyncRecipePayload payload) {
        return recipeRepository.findBySourcePath(payload.sourcePath())
                .or(() -> recipeRepository.findByExternalId(payload.externalId()));
    }

    private Map<String, Category> upsertCategories(List<SyncCategoryPayload> payloads) {
        Map<String, Category> byKey = new HashMap<>();
        for (SyncCategoryPayload payload : payloads) {
            Category category = categoryRepository.findByKey(payload.key()).orElseGet(Category::new);
            category.setKey(payload.key());
            category.setTag(payload.tag());
            category.setEmoji(payload.emoji());
            category.setSortOrder(payload.sortOrder());
            categoryRepository.save(category);
            byKey.put(payload.key(), category);
        }
        return byKey;
    }

    private void applyPayload(Recipe recipe, SyncRecipePayload payload, Category category) {
        recipe.setExternalId(payload.externalId());
        recipe.setName(payload.name());
        recipe.setCategory(category);
        recipe.setImagePath(payload.imagePath());
        recipe.setRawMarkdown(payload.rawMarkdown());
        recipe.setSourcePath(payload.sourcePath());
        recipe.setEstMinutes(payload.estMinutes());
        // Re-importing a soft-deleted recipe revives it.
        recipe.setDeletedAt(null);

        recipe.getIngredients().clear();
        List<String> ingredients = payload.ingredients();
        for (int i = 0; i < ingredients.size(); i++) {
            recipe.getIngredients().add(new RecipeIngredient(recipe, i, ingredients.get(i)));
        }

        recipe.getSteps().clear();
        List<String> steps = payload.steps();
        for (int i = 0; i < steps.size(); i++) {
            recipe.getSteps().add(new RecipeStep(recipe, i, steps.get(i)));
        }

        recipe.getNutritions().clear();
        List<NutritionPayload> nutrition = payload.nutrition() == null ? List.of() : payload.nutrition();
        for (int i = 0; i < nutrition.size(); i++) {
            NutritionPayload item = nutrition.get(i);
            recipe.getNutritions().add(new RecipeNutrition(recipe, i, item.label(), item.value()));
        }
    }

    private int softDeleteRemovedRecipes(SyncRequest request) {
        Set<String> sourcePaths = request.recipes().stream()
                .map(SyncRecipePayload::sourcePath)
                .collect(Collectors.toSet());
        return recipeRepository.softDeleteMissing(sourcePaths, Instant.now());
    }

    private void recordSyncMeta(SyncSourcePayload source) {
        syncMetaRepository.save(new SyncMeta(
                source.repo(),
                source.commit(),
                source.ref(),
                Instant.now()));
    }
}