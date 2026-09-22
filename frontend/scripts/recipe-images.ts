/**
 * 菜谱图片的单一来源插件。
 *
 * 图片只在 `data-source/CookLikeHOC/images/` 保留一份：
 *   - 开发时：dev server 直接从数据源读取 `/images/<文件名>`；
 *   - 构建时：把 `src/data/recipes.json` 引用到的图片复制进 `<outDir>/images/`。
 *
 * 早期版本由 `pnpm data:build` 把被引用的图片复制到 `frontend/public/images/`，
 * 相当于在仓库里多存一份完全相同的图片；现在这份副本不再需要。
 */
import fs from 'node:fs'
import path from 'node:path'

import type { Connect, Plugin } from 'vite'

const IMAGE_URL_PREFIX = '/images/'

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
}

export interface RecipeImagesOptions {
  /** 图片真源目录：`data-source/CookLikeHOC/images`。 */
  imagesDir: string
  /** 数据构建产物：`src/data/recipes.json`。 */
  recipesJson: string
}

/**
 * 只接受单层文件名，挡掉 `../` 与子目录，避免顺着 URL 读到数据源之外的路径。
 * 注意：调用方需要先解码 URL 再判断。
 */
export function isPlainFileName(name: string): boolean {
  return (
    name !== '' && name !== '.' && name !== '..' && !name.includes('/') && !name.includes('\\')
  )
}

function decode(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

/** 从 recipes.json 收集被引用的图片文件名（已解码，可直接当文件名使用）。 */
export function collectReferencedImages(dataset: unknown): string[] {
  const recipes = (dataset as { recipes?: unknown } | null)?.recipes
  if (!Array.isArray(recipes)) return []

  const names = new Set<string>()
  for (const recipe of recipes) {
    const image = (recipe as { image?: unknown } | null)?.image
    if (typeof image !== 'string' || !image.startsWith(IMAGE_URL_PREFIX)) continue
    const name = decode(image.slice(IMAGE_URL_PREFIX.length))
    if (name && isPlainFileName(name)) names.add(name)
  }
  return [...names]
}

/** 把 `/images/<文件名>` 形式的请求路径解析成数据源里的真实文件，非法或不存在时返回 null。 */
export function resolveImageFile(imagesDir: string, requestPath: string): string | null {
  const name = decode(requestPath.replace(/^\/+/, ''))
  if (name === null || !isPlainFileName(name)) return null

  const file = path.join(imagesDir, name)
  try {
    return fs.statSync(file).isFile() ? file : null
  } catch {
    return null
  }
}

/** 把被引用的图片复制到构建产物的 `images/` 目录；数据源里缺失的图片只告警不中断构建。 */
export function copyReferencedImages(
  options: RecipeImagesOptions & { outDir: string },
): { copied: number; missing: string[] } {
  const { imagesDir, recipesJson, outDir } = options
  const dataset = JSON.parse(fs.readFileSync(recipesJson, 'utf8')) as unknown
  const names = collectReferencedImages(dataset)

  const targetDir = path.join(outDir, 'images')
  fs.mkdirSync(targetDir, { recursive: true })

  const missing: string[] = []
  let copied = 0
  for (const name of names) {
    const from = path.join(imagesDir, name)
    if (!fs.existsSync(from)) {
      missing.push(name)
      continue
    }
    fs.copyFileSync(from, path.join(targetDir, name))
    copied += 1
  }
  return { copied, missing }
}

/** `/images/*` 的 dev server 中间件：命中就返回文件，未命中直接 404。 */
export function imageMiddleware(imagesDir: string): Connect.NextHandleFunction {
  return (req, res) => {
    const requestPath = (req.url ?? '').split('?')[0]
    const file = resolveImageFile(imagesDir, requestPath)
    if (!file) {
      // 图片命名空间下的未知路径直接 404，避免 SPA fallback 把 index.html 当成图片返回。
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('Image not found')
      return
    }

    res.setHeader(
      'Content-Type',
      CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    )
    res.end(fs.readFileSync(file))
  }
}

export function recipeImages(options: RecipeImagesOptions): Plugin {
  const middleware = imageMiddleware(options.imagesDir)
  let outDir = ''

  return {
    name: 'recipe-images',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use(IMAGE_URL_PREFIX, middleware)
    },
    writeBundle() {
      const { copied, missing } = copyReferencedImages({ ...options, outDir })
      if (missing.length) {
        this.warn(`数据源缺少这些被引用的图片：${missing.join('、')}`)
      }
      this.info?.(`菜谱图片：${copied} 张复制到 images/`)
    },
  }
}
