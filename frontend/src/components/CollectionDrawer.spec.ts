import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CollectionDrawer from '@/components/CollectionDrawer.vue'
import { usePickerStore } from '@/stores/picker'
import type { RecipeDataset } from '@/types/recipe'

vi.mock('@/api/recipes', async () => {
  const data = (await import('@/data/recipes.json')).default as unknown as RecipeDataset
  return { fetchRecipeDataset: vi.fn(async () => data) }
})

type PickerStore = ReturnType<typeof usePickerStore>

const mountOptions = { global: { stubs: { teleport: true } } }

async function setup(): Promise<{ store: PickerStore; recipeId: string; recipeName: string }> {
  setActivePinia(createPinia())
  const store = usePickerStore()
  await store.load()
  const recipe = store.allRecipes.find((item) => item.name === '贵州风味辣子鸡')
  if (!recipe) throw new Error('测试数据里找不到贵州风味辣子鸡')
  return { store, recipeId: recipe.id, recipeName: recipe.name }
}

describe('CollectionDrawer', () => {
  beforeEach(() => {
    // 收藏与今晚菜单都持久化在 localStorage，用例之间要隔离。
    localStorage.clear()
    vi.stubGlobal('requestAnimationFrame', () => 0)
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
  })

  it('收藏的菜会出现在收藏夹里', async () => {
    const { store, recipeId, recipeName } = await setup()
    store.toggleFavorite(recipeId)

    const wrapper = mount(CollectionDrawer, {
      props: { open: true, tab: 'favorites' },
      ...mountOptions,
    })
    await flushPromises()

    expect(wrapper.text()).toContain('收藏夹')
    expect(wrapper.text()).toContain(recipeName)
    expect(wrapper.findAll('.row')).toHaveLength(1)
  })

  it('点「取消收藏」把菜从收藏夹移除', async () => {
    const { store, recipeId } = await setup()
    store.toggleFavorite(recipeId)

    const wrapper = mount(CollectionDrawer, {
      props: { open: true, tab: 'favorites' },
      ...mountOptions,
    })
    await flushPromises()

    await wrapper.get('.row__remove').trigger('click')

    expect(store.favorites).toHaveLength(0)
    expect(wrapper.text()).toContain('收藏夹还空着')
    wrapper.unmount()
  })

  it('收藏夹与今晚菜单是两个独立列表', async () => {
    const { store, recipeId } = await setup()
    store.toggleFavorite(recipeId)
    const another = store.allRecipes.find((item) => item.name === '白切鸡')
    if (!another) throw new Error('测试数据里找不到白切鸡')
    store.addToTonight(another.id)

    const wrapper = mount(CollectionDrawer, {
      props: { open: true, tab: 'favorites' },
      ...mountOptions,
    })
    await flushPromises()
    expect(wrapper.findAll('.row')).toHaveLength(1)
    expect(wrapper.text()).toContain('贵州风味辣子鸡')

    await wrapper.findAll('.tab')[1]?.trigger('click')
    expect(wrapper.text()).toContain('白切鸡')
    expect(wrapper.findAll('.row')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('贵州风味辣子鸡')
    wrapper.unmount()
  })
})
