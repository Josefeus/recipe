<script setup lang="ts">
import { computed } from 'vue'

import DishThumb from '@/components/DishThumb.vue'
import { REPO_URL } from '@/config/site'
import type { Recipe } from '@/types/recipe'
import { formatMinutes } from '@/utils/format'

const props = defineProps<{
  name: string
  rolling: boolean
  recipe: Recipe | null
  poolSize: number
  favorited?: boolean
  inPool?: boolean
}>()

const emit = defineEmits<{
  roll: []
  accept: []
  favorite: [id: string]
}>()

/** 抽中结果变化时用 key 触发一次入场动画。 */
const revealKey = computed(() => (props.rolling ? 'rolling' : (props.recipe?.id ?? 'idle')))

const meta = computed(() => {
  const recipe = props.recipe
  if (!recipe) return []
  const items = [recipe.category]
  const minutes = formatMinutes(recipe.estMinutes)
  if (minutes) items.push(minutes)
  if (recipe.ingredients.length) items.push(`${recipe.ingredients.length} 种配料`)
  return items
})

const sourceUrl = computed(() => {
  const recipe = props.recipe
  if (!recipe) return REPO_URL
  return `${REPO_URL}/blob/main/${encodeURIComponent(recipe.category)}/${encodeURIComponent(
    recipe.name,
  )}.md`
})

const showFacts = computed(() => props.recipe !== null && !props.rolling)
const hint = computed(() => {
  if (props.rolling) return '正在翻菜谱，别眨眼…'
  if (props.recipe) return '今天就吃'
  return props.poolSize === 0 ? '这个范围里没有菜' : '要不……随手来一个？'
})
</script>

<template>
  <section class="stage card">
    <div class="stage__top">
      <div class="stage__dial">
        <button
          class="dial"
          :class="{ 'is-rolling': rolling }"
          type="button"
          :disabled="rolling || poolSize === 0"
          @click="emit('roll')"
        >
          <span class="dial__ring" aria-hidden="true"></span>
          <span class="dial__glow" aria-hidden="true"></span>
          <span class="dial__core">
            <strong>{{ rolling ? '···' : '开饭' }}</strong>
            <small>{{ rolling ? '翻菜谱' : '点我决定' }}</small>
          </span>
        </button>
        <p class="dial__pool">候选 <b>{{ poolSize }}</b> 道</p>
      </div>

      <figure class="stage__media" :class="{ 'is-empty': !recipe }">
        <DishThumb v-if="recipe" :recipe="recipe" eager />
        <span v-else class="stage__media-placeholder" aria-hidden="true">?</span>
      </figure>

      <div class="stage__info">
        <p class="stage__hint">{{ hint }}</p>

        <h2
          :key="revealKey"
          class="stage__name"
          :class="{ 'is-rolling': rolling, 'is-idle': !rolling && !recipe, 'gradient-text': !rolling && !!recipe }"
        >
          {{ rolling ? name : (recipe?.name ?? '还没想好') }}
        </h2>

        <ul v-if="meta.length || (recipe && inPool === false)" class="stage__meta">
          <li v-if="recipe && inPool === false" class="chip chip--warn">不在当前筛选内</li>
          <li v-for="item in meta" :key="item" class="chip">{{ item }}</li>
        </ul>

        <div class="stage__actions">
          <button
            class="btn btn--primary"
            type="button"
            :disabled="rolling || poolSize === 0"
            @click="emit('roll')"
          >
            {{ recipe ? '换一个' : '抽一道' }}
          </button>
          <button class="btn" type="button" :disabled="!recipe || rolling" @click="recipe && emit('accept')">
            就它了
          </button>
          <button
            class="btn btn--ghost"
            type="button"
            :disabled="!recipe || rolling"
            :aria-pressed="favorited === true"
            @click="recipe && emit('favorite', recipe.id)"
          >
            {{ favorited ? '已收藏 ♥' : '收藏' }}
          </button>
        </div>

        <p class="stage__tip">按空格键也能再抽一次</p>
      </div>
    </div>

    <div v-if="showFacts && recipe" class="stage__facts">
      <div class="fact">
        <section v-if="recipe.ingredients.length">
          <h4>要准备的东西</h4>
          <ul class="ingredients">
            <li v-for="item in recipe.ingredients" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section v-if="recipe.nutrition.length" class="fact__nutrition">
          <h4>每 100g 营养</h4>
          <ul class="nutrition">
            <li v-for="item in recipe.nutrition" :key="item.label">
              <b>{{ item.value }}</b>
              <span>{{ item.label }}</span>
            </li>
          </ul>
        </section>
      </div>

      <section class="fact">
        <h4>怎么做</h4>
        <ol class="steps">
          <li v-for="(step, index) in recipe.steps" :key="step">
            <span class="steps__index">{{ index + 1 }}</span>
            <span class="steps__text">{{ step }}</span>
          </li>
        </ol>
      </section>

      <a class="stage__source" :href="sourceUrl" target="_blank" rel="noreferrer noopener">
        在 GitHub 查看原始菜谱 ↗
      </a>
    </div>
  </section>
