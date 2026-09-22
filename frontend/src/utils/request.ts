import axios from 'axios'
import type { AxiosError, AxiosRequestConfig } from 'axios'

import type { ApiResponse } from '@/types/api'

/** 统一的业务异常，code 为后端业务码（或 -1 表示本地异常）。 */
export class ApiError extends Error {
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('recipe.token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status ?? -1
    const message =
      error.response?.data?.message ?? error.message ?? '网络异常，请稍后重试'
    if (status === 401) {
      localStorage.removeItem('recipe.token')
    }
    return Promise.reject(new ApiError(status, message))
  },
)

/** 发起请求并解包 ApiResponse，业务码非 0 时抛 ApiError。 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<ApiResponse<T>>(config)
  const payload = response.data
  if (!payload || typeof payload.code !== 'number') {
    throw new ApiError(-1, '响应格式不符合约定')
  }
  if (payload.code !== 0) {
    throw new ApiError(payload.code, payload.message || '请求失败')
  }
  return payload.data
}
