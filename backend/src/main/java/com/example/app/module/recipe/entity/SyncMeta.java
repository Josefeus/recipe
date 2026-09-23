package com.example.app.module.recipe.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Upstream source meta recorded on every successful import. The dataset API
 * exposes the latest row as `source` (repo / commit / ref).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "sync_meta")
public class SyncMeta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 512)
    private String repo;

    @Column(name = "upstream_commit", length = 64)
    private String upstreamCommit;

    @Column(name = "upstream_ref", length = 128)
    private String upstreamRef;

    @Column(name = "imported_at", nullable = false)
    private Instant importedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public SyncMeta(String repo, String upstreamCommit, String upstreamRef, Instant importedAt) {
        this.repo = repo;
        this.upstreamCommit = upstreamCommit;
        this.upstreamRef = upstreamRef;
        this.importedAt = importedAt;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}