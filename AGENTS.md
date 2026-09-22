# AGENTS.md

本文件是仓库内所有 AI 编码代理与协作开发者的统一约定。动手改代码前先读完本文件；
如有与具体模块冲突的约定，以模块内的 `AGENTS.md` 为准（就近优先）。

## 1. 项目概览

全栈应用：Java 后端 + Vue 前端 + PostgreSQL 数据库，前后端分离，通过 REST API 通信。

| 层次 | 技术选型 |
| --- | --- |
| 后端 | Java 21、Spring Boot 3.x、Maven、Spring Web、Spring Validation、Spring Data JPA / MyBatis-Plus、Flyway、Lombok、MapStruct、springdoc-openapi |
| 前端 | Vue 3、TypeScript、Vite、pnpm、Pinia、Vue Router、Axios、Element Plus、ESLint + Prettier、Vitest |
| 数据库 | PostgreSQL 16、Flyway 版本化迁移、HikariCP 连接池 |
| 测试 | JUnit 5 + Mockito + Testcontainers（后端）、Vitest + Vue Test Utils（前端） |

## 2. 目录结构

```
.
├── backend/                  # Java 后端（独立 Maven 工程）
│   ├── src/main/java/com/example/app/
│   │   ├── common/           # 统一响应、异常、工具、常量
│   │   ├── config/           # Spring 配置（安全、OpenAPI、序列化等）
│   │   └── module/<domain>/  # 按业务域分包：controller / service / repository / entity / dto / mapper
│   ├── src/main/resources/
│   │   ├── application.yml           # 通用配置，不含任何密钥
│   │   ├── application-local.yml     # 本地开发配置（不提交敏感值）
│   │   └── db/migration/             # Flyway 迁移脚本
│   └── src/test/java/...             # 与之对应的测试
├── frontend/                 # Vue 前端
│   ├── src/api/              # 后端接口封装（按域拆文件）
│   ├── src/components/       # 通用组件
│   ├── src/views/            # 路由级页面
│   ├── src/stores/           # Pinia store
│   ├── src/composables/      # 组合式函数 useXxx
│   ├── src/router/           # 路由与守卫
│   ├── src/types/            # 全局 TS 类型与接口契约
│   └── src/utils/            # 纯函数工具
├── docs/                     # 设计、接口、部署文档
└── docker-compose.yml        # 本地 PostgreSQL 等依赖服务
```

## 3. 通用约定

- 代码、注释、日志、提交信息使用英文；面向用户的界面文案与业务文档使用中文。
- 任何密钥、连接串、token 一律走环境变量或本地未提交配置，禁止写入仓库。
- 一次改动只解决一件事，避免顺手做无关的重构或格式化。
- 不删除、不重命名既有公共接口（API、导出函数、数据库字段）以外的代码，除非任务明确要求。
- 优先复用既有工具类、组件与响应结构；新增公共设施前先搜索是否已存在。

## 4. 后端规范（Java / Spring Boot）

### 4.1 分层与职责

- `Controller`：只做参数校验、调用 `Service`、组装响应，禁止写业务逻辑与直接操作 `Repository`。
- `Service`：业务逻辑与事务边界，返回 DTO 或领域对象，不返回持久化 `Entity`。
- `Repository`：只负责数据访问，禁止在其中写业务分支。
- `Entity` 不直接作为接口出入参，统一使用 `dto` 包下的请求/响应对象。

### 4.2 编码要求

- 使用构造器注入（推荐 `@RequiredArgsConstructor`），禁止字段注入 `@Autowired`。
- 入参校验使用 `@Valid` + Jakarta Validation 注解，校验信息明确可读。
- 统一响应体 `ApiResponse<T>{ code, message, data }`；业务失败抛 `BusinessException`，
  由 `@RestControllerAdvice` 全局处理，禁止在 Controller 里到处 `try/catch` 后 `return null`。
- 时间类型统一 `Instant` / `OffsetDateTime`，数据库对应 `timestamptz`；金额使用 `BigDecimal`。
- 日志使用 SLF4J 占位符写法 `log.info("order {} created", id)`，禁止 `System.out` 与字符串拼接日志。
- 事务写在 Service 层，查询方法加 `@Transactional(readOnly = true)`；事务内避免远程调用。
- 列表查询注意 N+1：使用 `join fetch`、批量查询或 `@EntityGraph`，禁止在循环中访问数据库。
- SQL / JPQL 一律参数绑定，禁止字符串拼接用户输入。
- 接口新增或变更时同步更新 springdoc 注解，保持 Swagger 文档可用。

### 4.3 常用命令（在 `backend/` 下执行）

```bash
mvn -q clean verify          # 编译 + 全部测试，提交前必须通过
mvn spring-boot:run -Dspring-boot.run.profiles=local
mvn -q test -Dtest=OrderServiceTest
```

## 5. 前端规范（Vue 3 / TypeScript）

- 一律使用 `<script setup lang="ts">` 与组合式 API，不使用 Options API。
- 组件文件用 PascalCase（`RecipeCard.vue`），目录与组合式函数用 kebab-case / `useXxx`。
- 所有接口调用集中在 `src/api/**`，禁止在组件里直接写 `axios.get(...)`。
- 后端返回的数据结构必须有 TS 类型定义，放在 `src/types/**`，禁止用 `any`，必要时用 `unknown` + 收窄。
- 状态管理：组件内部状态用 `ref` / `reactive`，跨页面共享才放 Pinia，禁止把表单临时状态塞进全局 store。
- Axios 实例统一在 `src/utils/request.ts` 创建，拦截器负责注入 token、解包 `ApiResponse`、
  统一错误提示；401 触发登出与路由跳转。
