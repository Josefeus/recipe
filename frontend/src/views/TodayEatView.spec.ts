import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Pinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import dataset from '@/data/recipes.json'
import { routes } from '@/router'
import { usePickerStore } from '@/stores/picker'
import type { RecipeDataset } from '@/types/recipe'
import TodayEatView from '@/views/TodayEatView.vue'

// 不真的发请求：直接用打包内的数据集喂给 store。
vi.mock('@/api/recipes', async () => {
  const data = (await import('@/data/recipes.json')).default as unknown as RecipeDataset
  return { fetchRecipeDataset: vi.fn(async () => data) }
})

const fixture = dataset as unknown as RecipeDataset

let pinia: Pinia
let router: Router
let frames: FrameRequestCallback[] = []

/** 手动驱动 rAF：给一个「未来时间」就能让抽取动画一帧跑完并落定。 */
function runFrames(now = performance.now() + 10_000): void {
  let guard = 0
  while (frames.length > 0 && guard < 50) {
    const batch = frames
    frames = []
    batch.forEach((callback) => callback(now))
    guard += 1
  }
}

describe('TodayEatView', () => {
  beforeEach(() => {
    // 收藏与今晚菜单持久化在 localStorage，用例之间要隔离。
    localStorage.clear()
    frames = []
    pinia = createPinia()
    setActivePinia(pinia)
    router = createRouter({ history: createMemoryHistory(), routes })
    void router.push('/')
    void router.isReady()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {
      frames = []
    })
  })

  it('挂载后能加载数据并渲染主界面', async () => {
    const wrapper = mount(TodayEatView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    runFrames()
    await flushPromises()

    const store = usePickerStore()
    expect(store.dataset).not.toBeNull()
    expect(store.allRecipes.length).toBe(fixture.recipes.length)

    const text = wrapper.text()
    expect(text).toContain('今天吃什么')
    expect(text).toContain('候选')
    expect(text).toContain('开饭')
    expect(text).toContain('换一个')
    expect(text).toContain('只看有图')
    expect(text).toContain('30 分钟内')
    expect(text).toContain('换一批')
    // 分类 tab 全部渲染
    for (const category of fixture.categories) {
      expect(text).toContain(category.key)
    }
    expect(wrapper.findAll('.cat')).toHaveLength(fixture.categories.length + 1)
  })

  it('按分类筛选会影响候选数量', async () => {
    const wrapper = mount(TodayEatView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    const store = usePickerStore()

    const expected = fixture.recipes.filter((item) => item.category === '炒菜').length
    store.filters = { ...store.filters, category: '炒菜' }
    await flushPromises()
    runFrames()

    expect(store.pool.length).toBe(expected)
    expect(wrapper.text()).toContain(`符合条件的有 ${expected} 道`)
  })

  it('抽完之后切换分类会自动重抽，而不是把结果清空', async () => {
    const wrapper = mount(TodayEatView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    const store = usePickerStore()

    runFrames()
    expect(store.rolling).toBe(false)
    expect(store.current).not.toBeNull()

    store.filters = { ...store.filters, category: '蒸菜' }
    await flushPromises()
    runFrames()
    await flushPromises()

    expect(store.current).not.toBeNull()
    expect(store.current?.category).toBe('蒸菜')
    // 结果和做法都在同一张台面卡里
    expect(wrapper.text()).toContain('怎么做')
  })

  it('搜索把所有候选排除掉时台面清空并提示', async () => {
    const wrapper = mount(TodayEatView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    const store = usePickerStore()

    runFrames()
    expect(store.current).not.toBeNull()

    store.filters = { ...store.filters, keyword: '这道菜肯定不存在' }
    await flushPromises()

    expect(store.pool).toHaveLength(0)
    expect(store.current).toBeNull()
    expect(wrapper.text()).toContain('这个条件下没有菜')
  })
})
