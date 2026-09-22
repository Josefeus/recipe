export interface NutritionItem {
  label: string
  value: string
}

export interface Recipe {
  id: string
  name: string
  category: string
  /** 实拍图地址；部分菜品没有图，为 null。 */
  image: string | null
  ingredients: string[]
  steps: string[]
  nutrition: NutritionItem[]
  /** 由步骤中的时间描述粗略累加得出，可能为 null。 */
  estMinutes: number | null
}

export interface RecipeCategory {
  key: string
  tag: string
  emoji: string
  count: number
}

export interface RecipeSource {
  repo: string
  note: string
}

export interface RecipeDataset {
  generatedAt: string
  source: RecipeSource
  categories: RecipeCategory[]
  recipes: Recipe[]
}

export interface RecipeFilters {
  /** null 表示全部分类。 */
  category: string | null
  keyword: string
  onlyWithImage: boolean
  quickOnly: boolean
}

export const DEFAULT_FILTERS: RecipeFilters = {
  category: null,
  keyword: '',
  onlyWithImage: false,
  quickOnly: false,
}

/** 「快手菜」判定阈值（分钟）。 */
export const QUICK_MINUTES = 30
