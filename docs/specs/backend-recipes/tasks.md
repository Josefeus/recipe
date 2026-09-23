# 任务清单（Tasks）

> 状态：骨架阶段已开始（2026-09-23）
> 上游文档：[requirements.md](./requirements.md) / [design.md](./design.md)

约定：每项完成后勾选；涉及接口/数据库的任务完成后必须跑通对应验证命令。

## 阶段 1：后端骨架

- [x] T1.1 创建 `backend/` Maven 目录结构与包骨架（common / config / module/recipe 分层）
- [x] T1.2 `pom.xml`：Spring Boot 4.0.8 parent、Java 21、web/validation/data-jpa/flyway/postgresql/lombok/test 依赖
- [x] T1.3 启动类 `RecipeApplication` 与 `application.yml` / `application-local.yml`（环境变量化连接串）
- [x] T1.4 `V1__init_recipe_schema.sql` 初始迁移（category / recipe / 三个子表 / 约束 / 索引 / updated_at 触发器）
- [x] T1.5 本地验证：`cd backend && mvn -q clean verify` 通过（无测试也应构建成功）
- [ ] T1.6 `docker-compose.yml` 增加 PostgreSQL 16 服务（本地库 `recipe`，健康检查），验证 `mvn spring-boot:run -Dspring-boot.run.profiles=local` 可启动并完成 Flyway 迁移

## 阶段 2：后端 API 实现

- [ ] T2.1 通用设施：`ApiResponse`、`BusinessException`、`GlobalExceptionHandler`（错误码见 design 4.5）
- [ ] T2.2 Entity / Repository：Category、Recipe、RecipeIngredient、RecipeStep、RecipeNutrition（软删除过滤、`@EntityGraph` 避免 N+1）
- [ ] T2.3 `GET /api/v1/recipes` 全量数据集接口（组装 generatedAt/source/categories(count)/recipes）
- [ ] T2.4 `GET /api/v1/recipes/{externalId}` 与 `GET /api/v1/categories`
- [ ] T2.5 引入 springdoc-openapi（先确认 Boot 4 兼容版本）并为全部接口补 OpenAPI 注解
- [ ] T2.6 `POST /api/v1/admin/sync` 导入接口：Bearer token 鉴权、载荷校验、单事务 upsert（按 source_path）、导入统计
- [ ] T2.7 Service 单元测试（Mockito）：导入幂等、数据集组装、分类统计
- [ ] T2.8 集成测试（Testcontainers PostgreSQL）：迁移 + 接口端到端 + 重复导入不产生重复行

## 阶段 3：同步脚本与数据链路改造

- [ ] T3.1 改造 `scripts/sync-cooklikehoc.mjs`：组装导入载荷（md 全文 + 结构化字段 + 图片清单 + 上游 meta）→ 复制图片到 `frontend/public/images/` → 调用 admin sync → 成功后清理 data-source（失败保留现场）
- [ ] T3.2 脚本单测（`pnpm test:scripts`）：载荷组装、图片复制清单、失败不清理
- [ ] T3.3 `frontend/scripts/build-recipes.mjs` 与 `frontend/src/data/` 退役：package.json 移除 data:build 调用与生成物
- [ ] T3.4 `frontend/scripts/recipe-images.ts` Vite 插件退役，图片改由 `public/images/` 静态提供，确认 `/images/*` URL 不变
- [ ] T3.5 `.gitignore` 与 `data-source/` 入库策略调整（public/images 改为跟踪或明确忽略+重建说明；data-source 内容文件转中转缓存）
- [ ] T3.6 全链路演练：重置数据库 → `pnpm data:sync` → 验证 290 条菜谱入库、图片可访问、data-source 已清理 → 重复执行验证幂等

## 阶段 4：前端切换

- [ ] T4.1 `src/api/recipes.ts` 移除内置 JSON 与回退逻辑，仅走后端 API
- [ ] T4.2 移除 `@/data/recipes.json` 的全部 import（含 spec 文件改用 API mock 数据）
- [ ] T4.3 确认错误态 UI（后端不可用时页面提示，无静默回退）
- [ ] T4.4 `pnpm lint && pnpm typecheck && pnpm build` 通过；`pnpm test` 通过

## 阶段 5：文档收尾

- [ ] T5.1 更新根 `AGENTS.md` 第 12 节数据链路图与说明（新链路：上游 → data-source → 后端数据库；图片在 frontend/public/images；data-source 为可清理缓存）
- [ ] T5.2 更新 `README.md`：本地启动顺序（docker-compose → backend → frontend）、同步命令说明
- [ ] T5.3 全量验收：`cd backend && mvn -q clean verify`；`cd frontend && pnpm lint && pnpm typecheck && pnpm build`；端到端手测浏览/随机/收藏

## 依赖关系

- T2.x 依赖阶段 1；T3.1 依赖 T2.6；T4.x 依赖 T2.3 与 T3.4；T5 依赖全部功能任务。