import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import FilterBar from '@/components/FilterBar.vue'
import type { RecipeCategory, RecipeFilters } from '@/types/recipe'
import { DEFAULT_FILTERS } from '@/types/recipe'

const categories: RecipeCategory[] = [
  { key: '炒菜', tag: '快炒', emoji: '🥘', count: 71 },
  { key: '蒸菜', tag: '清蒸', emoji: '♨️', count: 49 },
]

const filters: RecipeFilters = { ...DEFAULT_FILTERS }

function mountBar() {
  return mount(FilterBar, {
    props: {
      filters,
      categories,
      poolCount: 120,
      totalCount: 290,
      hasActiveFilters: false,
    },
  })
}

describe('FilterBar', () => {
  it('分类列表用于换行而不是横向滚动', () => {
    const wrapper = mountBar()
    const list = wrapper.get('ul.cats')
    // 回归保护：不要退回到 overflow-x 滚动的实现
    expect(list.classes()).not.toContain('scroll-area')
  })

  it('渲染全部分类并带上数量', () => {
    const wrapper = mountBar()
    expect(wrapper.findAll('.cat')).toHaveLength(categories.length + 1)
    expect(wrapper.text()).toContain('全部')
    expect(wrapper.text()).toContain('71')
  })

  it('点击分类向上抛出更新后的筛选条件', async () => {
    const wrapper = mountBar()
    await wrapper.findAll('.cat')[1]?.trigger('click')
    const emitted = wrapper.emitted('update:filters')
    expect(emitted?.[0]?.[0]).toEqual({ ...filters, category: '炒菜' })
  })
})
