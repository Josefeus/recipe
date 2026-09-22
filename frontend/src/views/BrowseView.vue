<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DishGrid from '@/components/DishGrid.vue'
import FilterBar from '@/components/FilterBar.vue'
import { usePickerStore } from '@/stores/picker'
import type { Recipe } from '@/types/recipe'

const store = usePickerStore()
const route = useRoute()
const router = useRouter()

const favoriteIds = computed(() => store.favorites.map((item) => item.id))
const scopeLabel = computed(() => (store.filters.category ? store.filters.category : '全部菜品'))

function categoryFromQuery(): string | null {
  const raw = route.query.category
  return typeof raw === 'string' && raw !== '' ? raw : null
}

/** 点任意一道，就把它放到决定器的台面上。 */
function pick(recipe: Recipe): void {
  store.show(recipe)
  void router.push('/')
}

onMounted(async () => {
  await store.load()
  const fromQuery = categoryFromQuery()
  if (fromQuery && fromQuery !== store.filters.category) {
    store.filters = { ...store.filters, category: fromQuery }
  }
})

// URL 与 store 双向同步：两边都只在「值真的不同」时写入，避免互相触发死循环；
// 同时都限定在 /browse 路由内生效，否则离开本页时的同步会覆盖掉正在进行的跳转。
watch(
  () => route.query.category,
  () => {
    if (route.name !== 'browse') return
    const next = categoryFromQuery()
    if (next !== store.filters.category) {
      store.filters = { ...store.filters, category: next }
    }
  },
)

watch(
  () => store.filters.category,
  (key) => {
    if (route.name !== 'browse') return
    if (key === categoryFromQuery()) return
    const query = { ...route.query }
    if (key) query.category = key
    else delete query.category
    void router.replace({ path: route.path, query })
  },
)
</script>

<template>
  <section class="browse__head">
    <p class="browse__eyebrow">菜谱总览</p>
    <h1>
      <span class="gradient-text">{{ scopeLabel }}</span>
      都摊开给你看
    </h1>
    <p class="browse__sub">
      共 {{ store.pool.length }} 道 · 点任意一张，就把它放回决定器；右上角的心可以直接收藏。
    </p>
  </section>

  <FilterBar
    v-model:filters="store.filters"
    :categories="store.categories"
    :pool-count="store.pool.length"
    :total-count="store.allRecipes.length"
    :has-active-filters="store.hasActiveFilters"
    :disabled="store.loading"
    @reset="store.resetFilters()"
  />

  <DishGrid
    v-if="store.pool.length > 0"
    class="browse__grid"
    :items="store.pool"
    :favorite-ids="favoriteIds"
    @select="pick"
    @toggle-favorite="store.toggleFavorite($event.id)"
  />

  <div v-else-if="!store.loading" class="empty card">
    <strong>这个条件下没有菜</strong>
    <p>把筛选放宽一点，或者点「重置」回到全部 {{ store.allRecipes.length }} 道。</p>
  </div>
</template>

<style scoped>
.browse__head {
  padding: 18px 0 26px;
}

.browse__eyebrow {
  font-size: 12px;
  color: var(--text-dim);
  letter-spacing: 0.24em;
}

.browse__head h1 {
  margin: 12px 0 10px;
  font-size: clamp(30px, 4.6vw, 52px);
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.browse__sub {
  font-size: 14px;
  color: var(--text-muted);
}

.browse__grid {
  margin-top: 26px;
}

.empty {
  margin-top: 26px;
  padding: 34px 30px;
  text-align: center;
}

.empty strong {
  display: block;
  font-size: 17px;
  font-weight: 700;
}

.empty p {
  margin-top: 6px;
  font-size: 13.5px;
  color: var(--text-dim);
}
</style>
