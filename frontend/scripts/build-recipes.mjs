/**
 * 从 data-source/CookLikeHOC 抽取菜谱数据，产出：
 *   - src/data/recipes.json   结构化菜谱数据（前端打包内使用）
 *
 * 菜品实拍图不再复制到前端：图片只在 data-source/CookLikeHOC/images 保留一份，
 * 开发与构建时由 vite.config.ts 里的 recipeImages 插件按需提供（见 scripts/recipe-images.ts）。
 *
 * 用法：pnpm data:build
 * 可用 RECIPE_SOURCE_DIR 覆盖数据源目录；菜谱分类定义在仓库根的
 * scripts/recipe-categories.mjs，与上游同步脚本共用。
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CATEGORIES } from '../../scripts/recipe-categories.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const sourceRoot = path.resolve(
  process.env.RECIPE_SOURCE_DIR ?? path.join(projectRoot, '..', 'data-source', 'CookLikeHOC'),
)
const outputJson = path.join(projectRoot, 'src', 'data', 'recipes.json')

const INGREDIENT_HEADING = /^(配料|原料|食材|主要原料|配方|品类)/
const STEP_HEADING = /(步骤|制作|工艺|流程|装配|炒制|烧制|烫制|冲调|现磨|出品|复热)/
const NUTRITION_HEADING = /(营养成分|已知成分|营养)/

const BULLET = /^\s*(?:[-*+]|\d+[.、)])\s*/

/** 菜名与正文里存在 [葱油](/配料/葱油.md)鸡 这类链接写法，统一还原成纯文本。 */
function stripLinks(text) {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
}

function cleanText(raw) {
  return stripLinks(raw)
    .replace(/^\s*(?:\d+[.、)]|[ivxIVX]+[.、)]|[（(]\d+[)）])\s*/, '')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/[；;]\s*$/, '')
    .trim()
}

/** 把 markdown 切成 [{ heading, lines }]，兼容 `## # 1. xxx制作：` 这种写法。 */
function splitSections(markdown) {
  const sections = []
  let current = { heading: '', lines: [] }
  for (const line of markdown.split(/\r?\n/)) {
    const headingMatch = /^#{2,3}\s+(.*)$/.exec(line)
    if (headingMatch) {
      sections.push(current)
      current = { heading: headingMatch[1].replace(/^#+\s*/, '').trim(), lines: [] }
      continue
    }
    current.lines.push(line)
  }
  sections.push(current)
  return sections.filter((s) => s.heading || s.lines.some((l) => l.trim()))
}

function bullets(lines) {
  return lines
    .filter((line) => BULLET.test(line) || /^\s*-\s+/.test(line))
    .map((line) => cleanText(line.replace(BULLET, '')))
    .filter(Boolean)
}

/** markdown 表格的对齐分隔单元格，如 `---`、`:---`、`---:`、`:---:`。 */
function isTableDivider(cell) {
  return /^:?-+:?$/.test(cell)
}

/** `| 热量 | 179 Kcal |` → { label: '热量', value: '179 Kcal' } */
export function parseNutrition(lines) {
  const rows = []
  for (const line of lines) {
    const cells = line.split('|').map((c) => c.trim())
    if (cells.length < 4) continue
    const [, label, value] = cells
    if (!label || !value) continue
    if (isTableDivider(label) || label === '项目') continue
    rows.push({ label, value })
  }
  return rows
}

/** 记录上游版本的 .upstream.json，由 scripts/sync-cooklikehoc.mjs 写入。 */
function readUpstreamMeta() {
  const file = path.join(sourceRoot, '.upstream.json')
  if (!fs.existsSync(file)) return null
  try {
    const meta = JSON.parse(fs.readFileSync(file, 'utf8'))
    return { commit: meta.commit ?? null, ref: meta.ref ?? null }
  } catch {
    return null
  }
}

/** 步骤里出现的分钟/小时求和，作为「大概要花多久」的粗略估算。 */
function estimateMinutes(steps) {
  let total = 0
  for (const step of steps) {
    for (const m of step.matchAll(/(\d+(?:\.\d+)?)\s*(小时|分钟|min|h)/gi)) {
      const value = Number(m[1])
      if (Number.isNaN(value)) continue
      total += /小时|h/i.test(m[2]) ? value * 60 : value
    }
  }
  return total > 0 ? Math.round(total) : null
}

function resolveImage(ref, imageIndex) {
  if (!ref) return null
  const base = path.basename(ref.trim())
  if (imageIndex.has(base)) return imageIndex.get(base)
  const stem = base.replace(/\.[^.]+$/, '')
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    const candidate = stem + ext
    if (imageIndex.has(candidate)) return imageIndex.get(candidate)
  }
  return null
}

/** Windows 上偶发的 EPERM（杀软/索引占用）用短暂的同步重试兜底。 */
function withRetry(action, attempts = 5) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      return action()
    } catch (error) {
      lastError = error
      if (error?.code !== 'EPERM' && error?.code !== 'EBUSY') throw error
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150 * (i + 1))
    }
  }
  throw lastError
}

