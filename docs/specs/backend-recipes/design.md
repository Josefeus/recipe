# 技术设计说明（Design）

> 状态：已确认（2026-09-23）
> 上游文档：[requirements.md](./requirements.md)

## 1. 架构总览

### 1.1 目标数据链路

```
上游仓库 Gar-b-age/CookLikeHOC
        │  git clone / pull（缓存 _cooklikehoc/）
        ▼
data-source/CookLikeHOC/          ← 中转缓存（md + images）
        │
        ├─ md 全文 + 解析字段 ──► POST /api/v1/admin/sync ──► PostgreSQL
        │                                             （category / recipe / 子表）
        └─ 被引用图片 ──► frontend/public/images/   ← 前端静态资源直接提供
        │
        ▼ 导入成功后（脚本）
清理 data-source/ 中的 md 与图片，保留 .git 与 .upstream.json 供增量同步
```

### 1.2 运行时架构

```
frontend (Vue 3) ──HTTP──► backend (Spring Boot 4.0.8) ──JDBC──► PostgreSQL 16
       │
       └─ 静态资源：/images/* 来自 frontend/public/images/
```

前端 `GET /api/v1/recipes` 获取全量数据集后，仍由前端 store 本地完成过滤、随机、收藏等交互（与现有 `picker.ts` 行为一致，本设计不改变前端交互模式）。

## 2. 技术栈与版本决策

| 项 | 选型 | 依据 |
| --- | --- | --- |
| 语言 | Java 21 | 维护者指定（D4） |
| 框架 | Spring Boot **4.0.8** | 2026-09-23 查询 Maven 中央仓库 `spring-boot-starter-parent/maven-metadata.xml`：4.0.x 线最新 GA 为 4.0.8（4.1.0/4.1.1 已发布、4.2.0-M1 为里程碑，按约束取 4.0.x 线） |
| 构建 | Maven 3.9.x | 维护者指定（D4） |
| 持久化 | Spring Data JPA（Hibernate） | Boot 4 原生支持；MyBatis-Plus 的 starter 目前面向 Boot 3，Boot 4 兼容风险高；本项目查询形态简单（全量/按 ID/按分类），JPA 足够（AGENTS.md 允许 JPA / MyBatis-Plus 二选一） |
| 数据库 | PostgreSQL 16 | AGENTS.md 约定 |
| 迁移 | Flyway（`flyway-core` + `flyway-database-postgresql`） | AGENTS.md 约定；Flyway 10+ 数据库支持拆分模块 |
| API 文档 | springdoc-openapi | AGENTS.md 约定；待确认对 Boot 4 的稳定兼容版本后在任务 T2.5 引入，骨架期不引入避免构建失败 |
| 对象映射 | MapStruct | 待与 springdoc 一同确认版本后引入；字段映射简单，非阻塞项 |

**HTTP 客户端依赖**：导入脚本用 Node（现有 `scripts/sync-cooklikehoc.mjs` 生态），不引入额外 Java HTTP 库。

## 3. 数据模型

### 3.1 ER 关系

```
category 1 ──── * recipe 1 ──── * recipe_ingredient
                          1 ──── * recipe_step
                          1 ──── * recipe_nutrition
```

### 3.2 设计要点

| 要点 | 决策 | 理由 |
| --- | --- | --- |
| 主键 | `bigint generated always as identity` | AGENTS.md 约定；无分布式 ID 需求 |
| 菜谱业务 ID | `external_id varchar(32)` 唯一，沿用现有 `r` + sha1 前 10 位算法 | 前端收藏/今晚吃存储依赖稳定 ID（localStorage），保持兼容 |
| 幂等键 | `source_path`（上游相对路径 `分类/文件.md`）唯一 | 同步导入按文件路径 upsert |
| md 全文 | `raw_markdown text not null` | D2：全量保存，结构化字段可重新推导 |
| 图片 | `image_path varchar(512)`，存 `/images/<文件名>` 相对路径 | D2：图片在本地前端资源目录，DB 只存地址；未来迁云端只改该列取值 |
| 软删除 | `deleted_at timestamptz` | AGENTS.md 默认软删除策略；同步脚本删除上游已移除菜谱时置位而非物理删除 |
| 时间 | `timestamptz`，应用层 `Instant` | AGENTS.md 约定 |
| 食材/步骤/营养 | 独立子表 + `sort_order` | 支持后续按食材检索（如「冰箱剩余食材找菜谱」）与有序展示；营养为 label/value 键值对 |

