<script setup lang="ts">
import type { RecipeCategory, RecipeFilters } from '@/types/recipe'

const props = defineProps<{
  filters: RecipeFilters
  categories: RecipeCategory[]
  poolCount: number
  totalCount: number
  hasActiveFilters: boolean
  disabled?: boolean
  /** 传 true 时在计数行末尾挂一个「去全部菜谱看」的入口。 */
  showBrowse?: boolean
}>()

const emit = defineEmits<{
  'update:filters': [filters: RecipeFilters]
  reset: []
  browse: []
}>()

function patch(next: Partial<RecipeFilters>): void {
  emit('update:filters', { ...props.filters, ...next })
}
</script>

<template>
  <section class="filters card">
    <div class="filters__top">
      <label class="search">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="9" cy="9" r="5.4" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path d="M13.2 13.2 17 17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          :value="filters.keyword"
          type="search"
          placeholder="搜菜名或配料，比如「鸡」「土豆」"
          aria-label="搜索菜名或配料"
          :disabled="disabled"
          @input="patch({ keyword: ($event.target as HTMLInputElement).value })"
        />
        <button
          v-if="filters.keyword"
          class="search__clear"
          type="button"
          aria-label="清空搜索"
          @click="patch({ keyword: '' })"
        >
          ×
        </button>
      </label>

      <div class="switches">
        <button
          class="switch"
          :class="{ 'is-on': filters.onlyWithImage }"
          type="button"
          :aria-pressed="filters.onlyWithImage"
          @click="patch({ onlyWithImage: !filters.onlyWithImage })"
        >
          只看有图
        </button>
        <button
          class="switch"
          :class="{ 'is-on': filters.quickOnly }"
          type="button"
          :aria-pressed="filters.quickOnly"
          @click="patch({ quickOnly: !filters.quickOnly })"
        >
          30 分钟内
        </button>
        <button v-if="hasActiveFilters" class="switch switch--reset" type="button" @click="emit('reset')">
          重置
        </button>
      </div>
    </div>

    <ul class="cats">
      <li>
        <button
          class="cat"
          :class="{ 'is-on': filters.category === null }"
          type="button"
          @click="patch({ category: null })"
        >
          全部
          <em>{{ totalCount }}</em>
        </button>
      </li>
      <li v-for="category in categories" :key="category.key">
        <button
          class="cat"
          :class="{ 'is-on': filters.category === category.key }"
          type="button"
          @click="patch({ category: filters.category === category.key ? null : category.key })"
        >
          <span aria-hidden="true">{{ category.emoji }}</span>
          {{ category.key }}
          <em>{{ category.count }}</em>
        </button>
      </li>
    </ul>

    <p class="filters__count">
      符合条件的有 <b>{{ poolCount }}</b> 道
      <span v-if="poolCount === 0">，换个条件试试</span>
      <button
        v-if="showBrowse && poolCount > 0"
        class="filters__browse"
        type="button"
        @click="emit('browse')"
      >
        在全部菜谱里看这 {{ poolCount }} 道 →
      </button>
    </p>
  </section>
</template>

<style scoped>
.filters {
  margin-top: 26px;
  padding: 20px 22px 16px;
}

.filters__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.search {
  position: relative;
  display: flex;
  flex: 1 1 260px;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.28);
  transition: border-color 0.18s ease;
}

.search:focus-within {
  border-color: rgba(255, 179, 64, 0.55);
}

.search svg {
  width: 17px;
  height: 17px;
  color: var(--text-dim);
  flex: none;
}

.search input {
  flex: 1;
  min-width: 0;
  padding: 11px 0;
  border: none;
  background: none;
  color: var(--text);
  font-size: 13.5px;
  outline: none;
}

.search input::placeholder {
  color: var(--text-dim);
}

.search input::-webkit-search-cancel-button {
  display: none;
}

.search__clear {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--text-dim);
  font-size: 16px;
  line-height: 1;
}

.search__clear:hover {
  background: var(--surface-strong);
  color: var(--text);
}

.switches {
  display: flex;
  gap: 8px;
}

.switch {
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  font-size: 12.5px;
  color: var(--text-muted);
  transition:
    color 0.16s ease,
    border-color 0.16s ease,
    background 0.16s ease;
}

.switch:hover {
  color: var(--text);
}

.switch.is-on {
  border-color: rgba(255, 179, 64, 0.5);
  background: rgba(255, 179, 64, 0.14);
  color: var(--amber);
}

.switch--reset {
  border-style: dashed;
  color: var(--text-dim);
}

.cats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.cats li {
  display: flex;
}

.cat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--surface);
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease;
}

.cat:hover {
  color: var(--text);
  background: var(--surface-strong);
}

.cat.is-on {
  border-color: transparent;
  background: var(--accent);
  color: #2a1309;
  font-weight: 700;
}

.cat em {
  font-size: 11px;
  font-style: normal;
  opacity: 0.62;
  font-variant-numeric: tabular-nums;
}

.filters__count {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-dim);
}

.filters__count b {
  color: var(--amber);
  font-variant-numeric: tabular-nums;
}

.filters__browse {
  margin-left: auto;
  padding: 4px 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-muted);
  transition:
    color 0.16s ease,
    border-color 0.16s ease;
}

.filters__browse:hover {
  border-color: rgba(255, 179, 64, 0.5);
  color: var(--amber);
}
</style>
