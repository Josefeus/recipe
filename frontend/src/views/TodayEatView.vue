<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import DishStage from '@/components/DishStage.vue'
import FilterBar from '@/components/FilterBar.vue'
import ImageLightbox from '@/components/ImageLightbox.vue'
import SuggestionsList from '@/components/SuggestionsList.vue'
import { SITE } from '@/config/site'
import { usePickerStore } from '@/stores/picker'
import type { Recipe } from '@/types/recipe'

const store = usePickerStore()
const router = useRouter()
const toast = ref('')
const zoomed = ref<Recipe | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

const stats = computed(() => [
  `${store.allRecipes.length} 道菜`,
  `${store.categories.length} 个分类`,
  `${store.allRecipes.filter((item) => item.image).length} 张实拍`,
])

function showToast(message: string): void {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2000)
}

function accept(): void {
  const recipe = store.current
  if (!recipe) return
  store.addToTonight(recipe.id)
  showToast(`已把「${recipe.name}」记进今晚菜单`)
}

function favorite(): void {
  const recipe = store.current
  if (!recipe) return
  const wasFavorite = store.isFavorite(recipe.id)
  store.toggleFavorite(recipe.id)
  showToast(wasFavorite ? '已取消收藏' : `已收藏「${recipe.name}」`)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.code !== 'Space') return
  const target = event.target as HTMLElement | null
  const tag = target?.tagName ?? ''
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
  event.preventDefault()
  store.roll()
}

onMounted(() => {
  store.load()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  store.dispose()
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <section class="hero">
    <p class="hero__eyebrow">
      <span v-for="item in stats" :key="item">{{ item }}</span>
    </p>
    <h1 class="hero__title">
      今天吃什么<span class="hero__mark">？</span>
    </h1>
    <p class="hero__sub">{{ SITE.description }}</p>
  </section>

  <!-- 先在哪个范围里选，再决定吃什么 -->
  <FilterBar
    v-model:filters="store.filters"
    :categories="store.categories"
    :pool-count="store.pool.length"
    :total-count="store.allRecipes.length"
    :has-active-filters="store.hasActiveFilters"
    :disabled="store.loading"
    show-browse
    @reset="store.resetFilters()"
    @browse="router.push('/browse')"
  />

  <DishStage
    :name="store.stageName"
    :rolling="store.rolling"
    :recipe="store.current"
    :pool-size="store.pool.length"
    :favorited="store.current ? store.isFavorite(store.current.id) : false"
    :in-pool="store.currentInPool"
    @roll="store.roll()"
    @accept="accept"
    @favorite="favorite"
    @zoom="zoomed = $event"
  />

  <p class="sr-only" aria-live="polite">
    {{ store.current ? `抽到：${store.current.name}` : '' }}
  </p>

  <div v-if="!store.loading && !store.rolling && store.pool.length === 0" class="empty card">
    <strong>这个条件下没有菜</strong>
    <p>把筛选放宽一点，或者点「重置」回到全部 {{ store.allRecipes.length }} 道。</p>
  </div>

  <SuggestionsList
    v-if="store.suggestions.length > 0"
    :items="store.suggestions"
    @select="store.show($event)"
    @zoom="zoomed = $event"
    @shuffle="store.shuffleSuggestions()"
  />

  <ImageLightbox :recipe="zoomed" @close="zoomed = null" />

  <Transition name="toast">
    <p v-if="toast" class="toast" role="status">{{ toast }}</p>
  </Transition>
</template>

<style scoped>
.hero {
  padding: 18px 0 30px;
}

.hero__eyebrow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-dim);
  letter-spacing: 0.16em;
}

.hero__eyebrow span + span::before {
  content: '·';
  margin-right: 10px;
  opacity: 0.6;
}

.hero__title {
  margin: 12px 0 10px;
  font-size: clamp(42px, 7.6vw, 80px);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.035em;
}

.hero__mark {
  background: var(--accent);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero__sub {
  font-size: 15px;
  color: var(--text-muted);
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

.toast {
  position: fixed;
  bottom: 34px;
  left: 50%;
  z-index: 60;
  padding: 12px 22px;
  border: 1px solid rgba(255, 179, 64, 0.38);
  border-radius: 999px;
  background: rgba(24, 19, 30, 0.92);
  backdrop-filter: blur(14px);
  font-size: 13.5px;
  transform: translateX(-50%);
  box-shadow: 0 20px 50px -24px rgba(0, 0, 0, 0.9);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 14px);
}
</style>
