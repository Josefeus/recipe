---
name: 今天吃什么 · 饭点决定器
description: 家常饭桌视觉系统——米纸底、墨色字、辣椒红实色点缀，食物照片是唯一的彩色主角
colors:
  paper: "#faf6ee"
  paper-deep: "#f3ecdf"
  surface: "#fffdf8"
  surface-strong: "#f6efe2"
  ink: "#2f2a24"
  ink-muted: "#6f675c"
  ink-dim: "#9a9083"
  chili: "#c8442c"
  chili-deep: "#b23a24"
  caramel: "#b97d10"
  scallion: "#3e7d5c"
  line: "#e7dcc8"
  line-strong: "#d8c9ae"
  cream: "#fff7ee"
typography:
  hero:
    fontFamily: "'PingFang SC', 'HarmonyOS Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(2.625rem, 7.6vw, 5rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "inherit"
    fontSize: "clamp(1.875rem, 4.6vw, 3.25rem)"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  body:
    fontFamily: "inherit"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  caption:
    fontFamily: "inherit"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.16em"
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "22px"
  lg: "34px"
components:
  button-primary:
    backgroundColor: "{colors.chili}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "11px 20px"
  button-primary-hover:
    backgroundColor: "{colors.chili-deep}"
    textColor: "{colors.cream}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  chip-active:
    backgroundColor: "{colors.chili}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
---

## Overview

「家常饭桌」：页面是一张温暖的米纸（#faf6ee），文字用墨色，唯一的强调色是辣椒红——像一家街边小馆的手写菜单。食物照片自带颜色，是页面上唯一允许"鲜艳"的东西；界面本身保持纸与墨的克制。转盘（「开饭」按钮的旋转环）是页面的标志性动效，对应"让转盘替你决定"的产品概念。

**The 菜单纸 Rule.** 背景永远是纸色，卡片是更白一档的纸（#fffdf8），靠 1px 暖色描边（#e7dcc8）分层；不使用深色背景、玻璃拟态或彩色光晕。

**The 一点红 Rule.** 辣椒红只出现在"答案与动作"上：抽中的菜名、主按钮、激活的分类/开关、链接悬停。其余文字一律墨色系；数值类强调（营养数字）用葱绿。

## Colors

- 纸与面（中性）：页面底 `paper`，卡片 `surface`，次级面 `surface-strong`，深一档纸底 `paper-deep`。
- 墨（文字三级）：正文 `ink`，辅助 `ink-muted`，弱提示 `ink-dim`；深色底（灯箱遮罩、照片上的浮动按钮）上用 `cream` 反白。
- 辣椒红（主强调）：`chili` 为标准态，`chili-deep` 为悬停态；仅用于动作与答案。
- 焦糖 `caramel`：只作转盘环等图形填充，不作小字颜色（浅底上对比不足）。
- 葱绿 `scallion`：营养数值专用。
- 描边：`line` 常规，`line-strong` 强调/输入框。

## Typography

系统中文无衬线栈（PingFang SC 优先）。字阶三级：hero 标题 clamp(2.625rem–5rem)/900，区块标题 clamp(1.875rem–3.25rem)/900，正文 15px/400，注释性小字 12px 带 0.16em 字距。字重承担层级，不用颜色渐变或细体装饰。

## Layout

单列内容壳，最大 1120px，两侧留白 `100% - 40px`。断点行为：≤720px 分类筛选变单行横向滑动（隐藏滚动条、两侧 14px 渐隐遮罩）；≤900px 决定器台面转为纵向堆叠（转盘 → 图 → 信息）；≤640px 顶栏隐藏"全部菜谱"入口。列表网格 `auto-fill, minmax(214px, 1fr)`。

## Elevation & Depth

**The 描边优先 Rule.** 静态分层靠 1px 描边 + 极浅投影（`0 1px 2px rgba(63,48,32,0.06)`）；悬停浮起才允许更大的柔影（`--shadow-lift`）。禁止彩色光晕、零偏移发光和 backdrop-blur 玻璃效果。深色遮罩只属于两类场景：灯箱背衬与叠在照片上的浮动控件（缩放角标、收藏按钮）。

## Shapes

圆角三档：卡片 18px，输入/步骤序号 10–14px，按钮、徽标、标签 999px 胶囊。品牌印章是一个 42px 的 14px 圆角方块，辣椒红底 + 奶白字。

## Components

- **卡片**：白纸面 + 1px 描边 + 微影；悬停浮起 4px 并加深描边。
- **主按钮**：辣椒红实底奶白字，悬停加深；禁用态 45% 透明。
- **转盘（开饭）**：外环为焦糖→辣椒红的锥形渐变，静态 4.2s/圈慢转，抽取时 0.7s/圈快转；核心是白纸圆面。无光晕、无脉冲。
- **分类 chip**：未激活为纸面胶囊；激活为辣椒红实底。
- **无图占位**：按菜名哈希色相铺浅粉彩渐变，居中分类 emoji；emoji 缺失时退回菜名首字（同色相深色字）。
- **灯箱**：深墨遮罩（rgba(31,24,18,0.66)）上浮一张纸质卡片面板。
- **抽屉**：右侧 400px 白纸面板，深墨半透明背衬。

## Do's and Don'ts

- **不要**渐变文字、深色主题、极光光晕、玻璃拟态、霓虹发光——这些是此前版本遗留的反模式。
- **不要**把辣椒红用在正文长文本或大面积色块上；红是"一点"，不是"一片"。
- **不要**给浅底上的小字用焦糖黄（对比度不足），小字强调一律辣椒红或葱绿。
- **要**让照片当主角：界面保持纸墨，图片区域本身可以用深色浮动控件保证可读。
- **要**使用平滑减速缓动（cubic-bezier(0.22, 1, 0.36, 1)）；禁止回弹/弹性缓动。