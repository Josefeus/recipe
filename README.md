# 今天吃什么 · 饭点决定器

选不出来就别选了，让转盘替你决定。

从 290 道中式菜品里随机挑一道放到「台面」上，附带配料、做法与营养信息；
支持按分类 / 关键词筛选、收藏夹与「今晚菜单」，也能按分类摊开总览全部菜品。
全部菜谱数据来自开源项目 [Gar-b-age/CookLikeHOC](https://github.com/Gar-b-age/CookLikeHOC)，
已随仓库附带一份数据源副本，**离线也能完整跑起来**。

当前数据规模：**290 道菜 · 14 个分类 · 179 张实拍图**（上游 commit `0999f83`，2026-09-17）。

## 功能

- **随机决定**：点「开饭」转盘或按空格键抽取，带滚动动画与错峰入场效果；抽完还会给 3 道备选。
- **筛选范围**：14 个分类 tab、菜名/配料关键词搜索、「只看有图」、「30 分钟内」四个条件共用同一个候选池。
- **台面一张卡**：实拍图、菜名、耗时、配料用量、每 100g 营养、分步做法，以及跳转上游原文的链接。
- **点击放大**：台面大图、总览页与备选卡片上的照片都能点开大图查看（放大倍数不超过原图 3 倍，避免糊图）。
- **收藏夹 / 今晚菜单**：两个独立列表，收藏与菜单都持久化在浏览器 localStorage。
- **全部菜谱总览**：`/browse` 摊开当前分类的全部菜品，点图片看大图，点标题把这道菜放回决定器。

## 技术栈

| 层次 | 选型 |
| --- | --- |
| 前端 | Vue 3（`<script setup>`）、TypeScript、Vite 5、Pinia、Vue Router、Axios |
| 测试 | Vitest + Vue Test Utils + happy-dom；数据管线脚本用 Node 内置 test runner |
| 工程化 | ESLint 9 + Prettier，pnpm，Node.js >= 20 |
| 数据管线 | Node 脚本（同步上游、解析 Markdown、产出 JSON），无额外运行时依赖 |

后端尚未落地。按 [AGENTS.md](./AGENTS.md) 的规划，接口会用 Java 21 + Spring Boot 3 + PostgreSQL 实现，
契约已经固定为 `GET /api/v1/recipes`（见[接后端](#接后端)）；在那之前前端用 Vite 中间件模拟接口，
接口不可用时自动回退到随包发布的内置数据。

## 快速开始

需要 Node.js >= 20 与 pnpm。

```bash
git clone https://github.com/Josefeus/recipe.git
cd recipe/frontend

pnpm install
pnpm dev        # 先跑一次数据生成，再启动 dev server（默认 http://localhost:5173）
```

其它常用命令（都在 `frontend/` 下执行）：

```bash
pnpm build      # 数据生成 + 类型检查 + 产物构建（输出到 frontend/dist）
pnpm preview    # 本地预览 dist
pnpm test       # Vitest：筛选/抽取等纯逻辑与关键组件
pnpm lint       # ESLint
pnpm typecheck  # vue-tsc 类型检查
pnpm format     # Prettier 格式化
```

## 目录结构

```
.
├── AGENTS.md                  # 协作与编码约定（改代码前先读）
├── data-source/               # 菜谱数据源（入库，禁止手工编辑）
│   ├── README.md              # 数据源与上游同步的详细说明
│   └── CookLikeHOC/           # 上游仓库副本：<分类>/*.md、images/、.upstream.json
├── scripts/                   # 仓库级数据管线（Node，无第三方依赖）
│   ├── sync-cooklikehoc.mjs   # 拉取上游 → 对齐数据源 → 触发前端数据重建
│   ├── recipe-categories.mjs  # 分类清单：全链路唯一真源
│   └── lib/source-sync.mjs    # 目录对齐/清理逻辑（附单测）
└── frontend/                  # Vue 3 应用（独立的 pnpm 工程）
    ├── mock/recipes-api.ts    # 开发期假后端，按 {code,message,data} 约定响应
    ├── scripts/               # build-recipes.mjs（解析 Markdown）、recipe-images.ts（图片服务）
    └── src/
        ├── api/               # 接口封装
        ├── components/        # DishStage / DishCard / FilterBar / ImageLightbox …
        ├── views/             # TodayEatView（/）、BrowseView（/browse）
        ├── stores/            # Pinia：候选池、抽取动画、收藏与今晚菜单
        ├── lib/               # 纯函数：筛选、随机抽取、备选
        ├── types/             # 全局类型与接口契约
        └── styles/            # 主题变量与基础样式
```

## 数据来源与更新

菜品数据与实拍图都来自上游开源仓库，整条链路已脚本化，**生成物禁止手工编辑**：

```
上游 Gar-b-age/CookLikeHOC
        │  scripts/sync-cooklikehoc.mjs（拉取 + 对齐 + 记录 commit）
        ▼
data-source/CookLikeHOC/<分类>/*.md ──frontend/scripts/build-recipes.mjs──▶ frontend/src/data/recipes.json
data-source/CookLikeHOC/images/* ─────frontend/scripts/recipe-images.ts────▶ 页面 <img src> / dist/images/
```

- 分类清单是唯一真源，位于 [`scripts/recipe-categories.mjs`](./scripts/recipe-categories.mjs)，
  上游同步脚本与前端数据构建共用；新增分类只改这一处。
- 图片只在数据源目录保留一份：开发时由 Vite 插件直接从数据源提供 `/images/*`，
  构建时把被引用的图片复制进 `dist/images/`，前端不再持有 `public/images/` 副本。
- `frontend/src/data/`、`frontend/dist/`、上游缓存克隆 `_cooklikehoc/` 都是生成物，已在 `.gitignore` 中忽略；
  `data-source/` 入库是为了离线构建，只能由同步脚本改写。
- 上游 commit 记录在 [`data-source/CookLikeHOC/.upstream.json`](./data-source/CookLikeHOC/.upstream.json)。

同步与检查：

```bash
cd frontend
pnpm data:sync     # 拉取上游 → 对齐 data-source → 重建 recipes.json
pnpm data:check    # 只检查上游是否有新数据（有新数据退出码 2，便于接 CI）
pnpm data:build    # 只重建 src/data/recipes.json
pnpm test:scripts  # 同步脚本的单测（node --test）
```

仓库根目录下的 `node scripts/sync-cooklikehoc.mjs` 是同一个脚本，额外支持
`--dry-run`、`--ref <分支/标签>`、`--skip-fetch`（离线）、`--no-build` 等选项，详见
[`data-source/README.md`](./data-source/README.md)。

## 页面与路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 今天吃什么 | 决定器：Hero → 筛选 → 台面（转盘 + 当前菜品）→ 备选；空格键可再抽一次 |
| `/browse` | 全部菜谱 | 总览当前分类的全部菜品，支持 `?category=蒸菜` 直达；点标题把菜放回决定器 |

两个页面共用 Pinia 里的筛选条件：在总览页换分类，回到决定器时候选范围跟着变；
抽屉（收藏夹 / 今晚菜单）在任意页面都能打开。

## 接后端

前端请求的是 `GET /api/v1/recipes`，响应体遵循统一约定 `{ code, message, data }`，
`data` 的结构见 [`frontend/src/types/recipe.ts`](./frontend/src/types/recipe.ts) 的 `RecipeDataset`。

1. 删掉 `frontend/vite.config.ts` 里的 `recipesApiMock()` 插件；
2. 保留（或调整）`server.proxy['/api']`，默认指向 `http://localhost:8080`
   （可用 `VITE_BACKEND_ORIGIN` 覆盖）；
3. 生产环境用 `VITE_API_BASE_URL` 指定 API 前缀。

接口不可用时会自动回退到打包内的 `recipes.json` 并在控制台告警，因此设计稿演示、纯前端联调都不需要后端。
鉴权 token 走 `localStorage` 的 `recipe.token`，401 会清除它（详见 `frontend/src/utils/request.ts`）。

## 开发约定

动手改代码前请先读 [AGENTS.md](./AGENTS.md)，要点：

- 代码、注释、日志、提交信息用英文；面向用户的界面文案与业务文档用中文。
- 提交信息遵循 Conventional Commits（`feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`）。
- 一次改动只解决一件事；不提交构建产物、IDE 配置与本地环境文件；密钥一律走环境变量。
- 数据库结构变更只能通过 Flyway 迁移脚本新增（后端落地后生效）。
- 提交前的最低验收线：`cd frontend && pnpm lint && pnpm typecheck && pnpm build` 通过，
  并且 `pnpm test`、`pnpm test:scripts` 全绿。

## 数据版权

菜谱文字整理自《老乡鸡菜品溯源报告》，实拍图与文本版权归原作者所有，
本项目仅作技术演示使用。数据来源仓库：[Gar-b-age/CookLikeHOC](https://github.com/Gar-b-age/CookLikeHOC)。

## 相关文档

- [`frontend/README.md`](./frontend/README.md)：前端模块的目录、数据流与对接细节
- [`data-source/README.md`](./data-source/README.md)：数据源内容与上游同步流程
- [`AGENTS.md`](./AGENTS.md)：协作、编码、数据库与 API 约定
