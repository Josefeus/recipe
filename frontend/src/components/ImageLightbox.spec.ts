import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ImageLightbox from '@/components/ImageLightbox.vue'
import dataset from '@/data/recipes.json'
import type { Recipe, RecipeDataset } from '@/types/recipe'

const fixture = dataset as unknown as RecipeDataset
const withImage = fixture.recipes.find((item) => item.image) as Recipe
const withoutImage = fixture.recipes.find((item) => !item.image) as Recipe

const options = { global: { stubs: { teleport: true } } }

describe('ImageLightbox', () => {
  it('没有选中的菜时不渲染任何内容', () => {
    const wrapper = mount(ImageLightbox, { props: { recipe: null }, ...options })
    expect(wrapper.find('.lightbox').exists()).toBe(false)
  })

  it('把实拍图放大展示，并带上菜名', () => {
    const wrapper = mount(ImageLightbox, { props: { recipe: withImage }, ...options })

    const image = wrapper.get('.lightbox__frame img')
    expect(image.attributes('src')).toBe(withImage.image)
    expect(image.attributes('alt')).toBe(withImage.name)
    expect(wrapper.get('.lightbox__meta strong').text()).toBe(withImage.name)
  })

  it('没有实拍图时给出说明而不是空白框', () => {
    const wrapper = mount(ImageLightbox, { props: { recipe: withoutImage }, ...options })

    expect(wrapper.find('.lightbox__frame img').exists()).toBe(false)
    expect(wrapper.text()).toContain('还没有实拍图')
  })

  it('Esc、空白处和关闭按钮都能关掉大图', async () => {
    const wrapper = mount(ImageLightbox, { props: { recipe: withImage }, ...options })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.get('.lightbox').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(2)

    await wrapper.get('.lightbox__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(3)

    wrapper.unmount()
  })

  it('打开时锁住页面滚动，关闭后恢复', async () => {
    const wrapper = mount(ImageLightbox, { props: { recipe: withImage }, ...options })
    await wrapper.vm.$nextTick()
    expect(document.body.style.overflow).toBe('hidden')

    await wrapper.setProps({ recipe: null })
    expect(document.body.style.overflow).toBe('')
    wrapper.unmount()
  })
})