### 3.3 初始迁移脚本

见 `backend/src/main/resources/db/migration/V1__init_recipe_schema.sql`（骨架已生成，包含建表、唯一约束、外键、索引与 `updated_at` 触发器）。

索引策略：

- `uq_category_key`：分类 key 唯一；
- `uq_recipe_external_id` / `uq_recipe_source_path`：业务 ID 与同步幂等键唯一；
- `idx_recipe_category_id`：按分类过滤；
- `idx_recipe_<子表>_recipe_id`：子表按主表聚合查询（组合 `recipe_id, sort_order`）；
- 食材全文/模糊检索（`pg_trgm`）为后续增强，不在 V1 范围。

## 4. API 契约

统一响应体 `ApiResponse<T>`：

```json
{ "code": 0, "message": "ok", "data": { } }
```

失败：`code` 为业务码（4xxxx/5xxxx），`message` 可读中文原因，`data: null`；HTTP 状态码与业务码语义一致。

### 4.1 GET /api/v1/recipes — 全量菜谱数据集

前端核心接口，响应 `data` 与现有 `RecipeDataset` 类型完全兼容：

```json
{
  "generatedAt": "2026-09-23T04:00:00Z",
  "source": { "repo": "https://github.com/Gar-b-age/CookLikeHOC", "note": "…", "commit": "…", "ref": "main" },
  "categories": [ { "key": "炒菜", "tag": "快炒", "emoji": "🥘", "count": 71 } ],
  "recipes": [
    {
      "id": "r46227ed495",
      "name": "鹌鹑蛋红烧肉",
      "category": "炒菜",
      "image": "/images/xxx.jpg",
      "ingredients": ["…"],
      "steps": ["…"],
      "nutrition": [ { "label": "热量", "value": "376 Kcal" } ],
      "estMinutes": 20
    }
  ]
}
```

- `generatedAt`：服务端组装时刻（ISO 8601 UTC）；
- `source`：取自导入时记录的上游 commit/ref 与固定说明文案；
- `categories[].count`：实时统计该分类下未删除菜谱数；
- 不分页：数据集约 290 条 / <1MB，前端本地交互需要全量内存数据（见 1.2）。

### 4.2 GET /api/v1/recipes/{externalId} — 菜谱详情

- 200：`ApiResponse<RecipeResponse>`（含 md 全文 `rawMarkdown`，供未来详情页原文展示）；
- 404：`code 40400`，菜谱不存在或已软删除。

### 4.3 GET /api/v1/categories — 分类列表

`ApiResponse<CategoryResponse[]>`，按 `sort_order` 排序。

### 4.4 POST /api/v1/admin/sync — 数据导入（管理端）

- 鉴权：`Authorization: Bearer <ADMIN_TOKEN>`，token 由环境变量注入；缺失或不匹配返回 401（`code 40100`）；
- 请求体：同步脚本组装的导入载荷（分类定义、菜谱数组含 md 全文/结构化字段/图片文件名清单、上游 meta）；
- 行为：单事务内 upsert 分类与菜谱（按 `source_path`），校验图片文件名清单与 md 引用一致性；返回导入统计（新增/更新/跳过）；
- 幂等：重复调用结果一致；
- 限制：本接口仅由本机/内网脚本调用，MVP 不做限流。

### 4.5 错误码约定