</template>

<style scoped>
.stage {
  margin-top: 22px;
  padding: 34px 36px 30px;
}

/* ---------- 第一行：转盘 / 图 / 信息 ---------- */

.stage__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 26px 34px;
}

.stage__dial {
  display: flex;
  flex: 0 0 168px;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.dial {
  position: relative;
  display: grid;
  place-items: center;
  width: 168px;
  height: 168px;
  border-radius: 50%;
  isolation: isolate;
}

.dial__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(255, 255, 255, 0.06) 0 45%,
    var(--amber) 68%,
    var(--chili) 86%,
    rgba(255, 255, 255, 0.06) 100%
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px));
  animation: spin 4.2s linear infinite;
  transition: filter 0.3s ease;
}

.dial__glow {
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 179, 64, 0.5), transparent 68%);
  filter: blur(16px);
  animation: glow-pulse 3.6s ease-in-out infinite;
}

.dial__core {
  position: relative;
  display: grid;
  place-content: center;
  gap: 2px;
  width: 122px;
  height: 122px;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.1), transparent 60%),
    linear-gradient(160deg, #1b1624, #0d0b12);
  text-align: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dial__core strong {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.dial__core small {
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 0.18em;
}

.dial:hover .dial__core {
  transform: scale(1.05);
}

.dial:active .dial__core {
  transform: scale(0.96);
}

.dial.is-rolling .dial__ring {
  animation: spin 0.7s linear infinite;
  filter: brightness(1.35);
}

.dial:disabled {
  cursor: default;
}

.dial__pool {
  font-size: 12px;
  color: var(--text-dim);
  letter-spacing: 0.06em;
}

.dial__pool b {
  color: var(--amber);
  font-variant-numeric: tabular-nums;
}

.stage__media {
  position: relative;
  flex: 0 0 200px;
  height: 150px;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 16px;
}

.stage__media.is-empty {
  display: grid;
  place-items: center;
  background:
    repeating-linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.035) 0 12px,
      transparent 12px 24px
    ),
    rgba(255, 255, 255, 0.02);
}

.stage__media-placeholder {
  font-size: 44px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.14);
}

.stage__info {
  flex: 1 1 320px;
  min-width: 0;
}

.stage__hint {
  font-size: 12.5px;
  color: var(--text-dim);
  letter-spacing: 0.2em;
}

.stage__name {
  margin: 6px 0 14px;
  font-size: clamp(28px, 3.4vw, 44px);
  font-weight: 800;
  line-height: 1.16;
  letter-spacing: -0.01em;
  word-break: break-word;
  animation: pop-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.stage__name.is-rolling {
  color: var(--text-muted);
  filter: blur(0.7px);
  animation: none;
  opacity: 0.85;
}

.stage__name.is-idle {
  color: var(--text-dim);
  font-weight: 700;
}

.stage__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 26px;
}

.stage__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.btn--ghost {
  border-color: transparent;
  background: transparent;
  color: var(--text-muted);
  font-weight: 500;
}

.btn--ghost:hover {
  background: var(--surface);
  color: var(--text);
}

.stage__tip {
  margin-top: 12px;
  font-size: 11.5px;
  color: var(--text-dim);
}

/* ---------- 第二行：配料 / 做法 ---------- */

.stage__facts {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.45fr);
  gap: 20px 40px;
  margin-top: 30px;
  padding-top: 26px;
  border-top: 1px solid var(--border);
  animation: fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.fact {
  min-width: 0;
}

.fact h4 {
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 0.22em;
}

.fact__nutrition {
  margin-top: 24px;
}

.ingredients {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ingredients li {
  padding: 6px 13px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 13px;
}

.nutrition {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
}

.nutrition li {
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
}

.nutrition b {
  display: block;
  font-size: 14px;
  color: var(--herb);
}

.nutrition span {
  font-size: 11.5px;
  color: var(--text-dim);
}

.steps {
  display: grid;
  gap: 11px;
}

.steps li {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 12px;
  align-items: start;
}

.steps__index {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: rgba(255, 179, 64, 0.14);
  color: var(--amber);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.steps__text {
  font-size: 14px;
  line-height: 1.75;
  color: rgba(247, 243, 239, 0.9);
}

.stage__source {
  grid-column: 1 / -1;
  justify-self: end;
  font-size: 12.5px;
  color: var(--text-dim);
  border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
}

.stage__source:hover {
  color: var(--amber);
}

/* ---------- 响应式 ---------- */

@media (max-width: 780px) {
  .stage {
    padding: 26px 20px 24px;
  }

  .stage__top {
    justify-content: center;
    text-align: center;
  }

  .stage__media {
    flex: 1 1 100%;
    height: 168px;
  }

  .stage__info {
    flex: 1 1 100%;
  }

  .stage__meta,
  .stage__actions {
    justify-content: center;
  }

  .stage__facts {
    grid-template-columns: minmax(0, 1fr);
  }

  .stage__source {
    justify-self: center;
  }
}
</style>
