import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import type { Connect, Plugin } from 'vite'

const API_PATH = '/api/v1/recipes'
const DATA_FILE = fileURLToPath(new URL('../src/data/recipes.json', import.meta.url))

interface MockDataset {
  recipes: Array<{ category: string; name: string }>
  [key: string]: unknown
}

/**
 * 开发/预览期的假后端：按 AGENTS.md 的响应约定返回 { code, message, data }。
 * Spring Boot 就绪后删掉这个插件，vite.config.ts 里的 /api 代理会自动接管。
 */
export function recipesApiMock(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? ''
    if (!url.startsWith(API_PATH)) {
      next()
      return
    }

    const query = new URL(url, 'http://localhost').searchParams
    const category = query.get('category')
    const keyword = query.get('keyword')?.trim()

    const dataset = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as MockDataset
    let recipes = dataset.recipes
    if (category) recipes = recipes.filter((item) => item.category === category)
    if (keyword) recipes = recipes.filter((item) => item.name.includes(keyword))

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ code: 0, message: 'ok', data: { ...dataset, recipes } }))
  }

  return {
    name: 'recipes-api-mock',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
