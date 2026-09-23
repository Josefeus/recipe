package com.example.app.module.recipe.repository;

import com.example.app.module.recipe.entity.SyncMeta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SyncMetaRepository extends JpaRepository<SyncMeta, Long> {

    /** Latest successful import; exposed by the dataset API as `source`. */
    Optional<SyncMeta> findTopByOrderByImportedAtDesc();
}