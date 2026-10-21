package com.example.app.module.recipe.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Upstream repo meta recorded with each successful import.
 */
public record SyncSourcePayload(
        @NotBlank(message = "上游仓库地址不能为空") @Size(max = 512, message = "上游仓库地址长度不能超过 512") String repo,
        @Size(max = 64, message = "上游 commit 长度不能超过 64") String commit,
        @Size(max = 128, message = "上游 ref 长度不能超过 128") String ref) {
}