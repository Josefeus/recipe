package com.example.app.module.recipe.repository;

import com.example.app.module.recipe.entity.RecipeIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface RecipeIngredientRepository extends JpaRepository<RecipeIngredient, Long> {

    /** Batch fetch for a set of recipes; avoids N+1 queries when assembling the dataset. */
    @Query("""
            select i from RecipeIngredient i
            where i.recipe.id in :recipeIds
            order by i.recipe.id asc, i.sortOrder asc
            """)
    List<RecipeIngredient> findByRecipeIds(@Param("recipeIds") Collection<Long> recipeIds);
}