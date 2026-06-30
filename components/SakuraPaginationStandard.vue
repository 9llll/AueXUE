<script setup lang="ts">
import { useSiteConfig } from 'valaxy'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAllMergedPosts } from '../composables/useMergedPostList'
import { useThemeConfig } from '../node_modules/valaxy-theme-sakura/composables'
import { resolveHomePageIndex } from '../utils/homePagination'

const props = defineProps<{
  pageSize?: number
  total?: number
}>()

const route = useRoute()
const siteConfig = useSiteConfig()
const themeConfig = useThemeConfig()
const routes = useAllMergedPosts({ type: '' })

const posts = computed(() => routes.value)
const curPage = computed(() => resolveHomePageIndex(route))
const pageSize = computed(() => props.pageSize || themeConfig.value.pagination?.itemsPerPage || siteConfig.value.pageSize)
</script>

<template>
  <nav class="sakura-pagination-standard mb-[2.125rem] mt-10 flex justify-center">
    <ValaxyPagination :cur-page="curPage" :page-size="pageSize" :total="total || posts.length" />
  </nav>
</template>
