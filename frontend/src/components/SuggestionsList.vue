<script setup lang="ts">
import DishCard from '@/components/DishCard.vue'
import type { Recipe } from '@/types/recipe'

defineProps<{ items: Recipe[] }>()
const emit = defineEmits<{ select: [recipe: Recipe]; zoom: [recipe: Recipe]; shuffle: [] }>()
</script>

<template>
  <section class="alts">
    <div class="section-title">
      <h2>或者试试这几道</h2>
      <span>点一下就换到台前</span>
      <button class="alts__shuffle" type="button" @click="emit('shuffle')">换一批</button>
    </div>

    <ul class="alts__grid">
      <li
        v-for="(recipe, index) in items"
        :key="recipe.id"
        :style="{ animationDelay: `${index * 70}ms` }"
      >
        <DishCard
          :recipe="recipe"
          size="sm"
          @select="emit('select', $event)"
          @zoom="emit('zoom', $event)"
        />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.alts {
  margin-top: 40px;
}

.alts__shuffle {
  margin-left: auto;
  padding: 6px 13px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 12.5px;
  color: var(--text-muted);
  transition:
    color 0.16s ease,
    background 0.16s ease;
}

.alts__shuffle:hover {
  background: var(--surface);
  color: var(--text);
}

.alts__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}

.alts__grid li {
  animation: fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
</style>
