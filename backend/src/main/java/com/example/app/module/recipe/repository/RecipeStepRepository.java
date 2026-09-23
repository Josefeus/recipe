package com.example.app.module.recipe.repository;

import com.example.app.module.recipe.entity.RecipeStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface RecipeStepRepository extends JpaRepository<RecipeStep, Long> {

    /** Batch fetch for a set of recipes; avoids N+1 queries when assembling the dataset. */
    @Query("""
            select s from RecipeStep s
            where s.recipe.id in :recipeIds
            order by s.recipe.id asc, s.sortOrder asc
            """)
    List<RecipeStep> findByRecipeIds(@Param("recipeIds") Collection<Long> recipeIds);
}