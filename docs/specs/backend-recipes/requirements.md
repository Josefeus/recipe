# 需求规格说明（Requirements）

> 状态：已确认（2026-09-23，与维护者对齐四项关键决策）
> 变更记录：初版

## 1. 背景

当前菜谱系统是完全前端渲染的：

- 菜谱数据构建时打包进前端：`frontend/src/data/recipes.json`（290 条菜谱，约 240KB）；
- 分类清单维护在 `scripts/recipe-categories.mjs`，前端通过打包数据间接使用；
- 图片由 Vite 插件在开发/构建时从 `data-source/CookLikeHOC/images` 提供，前端不持有副本。

这导致：数据变更必须重新构建并发布前端；数据无法在运行时增删改；图片生命周期与数据源目录耦合。

## 2. 目标

将前端写死的菜谱数据与分类定义全部迁移到后端：

1. 菜谱数据（含 md 原文全量）存入 PostgreSQL；
2. 分类定义同步存入 PostgreSQL，由后端 API 输出；
3. 菜品图片先保存在本地（前端静态资源目录），数据库仅存文件地址，后续可平滑迁移到云端存储；
4. 数据同步链路调整为：上游仓库 → `data-source/` → 后端数据库，`data-source/` 在导入成功后可被脚本清理，前端不再保留本地 JSON 兜底。

## 3. 已确认的决策记录

| # | 决策项 | 结论 |
| --- | --- | --- |
| D1 | 迁移范围 | 菜谱数据 + 分类定义全部迁移到后端 |
| D2 | 存储方案 | PostgreSQL；md 文件内容全量入库；图片存本地，数据库存文件地址 |
| D3 | 同步链路 | 上游 → `data-source/` → 后端数据库；`data-source/` 增加清理逻辑；图片转移到前端资源目录；不保留本地 JSON 兜底 |
| D4 | 技术栈 | Java 21 + Spring Boot 4.0.x 最新 GA（经 Maven 中央仓库查询为 **4.0.8**）+ Maven 3.9.x |

## 4. 用户故事与验收标准（EARS 格式）

### US1 访客浏览菜谱

作为访客，我希望打开页面时从后端获取最新的菜谱与分类数据，以便看到随时可更新的内容而不依赖前端发版。

- WHEN 前端发起 `GET /api/v1/recipes` 请求且后端正常响应时，THE SYSTEM SHALL 返回统一响应体包裹的完整菜谱数据集（`generatedAt`、`source`、`categories`、`recipes`），结构与现有 `frontend/src/types/recipe.ts` 中 `RecipeDataset` 保持兼容。
- WHEN 数据集中某菜谱存在图片时，THE SYSTEM SHALL 在 `image` 字段返回可被前端静态资源直接使用的相对路径（如 `/images/<文件名>`）。
- WHEN 某菜谱没有对应图片时，THE SYSTEM SHALL 返回 `image: null`。
- IF 后端不可用或响应数据为空，THE SYSTEM SHALL 返回明确的错误响应体（`code != 0`、`data: null`），前端不再回退到本地 JSON，按错误态展示。

### US2 维护者同步上游数据

作为维护者，我希望运行同步命令后，上游最新菜谱自动进入后端数据库，以便数据维护不需要手工操作。

- WHEN 维护者执行同步命令且上游存在新数据时，THE SYSTEM SHALL（通过导入流程）将新增菜谱的 md 全文、解析后的结构化字段、分类信息写入数据库。
- WHEN 同一菜谱（以稳定 ID 或上游路径判定）重复导入时，THE SYSTEM SHALL 幂等更新既有记录而不产生重复行。
- WHEN 导入完成后，THE SYSTEM SHALL（由脚本）把被引用的菜品图片复制到 `frontend/public/images/`，并清理 `data-source/` 中已导入的 md 与图片文件。
- IF 导入过程中任一步骤失败，THE SYSTEM SHALL 保留 `data-source/` 原始内容不清理，以便重试。

### US3 图片展示

作为访客，我希望菜谱实拍图正常显示。

- WHEN 后端返回的菜谱带图片路径时，THE SYSTEM SHALL 保证该路径在前端开发服务器与构建产物中均可访问（图片由 `frontend/public/images/` 静态提供）。

## 5. 范围

### 包含（In Scope）

- 后端 Maven 工程骨架（Spring Boot 4.0.8 / Java 21）；
- PostgreSQL 表结构与 Flyway 初始迁移；
- 分类与菜谱的读取 API、全量数据集 API；
- 数据导入接口（管理端，token 鉴权）与同步脚本改造方案；
- 前端从内置 JSON 切换到后端 API 的改造方案；
- `data-source/` 清理逻辑与 `.gitignore` 调整方案。

### 不包含（Out of Scope）

- 分页/关键词服务端搜索 API（前端本地过滤现有交互保留，后续可演进）；
- 图片上传至云端对象存储（仅预留 `image_path` 字段与迁移路径）；
- 用户注册/登录体系（管理导入仅用环境变量 token 保护）；
- 菜谱数据的后台增删改界面（本期数据只来自上游同步）。

## 6. 非功能需求

| 类别 | 要求 |
| --- | --- |
| 幂等性 | 同步导入可重复执行，重复导入不产生重复数据 |
| 性能 | `GET /api/v1/recipes` 全量数据集（约 290 条 / <1MB）响应时间 P95 < 1s（本地环境） |
| 数据完整性 | md 原文全量保存；结构化字段可从原文重新推导 |
| 可重建性 | 清理 `data-source/` 后，重新执行同步可完整重建数据库与图片目录 |
| 安全 | 数据库连接串、管理 token 一律环境变量注入，禁止入库 |