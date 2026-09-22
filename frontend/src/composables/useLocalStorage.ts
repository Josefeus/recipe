import { ref, watch } from 'vue'
import type { Ref } from 'vue'

/** 与 localStorage 双向同步的 ref，读写失败时静默降级为内存状态。 */
export function useLocalStorage<T>(key: string, initial: T): Ref<T> {
  let parsed = initial
  try {
    const raw = localStorage.getItem(key)
    if (raw) parsed = JSON.parse(raw) as T
  } catch {
    parsed = initial
  }

  const state = ref(parsed) as unknown as Ref<T>
  watch(
    state,
    (value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        /* 隐私模式或配额不足时忽略 */
      }
    },
    { deep: true },
  )
  return state
}