- 样式使用 `<style scoped>`，主题色与间距走 CSS 变量，避免内联魔法数字。
- 列表与表单要考虑加载态、空态、错误态；提交按钮需防重复点击。

### 常用命令（在 `frontend/` 下执行）

```bash
pnpm install
pnpm dev
pnpm lint && pnpm typecheck && pnpm build   # 提交前必须全部通过
pnpm test
```

## 6. 数据库规范（PostgreSQL）

- 所有表结构变更必须通过 Flyway 迁移脚本完成，文件名为
  `V<版本号>__<描述>.sql`（如 `V3__add_recipe_tags.sql`），放在 `src/main/resources/db/migration`。
- 已执行过的迁移脚本禁止修改，只能新增脚本修正。
- 命名：表名与列名 `snake_case`，表名用单数或统一复数（项目内保持一致）；
  外键 `fk_<表>_<列>`、索引 `idx_<表>_<列>`、唯一约束 `uq_<表>_<列>`。
- 主键优先 `bigint generated always as identity`，需要对外暴露或分布式生成时用 `uuid`。
- 每张表必须包含 `created_at timestamptz not null default now()` 与
  `updated_at timestamptz not null default now()`。
- 状态/类型字段用 `varchar` + `check` 约束或字典表，禁止用无约束魔法数字。
- 外键列与外键列组合的查询字段必须建索引；写查询前先确认索引是否命中。
- 分页使用 `limit / offset` 并显式 `order by`；大表深分页改用基于游标的 keyset 分页。
- 删除策略默认软删除（`deleted_at`）或明确与产品确认，禁止随手 `drop table` / `drop column`。
- 连接池使用 HikariCP，`maximum-pool-size` 与数据库 `max_connections` 需整体评估。

## 7. API 约定

- 路径前缀 `/api/v1`，资源名用复数名词，动作通过 HTTP 方法表达。
- 成功响应：`{ "code": 0, "message": "ok", "data": ... }`；
  失败响应：`{ "code": 4xxxx, "message": "可读原因", "data": null }`，HTTP 状态码与业务码保持一致语义。
- 分页响应：`{ "items": [...], "total": 100, "page": 1, "size": 20 }`。
- 时间字段统一输出 ISO 8601 UTC 字符串；请求参数中的时间同样按 UTC 解析。
- 入参缺省值、可空性、取值范围必须在校验注解或 OpenAPI 文档中体现。

## 8. 测试与验收

- 后端：Service 层写单元测试（Mockito），关键接口写集成测试并在需要时用 Testcontainers 起真实 PostgreSQL。
- 前端：工具函数与关键组件写 Vitest 测试，交互逻辑优先测行为而非实现细节。
- 修复缺陷时先补一个能复现问题的测试，再改实现。
- 提交前的最低验收线：
  1. `cd backend && mvn -q clean verify` 通过；
  2. `cd frontend && pnpm lint && pnpm typecheck && pnpm build` 通过；
  3. 涉及数据库的改动已附带可重复执行的迁移脚本；
  4. 涉及接口的改动已同步前端调用与 TS 类型。

## 9. 提交与协作

- 提交信息遵循 Conventional Commits：`feat: ` / `fix: ` / `refactor: ` / `docs: ` / `test: ` / `chore: `。
- 一个 PR 聚焦一个目标，描述中写清「改了什么、为什么、怎么验证」。
- 不提交构建产物（`target/`、`dist/`、`node_modules/`）、IDE 配置与本地环境文件。

## 10. 明确禁止

- 禁止硬编码数据库密码、密钥、第三方 token。
- 禁止绕过分层：Controller 直连数据库、前端组件直连 axios、跨模块直接访问他人 `repository`。
- 禁止修改或删除已执行的 Flyway 迁移脚本。
- 禁止用 `print` / `System.out` / `console.log` 作为持久化日志手段。
- 禁止在未说明原因的情况下引入新的重型依赖、状态库或 UI 框架。

## 11. 待按实际工程确认

以下项当前按通用方案默认约定，如与团队实际选型不同请就地修改本节之外的对应条款：
持久化框架（JPA 与 MyBatis-Plus 二选一）、包名前缀、UI 组件库、鉴权方案（JWT / Session）、
部署方式（Docker / K8s）、分支模型与发布流程。

## 12. 数据源与静态资源流程

菜谱数据来自上游开源仓库 [Gar-b-age/CookLikeHOC](https://github.com/Gar-b-age/CookLikeHOC)，
整条链路已经脚本化，禁止手工编辑生成物：

```
上游仓库 → 缓存克隆 _cooklikehoc/ → data-source/CookLikeHOC/ → frontend/src/data/recipes.json + frontend/public/images/
             └────────────── scripts/sync-cooklikehoc.mjs ──────────────┘   └─ frontend/scripts/build-recipes.mjs ─┘
```

- 同步上游（拉取 + 对齐数据源 + 重建静态资源）：在 `frontend/` 下执行 `pnpm data:sync`
  （等价于仓库根的 `node scripts/sync-cooklikehoc.mjs`）；只检查上游是否有新数据用
  `pnpm data:check`（有新数据退出码 2）。
- 分类清单是全链路唯一的真源，位于 `scripts/recipe-categories.mjs`，
  上游同步脚本与 `frontend/scripts/build-recipes.mjs` 共用；新增分类只改这一处。
- `data-source/CookLikeHOC/`、`frontend/src/data/`、`frontend/public/images/` 均为生成物：
  其中 `frontend` 下的两处不入库（见 `.gitignore`），`data-source/` 入库以便离线构建，
  但只能由同步脚本改写。上游 commit 记录在 `data-source/CookLikeHOC/.upstream.json`。
- `scripts/` 下脚本的单测：`pnpm test:scripts`（Node 内置 test runner，无需额外依赖）。
