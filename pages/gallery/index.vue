<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDynamicGallery } from '../../composables/useDynamicGallery'

const route = useRoute()
const { galleryHub, hubLoading, loadGalleryHub } = useDynamicGallery()

const mergedFrontmatter = computed(() => {
  if (!galleryHub.value) {
    return {
      title: '相册',
      icon: 'i-ri-gallery-line',
      layout: 'gallery',
    }
  }

  const fm = galleryHub.value.frontmatter
  return {
    ...fm,
    title: fm.title || '相册',
    icon: fm.icon || 'i-ri-gallery-line',
    layout: 'gallery',
  }
})

function applyRouteFrontmatter() {
  route.meta.frontmatter = mergedFrontmatter.value
}

onMounted(async () => {
  await loadGalleryHub()
  applyRouteFrontmatter()
})

watch(galleryHub, applyRouteFrontmatter)
</script>

<template>
  <div v-if="hubLoading" class="dynamic-gallery-loading">
    加载中…
  </div>

  <div v-else-if="!galleryHub" class="dynamic-gallery-empty">
    <p>相册内容尚未发布。</p>
  </div>

  <slot v-else name="main-content" />
</template>

<style lang="scss">
.dynamic-gallery-loading,
.dynamic-gallery-empty {
  text-align: center;
  padding: 4rem 1rem;
  color: #858585;
}
</style>

<route lang="yaml">
meta:
  layout: gallery
</route>
