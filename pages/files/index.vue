<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDynamicHtmlFiles } from '../../composables/useDynamicHtmlFiles'

const route = useRoute()
const { htmlFiles, filesLoading, loadHtmlFiles } = useDynamicHtmlFiles()

const mergedFrontmatter = computed(() => ({
  title: '文件',
  icon: 'i-mdi-file-code-outline',
  layout: 'files',
  cover: '/files/cover.png',
  comment: false,
}))

function applyRouteFrontmatter() {
  route.meta.frontmatter = mergedFrontmatter.value
}

watch(mergedFrontmatter, applyRouteFrontmatter, { immediate: true })

onMounted(async () => {
  await loadHtmlFiles()
  applyRouteFrontmatter()
})

watch(htmlFiles, applyRouteFrontmatter)
</script>

<template>
  <div v-if="filesLoading" class="dynamic-files-loading">
    加载中…
  </div>

  <slot v-else name="main-content" />
</template>

<style lang="scss">
.dynamic-files-loading {
  text-align: center;
  padding: 4rem 1rem;
  color: #858585;
}
</style>

<route lang="yaml">
meta:
  layout: files
  title: 文件
  icon: i-mdi-file-code-outline
  cover: /files/cover.png
  comment: false
</route>
