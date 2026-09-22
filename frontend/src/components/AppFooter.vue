<script setup lang="ts">
import { usePickerStore } from '@/stores/picker'
import { REPO_URL } from '@/config/site'

const store = usePickerStore()
</script>

<template>
  <footer class="footer">
    <p>
      菜谱数据来自开源项目
      <a :href="store.source?.repo ?? REPO_URL" target="_blank" rel="noreferrer noopener">
        CookLikeHOC
      </a>
      ，内容整理自《老乡鸡菜品溯源报告》，版权归原作者所有。
    </p>
    <p class="footer__meta">
      {{ store.allRecipes.length }} 道菜 · {{ store.categories.length }} 个分类
      <template v-if="store.dataset"> · 数据更新于 {{ store.dataset.generatedAt.slice(0, 10) }}</template>
    </p>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: 64px;
  padding-top: 22px;
  border-top: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-dim);
  line-height: 1.9;
}

.footer a {
  color: var(--text-muted);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.footer a:hover {
  color: var(--amber);
}

.footer__meta {
  margin-top: 2px;
  letter-spacing: 0.04em;
}
</style>
