package com.example.app.config;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Springdoc OpenAPI metadata for the recipe backend.
 */
@Configuration
@SecurityScheme(
        name = "AdminToken",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        description = "管理端 token，值与环境变量 ADMIN_TOKEN 一致")
public class OpenApiConfig {

    @Bean
    public OpenAPI recipeOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Recipe Backend API")
                        .description("菜谱后端：提供全量数据集、菜谱详情、分类与管理端数据导入接口。")
                        .version("v1"));
    }
}