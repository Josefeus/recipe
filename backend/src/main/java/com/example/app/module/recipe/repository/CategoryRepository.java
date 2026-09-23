package com.example.app.module.recipe.repository;

import com.example.app.module.recipe.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findByKey(String key);

    List<Category> findAllByOrderBySortOrderAsc();
}