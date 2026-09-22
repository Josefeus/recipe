import type { Recipe, RecipeFilters } from '@/types/recipe'
import { QUICK_MINUTES } from '@/types/recipe'

/** 全部为纯函数，方便单测；随机源可注入。 */
export type RandomFn = () => number

export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  const keyword = filters.keyword.trim().toLowerCase()
  return recipes.filter((recipe) => {
    if (filters.category && recipe.category !== filters.category) return false
    if (filters.onlyWithImage && !recipe.image) return false
    if (filters.quickOnly) {
      if (recipe.estMinutes === null || recipe.estMinutes > QUICK_MINUTES) return false
    }
    if (!keyword) return true
    if (recipe.name.toLowerCase().includes(keyword)) return true
    return recipe.ingredients.some((item) => item.toLowerCase().includes(keyword))
  })
}

export function pickRandom(pool: Recipe[], excludeId?: string | null, random: RandomFn = Math.random): Recipe | null {
  if (pool.length === 0) return null
  const candidates = pool.length > 1 && excludeId ? pool.filter((r) => r.id !== excludeId) : pool
  const list = candidates.length > 0 ? candidates : pool
  const index = Math.min(list.length - 1, Math.floor(random() * list.length))
  return list[index]
}

export function pickSuggestions(
  pool: Recipe[],
  excludeIds: readonly string[],
  size: number,
  random: RandomFn = Math.random,
): Recipe[] {
  const excluded = new Set(excludeIds)
  const candidates = pool.filter((recipe) => !excluded.has(recipe.id))
  const picked: Recipe[] = []
  while (picked.length < size && candidates.length > 0) {
    const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
    const [recipe] = candidates.splice(index, 1)
    if (recipe) picked.push(recipe)
  }
  return picked
}

/** 转盘滚动时依次展示的菜名序列，最后一项固定为最终结果。 */
export function buildRollSequence(
  pool: Recipe[],
  target: Recipe | null,
  length: number,
  random: RandomFn = Math.random,
): Recipe[] {
  if (pool.length === 0) return target ? [target] : []
  const sequence: Recipe[] = []
  for (let i = 0; i < length; i += 1) {
    const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))
    sequence.push(pool[index])
  }
  if (target) sequence.push(target)
  return sequence
}
