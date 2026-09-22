<script setup lang="ts">
import { ref } from 'vue'

import AppFooter from '@/components/AppFooter.vue'
import AppHeader from '@/components/AppHeader.vue'
import CollectionDrawer from '@/components/CollectionDrawer.vue'
import { usePickerStore } from '@/stores/picker'
import type { CollectionTab } from '@/types/collection'

const store = usePickerStore()
const panelOpen = ref(false)
const panelTab = ref<CollectionTab>('tonight')

function openPanel(tab: CollectionTab): void {
  panelTab.value = tab
  panelOpen.value = true
}
</script>

<template>
  <div class="aurora" aria-hidden="true">
    <span class="aurora__blob aurora__blob--chili"></span>
    <span class="aurora__blob aurora__blob--amber"></span>
    <span class="aurora__blob aurora__blob--herb"></span>
  </div>

  <div class="shell">
    <AppHeader
      :tonight-count="store.tonight.length"
      :favorite-count="store.favorites.length"
      @open="openPanel"
    />
    <RouterView />
    <AppFooter />
  </div>

  <CollectionDrawer :open="panelOpen" :tab="panelTab" @close="panelOpen = false" />
</template>
