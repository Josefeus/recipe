<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import DishThumb from '@/components/DishThumb.vue'
import { usePickerStore } from '@/stores/picker'
import { COLLECTION_TABS } from '@/types/collection'
import type { CollectionTab, CollectionTabMeta } from '@/types/collection'
import type { Recipe } from '@/types/recipe'

const props = defineProps<{ open: boolean; tab: CollectionTab }>()
const emit = defineEmits<{ close: [] }>()

const store = usePickerStore()
const activeTab = ref<CollectionTab>(props.tab)

const current = computed<CollectionTabMeta>(
  () => COLLECTION_TABS.find((item) => item.key === activeTab.value) ?? COLLECTION_TABS[0],
)
const items = computed<Recipe[]>(() =>
  activeTab.value === 'favorites' ? store.favorites : store.tonight,
)
const countOf = (key: CollectionTab): number =>
  key === 'favorites' ? store.favorites.length : store.tonight.length

// 打开时跟随外部指定的标签；面板内部切换只改自己的状态。
watch(
  () => [props.open, props.tab] as const,
  ([open, tab]) => {
    if (open) activeTab.value = tab
  },
)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.removeProperty('overflow')
})

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

function show(recipe: Recipe): void {
  store.show(recipe)
  emit('close')
}

function remove(recipe: Recipe): void {
  if (activeTab.value === 'favorites') store.toggleFavorite(recipe.id)
  else store.removeFromTonight(recipe.id)
}

function clearAll(): void {
  if (activeTab.value === 'favorites') store.clearFavorites()
  else store.clearTonight()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="open" class="backdrop" @click="emit('close')"></div>
    </Transition>

    <Transition name="drawer">
      <aside
        v-if="open"
        class="drawer"
        role="dialog"
        aria-modal="true"
        :aria-label="current.label"
      >
        <header class="drawer__head">
          <div>
            <h2>{{ current.label }}</h2>
            <p>{{ items.length }} 道菜 · {{ current.hint }}</p>
          </div>
          <button class="drawer__close" type="button" aria-label="关闭" @click="emit('close')">
            ×
          </button>
        </header>

        <div class="tabs" role="tablist">
          <button
            v-for="tab in COLLECTION_TABS"
            :key="tab.key"
            class="tab"
            :class="{ 'is-on': activeTab === tab.key }"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.key"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <em>{{ countOf(tab.key) }}</em>
          </button>
        </div>

        <p v-if="items.length === 0" class="drawer__empty">{{ current.empty }}</p>

        <ul v-else class="drawer__list scroll-area">
          <li v-for="recipe in items" :key="recipe.id" class="row">
            <button class="row__main" type="button" @click="show(recipe)">
              <span class="row__thumb"><DishThumb :recipe="recipe" /></span>
              <span class="row__text">
                <strong>{{ recipe.name }}</strong>
                <small>{{ recipe.category }} · {{ recipe.steps.length }} 个步骤</small>
              </span>
            </button>
            <button
              class="row__remove"
              type="button"
              :aria-label="`${current.action} ${recipe.name}`"
              @click="remove(recipe)"
            >
              {{ current.action }}
            </button>
          </li>
        </ul>

        <footer v-if="items.length > 0" class="drawer__foot">
          <button class="btn" type="button" @click="clearAll()">
            清空{{ current.label }}
          </button>
          <button class="btn btn--primary" type="button" @click="emit('close')">继续挑</button>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(6, 5, 9, 0.62);
  backdrop-filter: blur(4px);
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 41;
  display: flex;
  flex-direction: column;
  width: min(400px, 100%);
  height: 100%;
  padding: 26px 24px;
  border-left: 1px solid var(--border);
  background: linear-gradient(180deg, #16131f, #0c0a12);
  box-shadow: -30px 0 80px -40px rgba(0, 0, 0, 0.9);
}

.drawer__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.drawer__head h2 {
  font-size: 20px;
  font-weight: 800;
}

.drawer__head p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-dim);
}

.drawer__close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--surface);
  font-size: 19px;
  line-height: 1;
  color: var(--text-muted);
}

.drawer__close:hover {
  background: var(--surface-strong);
  color: var(--text);
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 20px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.28);
}

.tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 10px;
  border-radius: 999px;
  font-size: 13.5px;
  color: var(--text-muted);
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.tab:hover {
  color: var(--text);
}

.tab.is-on {
  background: var(--accent);
  color: #2a1309;
  font-weight: 700;
}

.tab em {
  font-size: 11.5px;
  font-style: normal;
  font-variant-numeric: tabular-nums;
  opacity: 0.72;
}

.drawer__empty {
  margin-top: 28px;
  font-size: 13px;
  color: var(--text-dim);
  line-height: 1.9;
}

.drawer__list {
  flex: 1;
  margin: 16px -6px 0;
  display: grid;
  gap: 10px;
  align-content: start;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.row__main {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-width: 0;
  text-align: left;
}

.row__thumb {
  flex: none;
  /* 与卡片、台面预览保持同一比例，列表里的缩略图也不再被裁掉。 */
  width: 72px;
  height: 54px;
  overflow: hidden;
  border-radius: 11px;
}

.row__text {
  min-width: 0;
}

.row__text strong {
  display: block;
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__text small {
  display: block;
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--text-dim);
}

.row__remove {
  flex: none;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-dim);
  white-space: nowrap;
}

.row__remove:hover {
  background: rgba(255, 90, 60, 0.14);
  color: var(--chili);
}

.drawer__foot {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.drawer__foot .btn {
  flex: 1;
}

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.28s ease;
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(102%);
}
</style>
