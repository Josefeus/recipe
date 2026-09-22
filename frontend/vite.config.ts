import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

import { recipesApiMock } from './mock/recipes-api'
import { recipeImages } from './scripts/recipe-images'

// 图片真源在 data-source/CookLikeHOC/images，由 recipeImages 插件按需提供（dev）
// 或复制进 dist/images（build），前端不再保留第二份 public/images 副本。
const sourceRoot = path.resolve(
  process.env.RECIPE_SOURCE_DIR ??
    fileURLToPath(new URL('../data-source/CookLikeHOC', import.meta.url)),
)

export default defineConfig({
  // frontend/public 里已经没有需要原样拷贝的静态文件，图片走 recipeImages 插件。
  publicDir: false,
  plugins: [
    vue(),
    recipesApiMock(),
    recipeImages({
      imagesDir: path.join(sourceRoot, 'images'),
      recipesJson: fileURLToPath(new URL('./src/data/recipes.json', import.meta.url)),
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 后端就绪后把 /api 指向 Spring Boot，去掉 mock 插件即可。
      '/api': {
        target: process.env.VITE_BACKEND_ORIGIN ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts', 'scripts/**/*.spec.ts'],
  },
})
