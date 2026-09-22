<script setup lang="ts">
import DishCard from '@/components/DishCard.vue'
import type { Recipe } from '@/types/recipe'

defineProps<{
  items: Recipe[]
  favoriteIds?: string[]
}>()

const emit = defineEmits<{
  select: [recipe: Recipe]
  zoom: [recipe: Recipe]
  toggleFavorite: [recipe: Recipe]
}>()
</script>

<template>
  <ul class="dish-grid">
    <li v-for="(recipe, index) in items" :key="recipe.id" :style="{ animationDelay: `${Math.min(index, 11) * 45}ms` }">
      <DishCard
        :recipe="recipe"
        :favorited="favoriteIds?.includes(recipe.id) ?? false"
        show-favorite
        @select="emit('select', $event)"
        @zoom="emit('zoom', $event)"
        @toggle-favorite="emit('toggleFavorite', $event)"
      />
    </li>
  </ul>
</template>

<style scoped>
.dish-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(214px, 1fr));
  gap: 14px;
}

.dish-grid li {
  animation: fade-up 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
}
</style>
