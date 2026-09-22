<script setup lang="ts">
import { computed } from 'vue'

import type { Recipe } from '@/types/recipe'
import { dishHue, dishInitial } from '@/utils/format'

const props = defineProps<{ recipe: Recipe; eager?: boolean }>()

const style = computed(() => ({ '--dish-hue': String(dishHue(props.recipe.name)) }))
</script>

<template>
  <span class="thumb" :style="style">
    <img
      v-if="recipe.image"
      :src="recipe.image"
      :alt="recipe.name"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      draggable="false"
    />
    <span v-else class="thumb__fallback" aria-hidden="true">{{ dishInitial(recipe.name) }}</span>
  </span>
</template>

<style scoped>
.thumb {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  background:
    radial-gradient(120% 120% at 20% 15%, hsl(var(--dish-hue) 72% 46% / 0.55), transparent 62%),
    linear-gradient(150deg, hsl(var(--dish-hue) 58% 22%), hsl(calc(var(--dish-hue) + 40) 52% 12%));
}

/* 实拍图底色接近纯白，加一圈极淡的内描边让图片边缘与深色卡片分得开。 */
.thumb::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.thumb__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: clamp(32px, 6vw, 68px);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.86);
  text-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
}
</style>
