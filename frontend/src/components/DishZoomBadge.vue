<script setup lang="ts">
/** 图片可点开大图时的角标，放在定位好的容器（如 .dish-card__media）里。 */
</script>

<template>
  <span class="dish-zoom" aria-hidden="true">
    <svg viewBox="0 0 20 20">
      <circle cx="8.6" cy="8.6" r="5.2" fill="none" stroke="currentColor" stroke-width="1.7" />
      <path
        d="M12.5 12.5 17 17"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
      <path
        d="M8.6 6.2v4.8M6.2 8.6h4.8"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  </span>
</template>

<style scoped>
.dish-zoom {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(10, 8, 14, 0.62);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.82);
  pointer-events: none;
  transition:
    background 0.18s ease,
    transform 0.18s ease;
}

.dish-zoom svg {
  width: 15px;
  height: 15px;
}
</style>
