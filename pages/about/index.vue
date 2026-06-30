<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { runContentUpdated } from 'valaxy'
import { useDynamicAbout } from '../../composables/useDynamicAbout'
import { applyCodeBlockFold } from '../../utils/collapseCode'

const route = useRoute()
const { aboutData, loading, loadAbout } = useDynamicAbout()
const contentReady = ref(false)

const mergedFrontmatter = computed(() => {
  if (!aboutData.value)
    return { title: '关于我', layout: 'post' }

  const fm = aboutData.value.frontmatter
  return {
    ...fm,
    title: fm.title || '关于我',
    layout: 'post',
  }
})

function applyRouteFrontmatter() {
  if (!aboutData.value)
    return
  route.meta.frontmatter = mergedFrontmatter.value
}

async function afterContentRender() {
  await nextTick()
  runContentUpdated()
  applyCodeBlockFold()
  await nextTick()
  runContentUpdated()
  requestAnimationFrame(() => {
    runContentUpdated()
    applyCodeBlockFold()
  })
}

function onContentMounted() {
  if (aboutData.value?.html)
    void afterContentRender()
}

onMounted(async () => {
  await loadAbout()
  applyRouteFrontmatter()
})

watch(aboutData, () => {
  applyRouteFrontmatter()
  if (aboutData.value?.html)
    void afterContentRender()
})

watch(loading, async (isLoading) => {
  if (!isLoading && aboutData.value?.html) {
    contentReady.value = true
    await afterContentRender()
  }
})
</script>

<template>
  <div v-if="loading" class="dynamic-about-loading">
    加载中…
  </div>

  <div v-else-if="!aboutData" class="dynamic-about-empty">
    <p>关于页内容尚未发布。</p>
  </div>

  <ValaxyMain v-else :frontmatter="mergedFrontmatter">
    <template #main-content-md>
      <div v-html="aboutData.html" @vue:mounted="onContentMounted" />
    </template>

    <template #main-content-after>
      <slot name="main-content-after" />
    </template>

    <template #main-nav-after>
      <slot name="main-nav-after" />
    </template>

    <template #footer>
      <slot name="footer" />
    </template>
  </ValaxyMain>
</template>

<style lang="scss">
.dynamic-about-loading,
.dynamic-about-empty {
  text-align: center;
  padding: 4rem 1rem;
  color: #858585;
}
</style>

<route lang="yaml">
meta:
  layout: post
</route>
