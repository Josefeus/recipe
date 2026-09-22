import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DishStage from '@/components/DishStage.vue'
import dataset from '@/data/recipes.json'
import type { Recipe, RecipeDataset } from '@/types/recipe'

const fixture = dataset as unknown as RecipeDataset
const recipe = fixture.recipes.find((item) => item.name === '贵州风味辣子鸡') as Recipe

interface StageProps {
  name: string
  rolling: boolean
  recipe: Recipe | null
  poolSize: number
  favorited?: boolean
  inPool?: boolean
}

function mountStage(props: Partial<StageProps> = {}) {
  return mount(DishStage, {
    props: { name: recipe.name, rolling: false, recipe, poolSize: 290, ...props },
  })
}

describe('DishStage', () => {
  it('把选中的菜、配料和做法放在同一张卡里', () => {
    const wrapper = mountStage()
    const text = wrapper.text()

    expect(text).toContain('贵州风味辣子鸡')
    expect(text).toContain('要准备的东西')
    expect(text).toContain('辣子鸡酱料')
    expect(text).toContain('怎么做')
    expect(text).toContain('翻炒4 分钟')
    expect(wrapper.findAll('.steps li')).toHaveLength(recipe.steps.length)
    expect(wrapper.find('.stage__media img').exists()).toBe(true)

    const href = wrapper.get('a.stage__source').attributes('href') ?? ''
    expect(href).toContain('github.com/Gar-b-age/CookLikeHOC')
    expect(href).toContain(encodeURIComponent('贵州风味辣子鸡'))
  })

  it('点转盘抛出 roll', async () => {
    const wrapper = mountStage()
    await wrapper.get('.dial').trigger('click')
    expect(wrapper.emitted('roll')).toHaveLength(1)
  })

  it('点预览图抛出 zoom，方便放大看实拍图', async () => {
    const wrapper = mountStage()
    expect(wrapper.get('.stage__media').attributes('disabled')).toBeUndefined()

    await wrapper.get('.stage__media').trigger('click')

    expect(wrapper.emitted('zoom')?.[0]).toEqual([recipe])
  })

  it('菜没有实拍图时预览图不可点，也不抛 zoom', async () => {
    const plain = { ...recipe, image: null }
    const wrapper = mountStage({ recipe: plain })

    expect(wrapper.get('.stage__media').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.dish-zoom').exists()).toBe(false)
  })

  it('「就它了」与「收藏」分别抛出事件', async () => {
    const wrapper = mountStage()
    const buttons = wrapper.findAll('.stage__actions .btn')

    await buttons[1]?.trigger('click')
    await buttons[2]?.trigger('click')

    expect(wrapper.emitted('accept')).toHaveLength(1)
    expect(wrapper.emitted('favorite')?.[0]).toEqual([recipe.id])
  })

  it('还没抽到时只显示转盘与占位图', () => {
    const wrapper = mount(DishStage, {
      props: { name: '', rolling: false, recipe: null, poolSize: 290 },
    })
    const text = wrapper.text()

    expect(text).toContain('还没想好')
    expect(text).toContain('抽一道')
    expect(wrapper.find('.stage__media-placeholder').exists()).toBe(true)
    expect(wrapper.find('.stage__facts').exists()).toBe(false)
  })

  it('滚动过程中不展示做法', () => {
    const wrapper = mountStage({ rolling: true })
    expect(wrapper.find('.stage__facts').exists()).toBe(false)
  })

  it('菜不在当前筛选范围内时给出提示', () => {
    const wrapper = mountStage({ inPool: false })
    expect(wrapper.text()).toContain('不在当前筛选内')
  })
})
