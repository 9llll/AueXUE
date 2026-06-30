<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDynamicGallery } from '../../composables/useDynamicGallery'

const route = useRoute()
const { galleryAlbums, loadGalleryAlbum } = useDynamicGallery()

const slug = computed(() => String(route.params.slug || ''))

const albumData = computed(() => galleryAlbums.value[slug.value] || null)
const loading = computed(() => slug.value && !(slug.value in galleryAlbums.value))

const mergedFrontmatter = computed(() => {
  if (!albumData.value) {
    return {
      title: slug.value || '相册',
      layout: 'gallery-album',
    }
  }

  const fm = albumData.value.frontmatter
  return {
    ...fm,
    title: fm.title || slug.value,
    layout: 'gallery-album',
  }
})

function applyRouteFrontmatter() {
  route.meta.frontmatter = mergedFrontmatter.value
}

onMounted(async () => {
  if (slug.value)
    await loadGalleryAlbum(slug.value)
  applyRouteFrontmatter()
})

watch([slug, albumData], async ([nextSlug]) => {
  if (nextSlug)
    await loadGalleryAlbum(nextSlug)
  applyRouteFrontmatter()
})
</script>

<template>
  <div v-if="loading" class="dynamic-gallery-loading">
    加载中…
  </div>

  <div v-else-if="!albumData" class="dynamic-gallery-empty">
    <p>该相册不存在或尚未发布。</p>
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
  layout: gallery-album
</route>
