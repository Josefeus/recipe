package com.example.app.module.recipe.repository;

import com.example.app.module.recipe.entity.RecipeNutrition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface RecipeNutritionRepository extends JpaRepository<RecipeNutrition, Long> {

    /** Batch fetch for a set of recipes; avoids N+1 queries when assembling the dataset. */
    @Query("""
            select n from RecipeNutrition n
            where n.recipe.id in :recipeIds
            order by n.recipe.id asc, n.sortOrder asc
            """)
    List<RecipeNutrition> findByRecipeIds(@Param("recipeIds") Collection<Long> recipeIds);
}