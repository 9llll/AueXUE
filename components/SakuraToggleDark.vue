<script setup lang="ts">
import { useAppStore } from 'valaxy'
import { computed } from 'vue'

const appStore = useAppStore()
const iconClass = computed(() => appStore.isDark ? 'i-ri-sun-line' : 'i-ri-moon-line')
</script>

<template>
  <button class="sakura-icon-btn sakura-toggle-dark select-none" type="button" aria-label="Toggle Color Scheme" @click="appStore.toggleDarkWithTransition">
    <div :class="iconClass" />
  </button>
</template>

<style scoped lang="scss">
.sakura-toggle-dark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;

  > div {
    width: 1.35em;
    height: 1.35em;
  }
}
</style>
