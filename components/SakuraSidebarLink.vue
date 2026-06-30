<script lang="ts" setup>
import type { NavItem } from '../node_modules/valaxy-theme-sakura/types'
import { useThemeConfig } from '../node_modules/valaxy-theme-sakura/composables'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{
  sidebar?: NavItem[]
}>()

const themeConfig = useThemeConfig()
const route = useRoute()
const markerEl = ref<HTMLElement | null>(null)

const sidebar = computed(() =>
  props.sidebar
  || (Array.isArray(themeConfig.value.sidebar) && themeConfig.value.sidebar.length > 0 ? themeConfig.value.sidebar : themeConfig.value.navbar),
) as unknown as NavItem[]

function resolveMarker() {
  return markerEl.value ?? document.querySelector<HTMLElement>('.sakura-sidebar #marker')
}

function updateMarker() {
  const marker = resolveMarker()
  if (!marker)
    return

  const routeActive = document.querySelector('.sakura-sidebar-link .router-link-active') as HTMLElement | null
  marker.style.top = `${routeActive?.offsetTop || 0}px`
  marker.style.height = `${routeActive?.offsetHeight || 0}px`
}

watch(() => route.path, () => nextTick(() => updateMarker()))

onMounted(() => {
  nextTick(() => updateMarker())
})
</script>

<template>
  <nav class="sakura-sidebar-link">
    <SakuraSidebarLinkItem :items="sidebar" class="mx-auto" />
    <div id="marker" ref="markerEl" />
  </nav>
</template>

<style lang="scss" scoped>
.sakura-sidebar-link {
  display: flex;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
}
</style>
