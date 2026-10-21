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
import com.example.app.module.recipe.entity.SyncMeta;
import com.example.app.module.recipe.repository.CategoryRepository;
import com.example.app.module.recipe.repository.RecipeRepository;
import com.example.app.module.recipe.repository.SyncMetaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecipeSyncServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private RecipeRepository recipeRepository;

    @Mock
    private SyncMetaRepository syncMetaRepository;

    @InjectMocks
    private RecipeSyncService service;

    @Test
    void importingNewRecipeCreatesRow() {
        when(categoryRepository.findByKey("炒菜")).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(recipeRepository.findBySourcePath("炒菜/test.md")).thenReturn(Optional.empty());
        when(recipeRepository.findByExternalId("r000000001")).thenReturn(Optional.empty());
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> {
            Recipe recipe = invocation.getArgument(0);
            recipe.setId(1L);
            return recipe;
        });
        when(recipeRepository.softDeleteMissing(anySet(), any(Instant.class))).thenReturn(0);
        when(syncMetaRepository.save(any(SyncMeta.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SyncResult result = service.sync(payload());

        assertThat(result.recipesCreated()).isEqualTo(1);
        assertThat(result.recipesUpdated()).isZero();
        assertThat(result.categoriesUpserted()).isEqualTo(1);
        assertThat(result.recipesSoftDeleted()).isZero();
    }

    @Test
    void reimportingSamePayloadUpdatesExistingRowIdempotently() {
        Category existingCategory = new Category();
        existingCategory.setId(7L);
        existingCategory.setKey("炒菜");
        Recipe existingRecipe = existingRecipe();

        when(categoryRepository.findByKey("炒菜")).thenReturn(Optional.of(existingCategory));
        when(recipeRepository.findBySourcePath("炒菜/test.md")).thenReturn(Optional.of(existingRecipe));
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(recipeRepository.softDeleteMissing(anySet(), any(Instant.class))).thenReturn(0);
        when(syncMetaRepository.save(any(SyncMeta.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SyncResult result = service.sync(payload());

        assertThat(result.recipesCreated()).isZero();
        assertThat(result.recipesUpdated()).isEqualTo(1);
        assertThat(existingRecipe.getIngredients()).hasSize(1);
        assertThat(existingRecipe.getSteps()).hasSize(1);
        assertThat(existingRecipe.getNutritions()).hasSize(1);
        assertThat(existingRecipe.getDeletedAt()).isNull();
        assertThat(existingRecipe.getCategory()).isSameAs(existingCategory);
    }

    @Test
    void removedRecipesAreSoftDeletedByPath() {
        Category existingCategory = new Category();
        existingCategory.setKey("炒菜");
        Recipe existingRecipe = existingRecipe();

        when(categoryRepository.findByKey("炒菜")).thenReturn(Optional.of(existingCategory));
        when(recipeRepository.findBySourcePath("炒菜/test.md")).thenReturn(Optional.of(existingRecipe));
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(recipeRepository.softDeleteMissing(anySet(), any(Instant.class))).thenReturn(2);
        when(syncMetaRepository.save(any(SyncMeta.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SyncResult result = service.sync(payload());

        assertThat(result.recipesSoftDeleted()).isEqualTo(2);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Set<String>> pathsCaptor = ArgumentCaptor.forClass(Set.class);
        ArgumentCaptor<Instant> timeCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(recipeRepository).softDeleteMissing(pathsCaptor.capture(), timeCaptor.capture());
        assertThat(pathsCaptor.getValue()).containsExactly("炒菜/test.md");
        assertThat(timeCaptor.getValue()).isNotNull();
    }

    @Test
    void unknownCategoryIsRejected() {
        when(categoryRepository.findByKey("炒菜")).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SyncRequest request = new SyncRequest(
                List.of(new SyncCategoryPayload("炒菜", "快炒", "🥘", 0)),
                List.of(new SyncRecipePayload(
                        "r000000001", "测试菜", "炖菜", "炖菜/test.md", "# md",
                        null, 20, List.of("食材"), List.of("步骤"), List.of())),
                new SyncSourcePayload("https://example.com", "c1", "main"));

        assertThatThrownBy(() -> service.sync(request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.BAD_REQUEST);
        verify(recipeRepository, never()).save(any(Recipe.class));
        verify(recipeRepository, never()).softDeleteMissing(anyCollection(), any(Instant.class));
    }

    private SyncRequest payload() {
        return new SyncRequest(
                List.of(new SyncCategoryPayload("炒菜", "快炒", "🥘", 0)),
                List.of(new SyncRecipePayload(
                        "r000000001",
                        "测试菜",
                        "炒菜",
                        "炒菜/test.md",
                        "# 测试菜",
                        "/images/test.jpg",
                        20,
                        List.of("五花肉"),
                        List.of("焯水 30 秒"),
                        List.of(new NutritionPayload("热量", "376 Kcal")))),
                new SyncSourcePayload("https://github.com/Gar-b-age/CookLikeHOC", "abc123", "main"));
    }

    private Recipe existingRecipe() {
        Recipe recipe = new Recipe();
        recipe.setId(1L);
        recipe.setExternalId("r000000001");
        recipe.setSourcePath("炒菜/test.md");
        return recipe;
    }
}