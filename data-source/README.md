# data-source

本目录下的 `CookLikeHOC/` 是
[Gar-b-age/CookLikeHOC](https://github.com/Gar-b-age/CookLikeHOC) 的菜谱数据副本，
供 `frontend/scripts/build-recipes.mjs` 解析使用，请勿手工编辑。

- `CookLikeHOC/<分类>/*.md`：菜谱原文（配料、步骤、部分含营养表）
- `CookLikeHOC/images/*`：菜品实拍图

菜谱文字整理自《老乡鸡菜品溯源报告》，版权归原作者所有，此处仅作演示数据。
同步上游更新：

```bash
git clone --depth 1 https://github.com/Gar-b-age/CookLikeHOC.git /tmp/CookLikeHOC
# 再把 <分类>/*.md 与 images/ 覆盖到本目录，然后回到 frontend 执行：
pnpm data:build
```