| code | HTTP | 场景 |
| --- | --- | --- |
| 0 | 200 | 成功 |
| 40000 | 400 | 参数校验失败 |
| 40100 | 401 | 管理 token 缺失/错误 |
| 40400 | 404 | 资源不存在 |
| 50000 | 500 | 未预期服务端错误 |

## 5. 同步与导入流程（脚本改造）

现有 `pnpm data:sync`（`scripts/sync-cooklikehoc.mjs`）改造为：

1. 拉取/更新上游克隆到 `_cooklikehoc/`，对齐到 `data-source/CookLikeHOC/`（保持现状）；
2. 读取 `scripts/recipe-categories.mjs` 分类定义（分类清单真源不变，仍为单一文件，导入载荷以其为准）；
3. 解析每个 md → 结构化字段（复用现有解析逻辑）+ md 全文 + 引用图片名，组装导入载荷；
4. 复制被引用图片到 `frontend/public/images/`；
5. `POST /api/v1/admin/sync`（携带 `ADMIN_TOKEN`）提交导入；失败则中止（保留 data-source）；
6. 导入成功后执行清理：删除 `data-source/CookLikeHOC/` 下已导入的分类 md 目录内容与 `images/` 内容，保留 `.git/` 与 `.upstream.json`；
7. 输出导入统计摘要。

配套调整：

- `frontend/scripts/build-recipes.mjs` 与 `frontend/src/data/` 退役：前端不再生成/打包 `recipes.json`（`pnpm dev` / `pnpm build` 移除该步骤）；
- `frontend/scripts/recipe-images.ts`（Vite 图片插件）退役：图片改为 `public/images/` 静态文件，`/images/*` URL 不变；
- `.gitignore`：移除 `frontend/public/images/` 忽略规则改为跟踪（保证克隆仓库后无需同步即有图片；仓库体积增加约几十 MB，若不可接受可改为忽略 + 文档说明需先跑同步，实现前与维护者确认即可）；
- `data-source/CookLikeHOC/` 的入库策略随之调整：内容文件不再长期入库，改为同步中转缓存（保留 `.upstream.json` 记录上游版本）。

## 6. 前端改造

- `src/api/recipes.ts`：移除内置 JSON import 与回退逻辑，仅保留 `request` 调用 `/api/v1/recipes`；错误态由 store 的 `error` 呈现（现有 `TodayEatView` 等已有错误 UI）；
- `src/types/recipe.ts`：不变（契约兼容）；
- 本地开发：`pnpm dev` 需后端运行（或先看到错误态，属预期行为）。

## 7. 配置与环境变量

| 变量 | 用途 | 默认（仅本地） |
| --- | --- | --- |
| `DB_URL` | JDBC 连接串 | `jdbc:postgresql://localhost:5432/recipe` |
| `DB_USERNAME` | 数据库用户 | `recipe` |
| `DB_PASSWORD` | 数据库密码 | `recipe`（仅本地 docker-compose 默认值） |
| `ADMIN_TOKEN` | 导入接口 Bearer token | 无（未配置时导入接口返回 401） |

`application.yml` 不含任何敏感值；`application-local.yml` 仅含本地默认连接信息。

## 8. 测试策略

| 层 | 工具 | 覆盖 |
| --- | --- | --- |
| Service 单元测试 | JUnit 5 + Mockito | 导入 upsert 幂等、数据集组装、分类统计 |
| 集成测试 | Testcontainers PostgreSQL | Flyway 迁移、Repository 查询、admin sync 接口端到端 |
| API 契约 | Spring MockMvc / REST Assured（随 T2.5 定） | 响应结构与 `RecipeDataset` 兼容性 |
| 脚本 | Node 内置 test runner（现有 `pnpm test:scripts`） | 载荷组装、图片复制、清理逻辑（失败不清理） |

修复缺陷时先补复现测试再改实现（AGENTS.md 第 8 节）。