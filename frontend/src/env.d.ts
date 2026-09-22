/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 前缀，留空表示同源（默认走 vite mock 中间件）。 */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
