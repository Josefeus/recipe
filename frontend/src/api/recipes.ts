import bundled from '@/data/recipes.json'
import type { RecipeDataset } from '@/types/recipe'
import { request } from '@/utils/request'

const bundledDataset = bundled as unknown as RecipeDataset

/**
 * 拉取菜谱数据集。
 * 优先走后端 /api/v1/recipes；接口不可用时回退到随包发布的内置数据，
 * 这样页面在没有后端的环境下也能独立跑起来。
 */
export async function fetchRecipeDataset(): Promise<RecipeDataset> {
  try {
    const dataset = await request<RecipeDataset>({ url: '/api/v1/recipes', method: 'get' })
    if (!dataset?.recipes?.length) throw new Error('接口返回的菜谱为空')
    return dataset
  } catch (error) {
    console.warn('[recipes] /api/v1/recipes 不可用，已回退到内置数据', error)
    return bundledDataset
  }
}
