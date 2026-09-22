<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { Recipe } from '@/types/recipe'
import { formatMinutes } from '@/utils/format'

const props = defineProps<{ recipe: Recipe | null }>()
const emit = defineEmits<{ close: [] }>()

const closeButton = ref<HTMLButtonElement | null>(null)
/**
 * 数据源里的实拍图只有 160~260px 宽，放太大只会变成糊图。
 * 因此按「不超过原图 3 倍」来定宽度，最坏情况下每个源像素仍是整数倍放大。
 */
const maxWidth = ref(0)

const frameStyle = computed(() => ({
  width: maxWidth.value > 0 ? `min(92vw, ${maxWidth.value}px)` : 'min(92vw, 720px)',
}))

const meta = computed(() => {
  const recipe = props.recipe
  if (!recipe) return ''
  const minutes = formatMinutes(recipe.estMinutes)
  return [recipe.category, minutes, `${recipe.steps.length} 个步骤`].filter(Boolean).join(' · ')
})

function onLoad(event: Event): void {
  const image = event.target as HTMLImageElement
  maxWidth.value = Math.min(image.naturalWidth * 3, 1400)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.recipe) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.removeProperty('overflow')
})

watch(
  () => props.recipe,
  async (recipe) => {
    document.body.style.overflow = recipe ? 'hidden' : ''
    maxWidth.value = 0
    if (!recipe) return
    await nextTick()
    closeButton.value?.focus()
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="recipe"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="`${recipe.name} 实拍图`"
        @click.self="emit('close')"
      >
        <div class="lightbox__panel">
          <button
            ref="closeButton"
            class="lightbox__close"
            type="button"
            aria-label="关闭大图"
            @click="emit('close')"
          >
            ×
          </button>

          <figure class="lightbox__frame" :style="frameStyle">
            <img
              v-if="recipe.image"
              :src="recipe.image"
              :alt="recipe.name"
              decoding="async"
              draggable="false"
              @load="onLoad"
            />
            <span v-else class="lightbox__empty">这道菜还没有实拍图</span>
          </figure>

          <div class="lightbox__meta">
            <strong>{{ recipe.name }}</strong>
            <small>{{ meta }}</small>
          </div>
          <p class="lightbox__tip">按 Esc 或点空白处关闭</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(6, 5, 9, 0.78);
  backdrop-filter: blur(14px);
}

.lightbox__panel {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 14px;
  max-height: 100%;
}

.lightbox__close {
  position: absolute;
  top: -14px;
  right: -14px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background: rgba(20, 16, 26, 0.92);
  color: var(--text);
  font-size: 19px;
  line-height: 1;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;
}

.lightbox__close:hover {
  transform: scale(1.06);
  border-color: rgba(255, 179, 64, 0.6);
}

.lightbox__frame {
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
}

.lightbox__frame img {
  width: 100%;
  height: auto;
  max-height: 74vh;
  object-fit: contain;
}

.lightbox__empty {
  display: block;
  padding: 60px 40px;
  font-size: 13.5px;
  color: var(--text-dim);
}

.lightbox__meta {
  display: grid;
  justify-items: center;
  gap: 2px;
  text-align: center;
}

.lightbox__meta strong {
  font-size: 19px;
  font-weight: 800;
}

.lightbox__meta small {
  font-size: 12.5px;
  color: var(--text-muted);
}

.lightbox__tip {
  font-size: 11.5px;
  color: var(--text-dim);
  letter-spacing: 0.08em;
}

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.2s ease;
}

.lightbox-enter-active .lightbox__panel,
.lightbox-leave-active .lightbox__panel {
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.lightbox-enter-from .lightbox__panel,
.lightbox-leave-to .lightbox__panel {
  transform: scale(0.96);
}

@media (max-width: 640px) {
  .lightbox {
    padding: 16px;
  }

  .lightbox__close {
    top: -10px;
    right: -6px;
  }
}
</style>
