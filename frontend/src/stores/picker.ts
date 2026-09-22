import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { fetchRecipeDataset } from '@/api/recipes'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { buildRollSequence, filterRecipes, pickRandom, pickSuggestions } from '@/lib/pick'
import type { Recipe, RecipeCategory, RecipeDataset, RecipeFilters } from '@/types/recipe'
import { DEFAULT_FILTERS } from '@/types/recipe'

const ROLL_DURATION_MS = 1150
const ROLL_STEPS = 16
const SUGGESTION_COUNT = 3

export const usePickerStore = defineStore('picker', () => {
  const dataset = ref<RecipeDataset | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const filters = ref<RecipeFilters>({ ...DEFAULT_FILTERS })
  const current = ref<Recipe | null>(null)
  const rolling = ref(false)
  const rollingName = ref('')
  const suggestions = ref<Recipe[]>([])

  const favoriteIds = useLocalStorage<string[]>('recipe.favorites', [])
  const tonightIds = useLocalStorage<string[]>('recipe.tonight', [])

  let rafId: number | null = null

  const allRecipes = computed<Recipe[]>(() => dataset.value?.recipes ?? [])
  const categories = computed<RecipeCategory[]>(() => dataset.value?.categories ?? [])
  const source = computed(() => dataset.value?.source ?? null)
  const pool = computed<Recipe[]>(() => filterRecipes(allRecipes.value, filters.value))
  const recipeById = computed(() => new Map(allRecipes.value.map((item) => [item.id, item])))

  const tonight = computed<Recipe[]>(() =>
    tonightIds.value
      .map((id) => recipeById.value.get(id))
      .filter((item): item is Recipe => Boolean(item)),
  )
  const favorites = computed<Recipe[]>(() =>
    favoriteIds.value
      .map((id) => recipeById.value.get(id))
      .filter((item): item is Recipe => Boolean(item)),
  )

  const stageName = computed(() => {
    if (rolling.value) return rollingName.value || '……'
    return current.value?.name ?? ''
  })
  /** 当前这道是否还在候选范围内（搜索把它排除掉，或从收藏夹直接打开时会为 false）。 */
  const currentInPool = computed(
    () => !current.value || pool.value.some((item) => item.id === current.value?.id),
  )
  const hasActiveFilters = computed(
    () =>
      filters.value.category !== null ||
      filters.value.keyword.trim() !== '' ||
      filters.value.onlyWithImage ||
      filters.value.quickOnly,
  )

  function isFavorite(id: string): boolean {
    return favoriteIds.value.includes(id)
  }
  function isInTonight(id: string): boolean {
    return tonightIds.value.includes(id)
  }

  function refreshSuggestions(): void {
    const exclude = current.value ? [current.value.id] : []
    suggestions.value = pickSuggestions(pool.value, exclude, SUGGESTION_COUNT)
  }

  /** 手动「换一批」备选。 */
  function shuffleSuggestions(): void {
    refreshSuggestions()
  }

  function stopAnimation(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function settle(target: Recipe): void {
    stopAnimation()
    rolling.value = false
    rollingName.value = ''
    current.value = target
    refreshSuggestions()
  }

  function roll(): void {
    if (rolling.value) return
    const list = pool.value
    if (list.length === 0) return

    const target = pickRandom(list, current.value?.id ?? null)
    if (!target) return

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    if (reduceMotion) {
      settle(target)
      return
    }

    stopAnimation()
    rolling.value = true
    const sequence = buildRollSequence(list, target, ROLL_STEPS)
    const startedAt = performance.now()
    let shownIndex = 0
    rollingName.value = sequence[0]?.name ?? target.name

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / ROLL_DURATION_MS)
      // 指数越小，前期翻得越快、末尾越慢，形成「减速停住」的手感。
      const expected = Math.min(sequence.length - 1, Math.floor(progress ** 0.35 * sequence.length))
      if (expected > shownIndex) shownIndex = expected
      rollingName.value = sequence[shownIndex]?.name ?? target.name
      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        settle(target)
      }
    }
    rafId = requestAnimationFrame(tick)
  }

  /** 直接把某道菜放到台前（点备选卡片 / 今晚菜单时用）。 */
  function show(recipe: Recipe): void {
    stopAnimation()
    rolling.value = false
    current.value = recipe
    refreshSuggestions()
  }

  function toggleFavorite(id: string): void {
    const index = favoriteIds.value.indexOf(id)
    if (index >= 0) favoriteIds.value.splice(index, 1)
    else favoriteIds.value.push(id)
  }

  function addToTonight(id: string): void {
    if (!tonightIds.value.includes(id)) tonightIds.value.push(id)
  }

  function removeFromTonight(id: string): void {
    const index = tonightIds.value.indexOf(id)
    if (index >= 0) tonightIds.value.splice(index, 1)
  }

  function clearTonight(): void {
    tonightIds.value = []
  }

  function clearFavorites(): void {
    favoriteIds.value = []
  }

  function resetFilters(): void {
    filters.value = { ...DEFAULT_FILTERS }
  }

  /**
   * 筛选条件变化后同步台面：
   * - 候选为空：清空台面，交给视图显示空状态；
   * - 分类/开关这类离散改动：直接重抽，保证台面上始终是符合条件的菜；
   * - 搜索词：只刷新候选与备选，不动已经抽出来的结果，避免边打字边闪。
   */
  function syncStage(shouldReroll: boolean): void {
    if (pool.value.length === 0) {
      stopAnimation()
      rolling.value = false
      rollingName.value = ''
      current.value = null
      refreshSuggestions()
      return
    }
    if (shouldReroll) {
      // 上一次抽取可能还在跑，先收尾再重新开始，否则新条件不会生效。
      stopAnimation()
      rolling.value = false
      roll()
      return
    }
    refreshSuggestions()
  }

  async function load(): Promise<void> {
    if (dataset.value || loading.value) return
    loading.value = true
    error.value = null
    try {
      dataset.value = await fetchRecipeDataset()
      roll()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '菜谱加载失败'
    } finally {
      loading.value = false
    }
  }

  const discreteFilterKey = computed(() =>
    [filters.value.category, filters.value.onlyWithImage, filters.value.quickOnly].join('|'),
  )

  watch(discreteFilterKey, () => syncStage(true))
  watch(
    () => filters.value.keyword,
    () => syncStage(false),
  )

  function dispose(): void {
    stopAnimation()
  }

  return {
    dataset,
    loading,
    error,
    filters,
    current,
    rolling,
    suggestions,
    allRecipes,
    categories,
    source,
    pool,
    tonight,
    favorites,
    stageName,
    currentInPool,
    hasActiveFilters,
    load,
    roll,
    show,
    isFavorite,
    isInTonight,
    toggleFavorite,
    addToTonight,
    removeFromTonight,
    clearTonight,
    clearFavorites,
    resetFilters,
    shuffleSuggestions,
    dispose,
  }
})
