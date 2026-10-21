package com.example.app.module.recipe;

import com.example.app.module.recipe.repository.RecipeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end test covering Flyway migrations, the admin sync endpoint and the
 * read APIs against a real PostgreSQL. Skipped automatically on hosts without
 * Docker (e.g. plain dev machines); CI runs it with Docker available.
 */
@SpringBootTest(properties = "app.admin.token=test-admin-token")
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class RecipeApiIntegrationTest {

    private static final String ADMIN_TOKEN = "test-admin-token";

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RecipeRepository recipeRepository;

    @Test
    void adminSyncRejectsMissingToken() throws Exception {
        mockMvc.perform(post("/api/v1/admin/sync")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40100))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void syncIsIdempotentAndDatasetExposesData() throws Exception {
        mockMvc.perform(post("/api/v1/admin/sync")
                        .header("Authorization", "Bearer " + ADMIN_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(importPayload()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.recipesCreated").value(1))
                .andExpect(jsonPath("$.data.recipesUpdated").value(0));

        // Re-importing the same payload must not duplicate rows.
        mockMvc.perform(post("/api/v1/admin/sync")
                        .header("Authorization", "Bearer " + ADMIN_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(importPayload()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recipesCreated").value(0))
                .andExpect(jsonPath("$.data.recipesUpdated").value(1));
        assertThat(recipeRepository.count()).isEqualTo(1);

        mockMvc.perform(get("/api/v1/recipes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source.commit").value("abc123def"))
                .andExpect(jsonPath("$.data.source.ref").value("main"))
                .andExpect(jsonPath("$.data.categories[0].key").value("炒菜"))
                .andExpect(jsonPath("$.data.categories[0].count").value(1))
                .andExpect(jsonPath("$.data.recipes[0].id").value("r000000001"))
                .andExpect(jsonPath("$.data.recipes[0].category").value("炒菜"))
                .andExpect(jsonPath("$.data.recipes[0].ingredients[0]").value("五花肉"))
                .andExpect(jsonPath("$.data.recipes[0].steps[0]").value("焯水 30 秒"))
                .andExpect(jsonPath("$.data.recipes[0].estMinutes").value(20));

        mockMvc.perform(get("/api/v1/recipes/r000000001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rawMarkdown").value("# 测试菜"))
                .andExpect(jsonPath("$.data.nutrition[0].label").value("热量"));

        mockMvc.perform(get("/api/v1/recipes/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(40400));
    }

    private String importPayload() {
        return """
                {
                  "categories": [
                    { "key": "炒菜", "tag": "快炒", "emoji": "🥘", "sortOrder": 0 }
                  ],
                  "recipes": [
                    {
                      "externalId": "r000000001",
                      "name": "测试菜",
                      "categoryKey": "炒菜",
                      "sourcePath": "炒菜/test.md",
                      "rawMarkdown": "# 测试菜",
                      "imagePath": null,
                      "estMinutes": 20,
                      "ingredients": ["五花肉"],
                      "steps": ["焯水 30 秒"],
                      "nutrition": [{ "label": "热量", "value": "376 Kcal" }]
                    }
                  ],
                  "source": {
                    "repo": "https://github.com/Gar-b-age/CookLikeHOC",
                    "commit": "abc123def",
                    "ref": "main"
                  }
                }
                """;
    }
}