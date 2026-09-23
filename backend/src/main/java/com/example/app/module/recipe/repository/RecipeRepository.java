package com.example.app.module.recipe.repository;

import com.example.app.module.recipe.entity.Recipe;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    /** Active (not soft-deleted) recipe by its stable business id. */
    Optional<Recipe> findByExternalIdAndDeletedAtIsNull(String externalId);

    /** Sync lookup by source path; must see soft-deleted rows so re-import can revive them. */
    Optional<Recipe> findBySourcePath(String sourcePath);

    /** Sync fallback lookup; must see soft-deleted rows so re-import can revive them. */
    Optional<Recipe> findByExternalId(String externalId);

    /** All active recipes with their category; children are batch-fetched separately. */
    @EntityGraph(attributePaths = "category")
    List<Recipe> findAllByDeletedAtIsNull();

    /** Active recipe count grouped by category for dataset/category responses. */
    @Query("""
            select r.category.id as categoryId, count(r) as recipeCount
            from Recipe r
            where r.deletedAt is null
            group by r.category.id
            """)
    List<CategoryRecipeCount> countActiveByCategory();

    /**
     * Soft-deletes every active recipe whose source path is absent from the
     * incoming sync payload. JPQL bulk update bypasses the persistence context,
     * so callers must invoke it after all upserts are flushed.
     */
    @Modifying
    @Query("""
            update Recipe r
            set r.deletedAt = :deletedAt
            where r.deletedAt is null
              and r.sourcePath not in :sourcePaths
            """)
    int softDeleteMissing(@Param("sourcePaths") Collection<String> sourcePaths,
                          @Param("deletedAt") Instant deletedAt);

    /** Projection row of {@link #countActiveByCategory()}. */
    interface CategoryRecipeCount {

        Long getCategoryId();

        Long getRecipeCount();
    }
}