function main() {
  if (!fs.existsSync(sourceRoot)) {
    if (fs.existsSync(outputJson)) {
      console.warn(`跳过数据生成：找不到数据源 ${sourceRoot}，沿用已有的 recipes.json。`)
      return
    }
    console.error(`找不到数据源目录：${sourceRoot}`)
    console.error('请设置 RECIPE_SOURCE_DIR，或把 Gar-b-age/CookLikeHOC 放到 data-source/CookLikeHOC')
    process.exit(1)
  }

  const imagesDir = path.join(sourceRoot, 'images')
  const imageIndex = new Map()
  if (fs.existsSync(imagesDir)) {
    for (const file of fs.readdirSync(imagesDir)) {
      if (/\.(png|jpe?g|webp|gif)$/i.test(file)) imageIndex.set(file, file)
    }
  }

  const recipes = []
  const categories = []
  const usedImages = new Set()
  const warnings = []
  const skipped = []

  for (const category of CATEGORIES) {
    const dir = path.join(sourceRoot, category.key)
    if (!fs.existsSync(dir)) {
      warnings.push(`跳过缺失分类目录：${category.key}`)
      continue
    }
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))

    let count = 0
    for (const file of files) {
      const markdown = fs.readFileSync(path.join(dir, file), 'utf8')
      const titleMatch = /^#\s+(.+)$/m.exec(markdown)
      const name = stripLinks((titleMatch?.[1] ?? file.replace(/\.md$/, '')).trim())
      const imageRef = /^!\[[^\]]*\]\((.+)\)\s*$/m.exec(markdown)?.[1] ?? null
      const image = resolveImage(imageRef, imageIndex)
      if (image) usedImages.add(image)
      else if (imageRef) warnings.push(`${name}：引用图片缺失 ${imageRef}`)

      const ingredients = []
      const steps = []
      const nutrition = []
      for (const section of splitSections(markdown)) {
        if (!section.heading) continue
        const heading = section.heading.replace(/[:：]\s*$/, '')
        if (NUTRITION_HEADING.test(heading)) {
          nutrition.push(...parseNutrition(section.lines))
        } else if (INGREDIENT_HEADING.test(heading)) {
          ingredients.push(...bullets(section.lines))
        } else if (STEP_HEADING.test(heading)) {
          steps.push(...bullets(section.lines))
        }
      }

      // 没有步骤的条目（瓶装矿泉水、罐装汽水等）做不了，不进候选池。
      if (steps.length === 0) {
        skipped.push(name)
        continue
      }

      recipes.push({
        id: `r${createHash('sha1').update(`${category.key}/${name}`).digest('hex').slice(0, 10)}`,
        name,
        category: category.key,
        image: image ? `/images/${encodeURIComponent(image)}` : null,
        ingredients,
        steps,
        nutrition,
        estMinutes: estimateMinutes(steps),
      })
      count += 1
    }

    categories.push({ key: category.key, tag: category.tag, emoji: category.emoji, count })
  }

  const upstreamMeta = readUpstreamMeta()
  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      repo: 'https://github.com/Gar-b-age/CookLikeHOC',
      note: '菜谱内容整理自《老乡鸡菜品溯源报告》，版权归原作者所有，此处仅作演示数据。',
      ...(upstreamMeta ?? {}),
    },
    categories,
    recipes,
  }

  fs.mkdirSync(path.dirname(outputJson), { recursive: true })
  withRetry(() => fs.writeFileSync(outputJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8'))

  console.log(`菜谱 ${recipes.length} 条，分类 ${categories.length} 个，引用图片 ${usedImages.size} 张`)
  console.log(`输出：${path.relative(projectRoot, outputJson)}`)
  if (skipped.length) {
    console.log(`\n跳过 ${skipped.length} 条非菜品条目：${skipped.join('、')}`)
  }
  if (warnings.length) {
    console.log(`\n提示 ${warnings.length} 条：`)
    for (const warning of warnings.slice(0, 20)) console.log(`  - ${warning}`)
    if (warnings.length > 20) console.log(`  ... 其余 ${warnings.length - 20} 条省略`)
  }
}

// 仅在直接执行时生成数据；被单测 import 时不产生副作用。
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
