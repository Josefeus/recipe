<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { SITE } from '@/config/site'
import type { CollectionTab } from '@/types/collection'

defineProps<{ tonightCount: number; favoriteCount: number }>()
const emit = defineEmits<{ open: [tab: CollectionTab] }>()

const route = useRoute()
const browsing = computed(() => route.name === 'browse')
</script>

<template>
  <header class="topbar">
    <RouterLink class="brand" to="/">
      <span class="brand__mark" aria-hidden="true">饭</span>
      <span class="brand__text">
        <strong>{{ SITE.title }}</strong>
        <small>{{ SITE.subtitle }}</small>
      </span>
    </RouterLink>

    <nav class="topbar__actions">
      <RouterLink class="topbar__link" :to="browsing ? '/' : '/browse'">
        {{ browsing ? '回到决定器' : '全部菜谱' }}
      </RouterLink>
      <button class="topbar__menu" type="button" @click="emit('open', 'favorites')">
        <span>收藏夹</span>
        <em v-if="favoriteCount > 0">{{ favoriteCount }}</em>
      </button>
      <button class="topbar__menu topbar__menu--accent" type="button" @click="emit('open', 'tonight')">
        <span>今晚菜单</span>
        <em v-if="tonightCount > 0">{{ tonightCount }}</em>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 0 26px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: var(--accent);
  color: #2a1309;
  font-size: 20px;
  font-weight: 800;
  box-shadow: var(--shadow-pop);
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand__text strong {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.brand__text small {
  font-size: 11.5px;
  color: var(--text-dim);
  letter-spacing: 0.22em;
}

.topbar__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.topbar__link {
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  color: var(--text-muted);
  transition:
    color 0.18s ease,
    background 0.18s ease;
}

.topbar__link:hover {
  background: var(--surface);
  color: var(--text);
}

.topbar__menu {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: var(--surface-strong);
  font-size: 13.5px;
  font-weight: 600;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;
}

.topbar__menu:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.3);
}

.topbar__menu em {
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: var(--text);
  font-size: 11.5px;
  font-style: normal;
  font-weight: 800;
}

.topbar__menu--accent {
  border-color: rgba(255, 179, 64, 0.42);
  background: rgba(255, 179, 64, 0.12);
}

.topbar__menu--accent em {
  background: var(--accent);
  color: #2a1309;
}

@media (max-width: 640px) {
  .topbar__link {
    display: none;
  }
}
</style>
