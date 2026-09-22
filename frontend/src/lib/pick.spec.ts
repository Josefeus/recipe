import { describe, expect, it } from 'vitest'

import { buildRollSequence, filterRecipes, pickRandom, pickSuggestions } from '@/lib/pick'
import type { Recipe } from '@/types/recipe'
import { DEFAULT_FILTERS } from '@/types/recipe'

function makeRecipe(name: string, overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: name,
    name,
    category: '炒菜',
    image: null,
    ingredients: [],
    steps: ['随便炒炒'],
    nutrition: [],
    estMinutes: null,
    ...overrides,
  }
}

const dataset: Recipe[] = [
  makeRecipe('贵州风味辣子鸡', { ingredients: ['炸制鸡块', '辣子鸡酱料'], estMinutes: 8 }),
  makeRecipe('宫保鸡丁', { category: '炒菜', image: '/images/a.png', estMinutes: 45 }),
  makeRecipe('白米粥', { category: '早餐', image: '/images/b.png', estMinutes: 30 }),
  makeRecipe('老鸡汤', { category: '汤', ingredients: ['老母鸡'], estMinutes: 90 }),
]

describe('filterRecipes', () => {
  it('按分类过滤', () => {
    const result = filterRecipes(dataset, { ...DEFAULT_FILTERS, category: '汤' })
    expect(result.map((r) => r.name)).toEqual(['老鸡汤'])
  })

  it('关键词同时匹配菜名与配料', () => {
    expect(filterRecipes(dataset, { ...DEFAULT_FILTERS, keyword: '辣子' })).toHaveLength(1)
    expect(filterRecipes(dataset, { ...DEFAULT_FILTERS, keyword: '老母鸡' })).toHaveLength(1)
  })

  it('只看有图 / 只看快手菜', () => {
    expect(filterRecipes(dataset, { ...DEFAULT_FILTERS, onlyWithImage: true })).toHaveLength(2)
    const quick = filterRecipes(dataset, { ...DEFAULT_FILTERS, quickOnly: true })
    expect(quick.map((r) => r.name)).toEqual(['贵州风味辣子鸡', '白米粥'])
  })
})

describe('pickRandom', () => {
  it('空池返回 null', () => {
    expect(pickRandom([], null)).toBeNull()
  })

  it('尽量避开上一次的结果', () => {
    const only = [dataset[0]]
    expect(pickRandom(only, '贵州风味辣子鸡')?.name).toBe('贵州风味辣子鸡')
    const picked = pickRandom(dataset, '贵州风味辣子鸡', () => 0)
    expect(picked?.name).not.toBe('贵州风味辣子鸡')
  })
})

describe('pickSuggestions', () => {
  it('不重复且排除已选', () => {
    const suggestions = pickSuggestions(dataset, ['贵州风味辣子鸡'], 5, () => 0)
    expect(suggestions).toHaveLength(3)
    expect(new Set(suggestions.map((r) => r.id)).size).toBe(3)
  })
})

describe('buildRollSequence', () => {
  it('末位固定为最终结果', () => {
    const sequence = buildRollSequence(dataset, dataset[1], 5, () => 0)
    expect(sequence).toHaveLength(6)
    expect(sequence.at(-1)?.name).toBe('宫保鸡丁')
  })
})
