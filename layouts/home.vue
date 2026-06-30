<script lang="ts" setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSakuraAppStore } from '../node_modules/valaxy-theme-sakura/stores/app.ts'
import { resolveHomePageIndex } from '../utils/homePagination'

const route = useRoute()
const sakura = useSakuraAppStore()

const pageIndex = computed(() => resolveHomePageIndex(route))

sakura.curPage = pageIndex.value

watch(pageIndex, (value) => {
  sakura.curPage = value
}, { immediate: true })
</script>

<template>
  <SakuraHomeLayout />
</template>
