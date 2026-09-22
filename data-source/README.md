# data-source

本目录下的 `CookLikeHOC/` 是
[Gar-b-age/CookLikeHOC](https://github.com/Gar-b-age/CookLikeHOC) 的菜谱数据副本，
供 `frontend/scripts/build-recipes.mjs` 解析使用，请勿手工编辑。

- `CookLikeHOC/<分类>/*.md`：菜谱原文（配料、步骤、部分含营养表）
- `CookLikeHOC/images/*`：菜品实拍图
- `CookLikeHOC/.upstream.json`：上次同步记录的上游 commit / 分支，由同步脚本写入

菜谱文字整理自《老乡鸡菜品溯源报告》，版权归原作者所有，此处仅作演示数据。

## 同步上游更新

一条命令完成「拉取上游 → 更新本目录 → 重新生成前端静态资源」：

```bash
cd frontend && pnpm data:sync     # = node ../scripts/sync-cooklikehoc.mjs
```

脚本会做四件事，任一步失败都会立即中止并报出原因：

1. 把上游仓库拉取到本地缓存克隆 `_cooklikehoc/`（已在 `.gitignore` 中忽略）；
2. 按 `scripts/recipe-categories.mjs` 里的分类逐目录对齐 `CookLikeHOC/`，
   新增 / 更新 / 删除文件，并清理随之变空的目录；
3. 把上游 commit 写入 `CookLikeHOC/.upstream.json`（commit 未变时不重写）；
4. 在 `frontend/` 执行 `pnpm data:build`，重建 `src/data/recipes.json` 与 `public/images/`。

常用选项：

```bash
pnpm data:check                                   # 只检查上游是否有新数据
node scripts/sync-cooklikehoc.mjs --dry-run       # 只打印将要发生的改动
node scripts/sync-cooklikehoc.mjs --ref v1.2.0    # 固定到某个分支 / 标签
node scripts/sync-cooklikehoc.mjs --skip-fetch     # 离线，直接用已有缓存克隆
node scripts/sync-cooklikehoc.mjs --no-build       # 只同步数据源，不跑前端构建
node scripts/sync-cooklikehoc.mjs --help           # 全部选项
```

上表里 `node scripts/...` 的写法在仓库根目录执行；脚本自身位置决定数据源路径，
所以在任意目录调用都指向同一份数据（`pnpm data:sync` 只是它的别名）。

`--check` 用退出码表达结果：`0` = 已最新，`2` = 上游有新数据（方便接 CI 定时任务）。
需要网络时（`git clone` / `git fetch`）脚本会直接报出 git 的错误信息。

脚本逻辑（目录对齐、清理空目录、上游新增目录提示）的单测在
`scripts/lib/source-sync.test.mjs`，在 `frontend/` 下用 `pnpm test:scripts` 运行。
