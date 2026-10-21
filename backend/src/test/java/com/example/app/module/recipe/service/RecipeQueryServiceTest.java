package com.example.app.module.recipe.service;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.exception.ErrorCode;
import com.example.app.module.recipe.dto.RecipeDatasetResponse;
import com.example.app.module.recipe.dto.RecipeDetailResponse;
import com.example.app.module.recipe.entity.Category;
import com.example.app.module.recipe.entity.Recipe;
import com.example.app.module.recipe.entity.RecipeIngredient;
import com.example.app.module.recipe.entity.RecipeStep;
import com.example.app.module.recipe.entity.SyncMeta;
import com.example.app.module.recipe.mapper.RecipeMapper;
import com.example.app.module.recipe.repository.CategoryRepository;
import com.example.app.module.recipe.repository.RecipeIngredientRepository;
import com.example.app.module.recipe.repository.RecipeNutritionRepository;
import com.example.app.module.recipe.repository.RecipeRepository;
import com.example.app.module.recipe.repository.RecipeStepRepository;
import com.example.app.module.recipe.repository.SyncMetaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Spy;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecipeQueryServiceTest {

    @Mock
    private RecipeRepository recipeRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private RecipeIngredientRepository ingredientRepository;

    @Mock
    private RecipeStepRepository stepRepository;

    @Mock
    private RecipeNutritionRepository nutritionRepository;

    @Mock
    private SyncMetaRepository syncMetaRepository;

    @Spy
    private RecipeMapper recipeMapper = new RecipeMapper();

    @InjectMocks
    private RecipeQueryService service;

    @Test
    void datasetAssemblesCategoriesCountsAndRecipes() {
        Category category = category();
        Recipe recipe = recipe(category);

        when(recipeRepository.countActiveByCategory())
                .thenReturn(List.of(new CountRow(1L, 3L)));
        when(categoryRepository.findAllByOrderBySortOrderAsc()).thenReturn(List.of(category));
        when(recipeRepository.findAllByDeletedAtIsNull()).thenReturn(List.of(recipe));
        when(ingredientRepository.findByRecipeIds(anyCollection()))
                .thenReturn(List.of(new RecipeIngredient(recipe, 0, "五花肉")));
        when(stepRepository.findByRecipeIds(anyCollection()))
                .thenReturn(List.of(new RecipeStep(recipe, 0, "焯水 30 秒")));
        lenient().when(nutritionRepository.findByRecipeIds(anyCollection())).thenReturn(List.of());
        when(syncMetaRepository.findTopByOrderByImportedAtDesc())
                .thenReturn(Optional.of(new SyncMeta("https://github.com/Gar-b-age/CookLikeHOC", "abc123", "main", Instant.now())));

        RecipeDatasetResponse dataset = service.getDataset();

        assertThat(dataset.generatedAt()).isNotNull();
        assertThat(dataset.source().commit()).isEqualTo("abc123");
        assertThat(dataset.source().ref()).isEqualTo("main");
        assertThat(dataset.source().note()).isEqualTo(RecipeQueryService.SOURCE_NOTE);
        assertThat(dataset.categories()).hasSize(1);
        assertThat(dataset.categories().get(0).count()).isEqualTo(3);
        assertThat(dataset.recipes()).hasSize(1);
        assertThat(dataset.recipes().get(0).id()).isEqualTo("r000000001");
        assertThat(dataset.recipes().get(0).ingredients()).containsExactly("五花肉");
        assertThat(dataset.recipes().get(0).steps()).containsExactly("焯水 30 秒");
        assertThat(dataset.recipes().get(0).estMinutes()).isEqualTo(20);
    }

    @Test
    void datasetWithoutSyncMetaFallsBackToDefaultSource() {
        Category category = category();
        Recipe recipe = recipe(category);

        when(recipeRepository.countActiveByCategory()).thenReturn(List.of());
        when(categoryRepository.findAllByOrderBySortOrderAsc()).thenReturn(List.of(category));
        when(recipeRepository.findAllByDeletedAtIsNull()).thenReturn(List.of());
        when(syncMetaRepository.findTopByOrderByImportedAtDesc()).thenReturn(Optional.empty());

        RecipeDatasetResponse dataset = service.getDataset();

        assertThat(dataset.source().repo()).isEqualTo(RecipeQueryService.DEFAULT_SOURCE_REPO);
        assertThat(dataset.source().commit()).isNull();
        assertThat(dataset.recipes()).isEmpty();
        assertThat(dataset.categories().get(0).count()).isZero();
    }

    @Test
    void detailIncludesRawMarkdown() {
        Category category = category();
        Recipe recipe = recipe(category);

        when(recipeRepository.findByExternalIdAndDeletedAtIsNull("r000000001"))
                .thenReturn(Optional.of(recipe));
        when(ingredientRepository.findByRecipeIds(anyCollection())).thenReturn(List.of());
        when(stepRepository.findByRecipeIds(anyCollection())).thenReturn(List.of());
        when(nutritionRepository.findByRecipeIds(anyCollection())).thenReturn(List.of());

        RecipeDetailResponse detail = service.getRecipe("r000000001");

        assertThat(detail.rawMarkdown()).isEqualTo("# 测试菜");
        assertThat(detail.image()).isEqualTo("/images/test.jpg");
    }

    @Test
    void missingRecipeYieldsNotFound() {
        when(recipeRepository.findByExternalIdAndDeletedAtIsNull("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getRecipe("missing"))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.NOT_FOUND);
    }

    private Category category() {
        Category category = new Category();
        category.setId(1L);
        category.setKey("炒菜");
        category.setTag("快炒");
        category.setEmoji("🥘");
        category.setSortOrder(0);
        return category;
    }

    private Recipe recipe(Category category) {
        Recipe recipe = new Recipe();
        recipe.setId(10L);
        recipe.setExternalId("r000000001");
        recipe.setName("测试菜");
        recipe.setCategory(category);
        recipe.setImagePath("/images/test.jpg");
        recipe.setRawMarkdown("# 测试菜");
        recipe.setSourcePath("炒菜/test.md");
        recipe.setEstMinutes(20);
        return recipe;
    }

    private record CountRow(Long categoryId, Long recipeCount)
            implements RecipeRepository.CategoryRecipeCount {

        @Override
        public Long getCategoryId() {
            return categoryId;
        }

        @Override
        public Long getRecipeCount() {
            return recipeCount;
        }
    }
}