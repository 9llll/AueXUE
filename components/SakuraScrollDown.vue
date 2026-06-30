<script setup lang="ts">
import { computed } from 'vue'
import { useConfig } from 'valaxy'
import { scrollPastHero } from '../utils/sakuraScrollDown'

const config = useConfig()

const icon = computed(() => config.value.themeConfig?.ui?.scrollDown?.icon ?? 'i-fa6-solid-angle-down')

function handleScrollDown() {
  const themeConfig = config.value.themeConfig as {
    scrollAnimation?: boolean
  }

  scrollPastHero({
    scrollAnimation: themeConfig.scrollAnimation,
  })
}
</script>

<template>
  <button
    v-if="icon"
    type="button"
    class="sakura-scroll-down"
    aria-label="向下滚动"
    @click="handleScrollDown"
  >
    <span :class="icon" class="sakura-scroll-down-icon sakura-loop-float inline-block" />
  </button>
</template>

<style lang="scss" scoped>
.sakura-scroll-down {
  transform: scale(1.5, 1);

  &-icon {
    color: var(--sakura-color-background);
    font-size: 19px;
    cursor: pointer;
  }
}
</style>
