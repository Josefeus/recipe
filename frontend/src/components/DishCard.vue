<script setup lang="ts">
import { computed } from 'vue'

import DishThumb from '@/components/DishThumb.vue'
import type { Recipe } from '@/types/recipe'
import { formatMinutes } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    recipe: Recipe
    size?: 'sm' | 'md'
    favorited?: boolean
    showFavorite?: boolean
  }>(),
  { size: 'md', favorited: false, showFavorite: false },
)

const emit = defineEmits<{
  select: [recipe: Recipe]
  toggleFavorite: [recipe: Recipe]
}>()

const minutes = computed(() => formatMinutes(props.recipe.estMinutes))
</script>

<template>
  <article class="dish-card" :class="`dish-card--${size}`">
    <button class="dish-card__main" type="button" @click="emit('select', recipe)">
      <span class="dish-card__media">
        <DishThumb :recipe="recipe" />
      </span>
      <span class="dish-card__body">
        <strong>{{ recipe.name }}</strong>
        <span class="dish-card__meta">
          {{ recipe.category }}
          <template v-if="minutes"> · {{ minutes }}</template>
          <template v-if="recipe.ingredients.length"> · {{ recipe.ingredients.length }} 种配料</template>
        </span>
      </span>
    </button>

    <button
      v-if="showFavorite"
      class="dish-card__fav"
      :class="{ 'is-on': favorited }"
      type="button"
      :aria-label="favorited ? `取消收藏 ${recipe.name}` : `收藏 ${recipe.name}`"
      :aria-pressed="favorited"
      @click="emit('toggleFavorite', recipe)"
    >
      {{ favorited ? '♥' : '♡' }}
    </button>
  </article>
</template>

<style scoped>
.dish-card {
  position: relative;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  transition:
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}

.dish-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 179, 64, 0.42);
  box-shadow: 0 26px 50px -30px rgba(0, 0, 0, 0.9);
}

.dish-card:hover .dish-card__media :deep(img) {
  transform: scale(1.06);
}

.dish-card__main {
  display: block;
  width: 100%;
  height: 100%;
  text-align: left;
}

.dish-card__media {
  display: block;
  overflow: hidden;
}

.dish-card--md .dish-card__media {
  height: 132px;
}

.dish-card--sm .dish-card__media {
  height: 104px;
}

.dish-card__body {
  display: block;
  padding: 12px 14px 14px;
}

.dish-card__body strong {
  display: block;
  font-size: 14.5px;
  font-weight: 700;
  line-height: 1.45;
}

.dish-card__meta {
  display: block;
  margin-top: 5px;
  font-size: 11.5px;
  color: var(--text-dim);
}

.dish-card__fav {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(10, 8, 14, 0.62);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.72);
  font-size: 15px;
  line-height: 1;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;
}

.dish-card__fav:hover {
  background: rgba(10, 8, 14, 0.85);
  transform: scale(1.08);
}

.dish-card__fav.is-on {
  color: var(--chili);
}
</style>
