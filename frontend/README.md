# 今天吃什么（前端模块）

Vue 3 + TypeScript + Vite 实现的「今天吃什么」决策页：从 290 道菜谱里随机挑一道，
附带配料、做法与营养信息，支持分类/关键词筛选、收藏夹、「今晚菜单」，
以及按分类总览全部菜品。

菜谱数据来自开源项目 [Gar-b-age/CookLikeHOC](https://github.com/Gar-b-age/CookLikeHOC)，
已随仓库放在 `../data-source/CookLikeHOC`（由仓库根的 `scripts/sync-cooklikehoc.mjs` 同步）。

## 快速开始

```bash
pnpm install
pnpm dev          # 会先跑一次数据生成，再启动 dev server
```

其他命令：

```bash
pnpm data:sync    # 拉取上游 CookLikeHOC → 对齐 ../data-source/CookLikeHOC → 重新生成静态资源
pnpm data:check   # 只检查上游是否有新数据（有新数据退出码 2）
pnpm data:build   # 仅重新生成 src/data/recipes.json 与 public/images/
pnpm typecheck    # vue-tsc 类型检查
pnpm lint         # ESLint
pnpm test         # Vitest（随机/筛选等纯逻辑）
pnpm test:scripts # 上游同步脚本的单测（node --test）
pnpm build        # 数据生成 + 类型检查 + 产物构建
pnpm preview      # 预览 dist
```

## 数据流

```
data-source/CookLikeHOC/<分类>/*.md
        │  scripts/build-recipes.mjs（解析 配料/原料 + 步骤 + 营养表格）
        ▼
src/data/recipes.json   →   src/api/recipes.ts
public/images/*         →   <img src>
```

`recipes.json` 与 `public/images/` 都是生成物，不入库；`pnpm dev` / `pnpm build` 会自动重建。
数据源换了位置时用环境变量指定：

```bash
RECIPE_SOURCE_DIR=/path/to/CookLikeHOC pnpm data:build
```

上游仓库更新后，执行一次 `pnpm data:sync`（在这里，或在仓库根目录用 `node scripts/sync-cooklikehoc.mjs`）：
拉取上游 → 对齐 `data-source/CookLikeHOC` → 记录上游 commit → 再回来跑 `pnpm data:build`。
完整的选项与流程说明见 [`../data-source/README.md`](../data-source/README.md)；
分类清单由 `../scripts/recipe-categories.mjs` 提供，前端构建与上游同步脚本共用同一份定义。

## 目录说明

| 路径 | 作用 |
| --- | --- |
| `src/views/TodayEatView.vue` | 决定器页：Hero → 筛选 → 台面 → 备选 |
| `src/views/BrowseView.vue` | 总览页：摊开某个分类下的全部菜品，点一张就放回决定器 |
| `src/components/DishStage.vue` | 台面：转盘 + 菜品图 + 菜名/操作 + 配料/做法，收在同一张卡里 |
| `src/components/FilterBar.vue` | 分类、搜索、快手菜与有图筛选（分类多行换行，不横向滚动） |
| `src/components/DishCard.vue` | 通用菜品卡片，备选区与总览页共用 |
| `src/components/DishGrid.vue` | 卡片网格，带错峰入场动画 |
| `src/components/CollectionDrawer.vue` | 收藏夹 / 今晚菜单抽屉，两个标签共用一套列表（localStorage 持久化） |
| `src/stores/picker.ts` | Pinia store：候选池、抽取动画、收藏与今晚菜单 |
| `src/lib/pick.ts` | 纯函数：筛选、随机抽取、备选、转盘序列 |
| `src/api/recipes.ts` | 菜谱接口 |
| `mock/recipes-api.ts` | Vite 中间件假后端，按 `{code,message,data}` 约定返回 |

## 路由

| 路径 | 说明 |
| --- | --- |
| `/` | 今天吃什么，随机决定 |
| `/browse` | 全部菜谱，支持 `?category=蒸菜` 直接定位到某个分类 |

两个页面共用 `picker` store 里的筛选条件：在总览页选了分类，回到决定器时范围跟着走；
在总览页点任意一道，会把它放到决定器台面上。

## 接后端时怎么切

前端调用的是 `GET /api/v1/recipes`，响应体为 `{ code, message, data }`，
`data` 的结构见 `src/types/recipe.ts` 的 `RecipeDataset`。

1. 在 `vite.config.ts` 里去掉 `recipesApiMock()` 插件；
2. 保留（或调整）`server.proxy['/api']` 指向 Spring Boot 地址；
3. 生产环境用 `VITE_API_BASE_URL` 指定 API 前缀。

接口不可用时会自动回退到打包内的 `recipes.json`，并在控制台给出告警，方便离线演示。
