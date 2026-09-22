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
import BrowseView from '@/views/BrowseView.vue'

vi.mock('@/api/recipes', async () => {
  const data = (await import('@/data/recipes.json')).default as unknown as RecipeDataset
  return { fetchRecipeDataset: vi.fn(async () => data) }
})

const fixture = dataset as unknown as RecipeDataset

let pinia: Pinia

/** 等一次真实导航结束；组件里的 push 是 fire-and-forget，测试要显式等待。 */
function waitForNavigation(router: Router): Promise<string> {
  return new Promise((resolve) => {
    const stop = router.afterEach((to) => {
      stop()
      resolve(to.path)
    })
  })
}

async function mountBrowse(path = '/browse') {
  const router: Router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(BrowseView, {
    global: { plugins: [pinia, router], stubs: { teleport: true } },
  })
  await flushPromises()
  return { wrapper, router, store: usePickerStore() }
}

describe('BrowseView', () => {
  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    // 抽奖动画与这个页面无关，直接停掉。
    vi.stubGlobal('requestAnimationFrame', () => 0)
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
  })

  it('默认摊开全部菜品', async () => {
    const { wrapper, store } = await mountBrowse()

    expect(store.pool).toHaveLength(fixture.recipes.length)
    expect(wrapper.findAll('.dish-card')).toHaveLength(fixture.recipes.length)
    expect(wrapper.text()).toContain('全部菜品')
  })

  it('URL 上的分类会决定初始范围', async () => {
    const { wrapper, store } = await mountBrowse('/browse?category=蒸菜')
    const expected = fixture.recipes.filter((item) => item.category === '蒸菜').length

    expect(store.filters.category).toBe('蒸菜')
    expect(store.pool).toHaveLength(expected)
    expect(wrapper.findAll('.dish-card')).toHaveLength(expected)
    expect(wrapper.text()).toContain('蒸菜')
  })

  it('切换分类会把范围写回 URL', async () => {
    const { router, store } = await mountBrowse()

    store.filters = { ...store.filters, category: '汤' }
    await flushPromises()

    expect(router.currentRoute.value.query.category).toBe('汤')
  })

  it('点一道菜就放回决定器台面', async () => {
    const { wrapper, router, store } = await mountBrowse('/browse?category=汤')

    const navigated = waitForNavigation(router)
    await wrapper.get('.dish-card__main').trigger('click')
    const path = await navigated
    await flushPromises()

    expect(store.current).not.toBeNull()
    expect(store.current?.category).toBe('汤')
    expect(path).toBe('/')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('点图片是放大看实拍图，不会顺手把菜放回台面', async () => {
    const { wrapper, router } = await mountBrowse('/browse')

    // 没有实拍图的卡片点图等于选中，所以这里挑一张有图的。
    const card = wrapper.findAll('.dish-card').find((item) => item.find('img').exists())
    if (!card) throw new Error('测试数据里没有带实拍图的菜')

    await card.get('.dish-card__media').trigger('click')
    await flushPromises()

    expect(wrapper.find('.lightbox').exists()).toBe(true)
    expect(router.currentRoute.value.path).toBe('/browse')

    await wrapper.get('.lightbox__close').trigger('click')
    expect(wrapper.find('.lightbox').exists()).toBe(false)
  })
})
