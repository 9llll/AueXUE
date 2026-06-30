<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { runContentUpdated } from 'valaxy'
import { loadDynamicPost, loadDynamicPosts, useDynamicPostsState } from '../../composables/useDynamicPosts'
import { setDynamicPostFrontmatter } from '../../composables/useDynamicPostFrontmatter'
import { applyCodeBlockFold } from '../../utils/collapseCode'
import { scrollToHeadingById } from '../../utils/scrollToHeading'
import type { PostDetail, PostListItem } from '../../types/posts'

const route = useRoute()
const { posts } = useDynamicPostsState()
const post = ref<PostDetail | null>(null)
const error = ref<string | null>(null)
const loading = ref(true)

const slug = computed(() => {
  const param = route.params.slug
  if (Array.isArray(param))
    return param.map(part => decodeURIComponent(String(part))).join('/')
  return decodeURIComponent(String(param || ''))
})

const mergedFrontmatter = computed(() => {
  if (!post.value)
    return route.meta.frontmatter || {}

  const detail = post.value
  return {
    ...detail.frontmatter,
    title: detail.title,
    date: detail.date,
    updated: detail.updated,
    categories: detail.categories,
    tags: detail.tags,
    cover: detail.cover,
    excerpt: detail.excerpt,
  }
})

function applyFrontmatter(detail: PostDetail | PostListItem) {
  const fm = {
    ...(('frontmatter' in detail && detail.frontmatter) ? detail.frontmatter : {}),
    title: detail.title,
    date: detail.date,
    updated: detail.updated,
    categories: detail.categories,
    tags: detail.tags,
    cover: detail.cover,
    excerpt: detail.excerpt,
  }
  route.meta.frontmatter = fm
  setDynamicPostFrontmatter(fm)
  if ('excerpt' in detail && detail.excerpt)
    route.meta.excerpt = detail.excerpt
}

async function prefillFromList() {
  if (!posts.value.length)
    await loadDynamicPosts()
  const cached = posts.value.find(item => item.slug === slug.value)
  if (cached)
    applyFrontmatter(cached)
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
    if (route.hash)
      scrollToHeadingById(route.hash.slice(1), 'auto')
  })
}

async function fetchPost() {
  loading.value = true
  error.value = null
  post.value = null

  await prefillFromList()

  try {
    const detail = await loadDynamicPost(slug.value)
    post.value = detail
    applyFrontmatter(detail)
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  }
  finally {
    loading.value = false
  }
}

function onContentMounted() {
  if (post.value?.html)
    void afterContentRender()
}

watch(slug, () => fetchPost(), { immediate: true })

watch(loading, async (isLoading) => {
  if (!isLoading && post.value?.html)
    await afterContentRender()
})
</script>

<template>
  <div v-if="loading" class="dynamic-post-loading">加载中…</div>

  <div v-else-if="error" class="dynamic-post-error">
    <p>{{ error }}</p>
    <RouterLink to="/">返回首页</RouterLink>
  </div>

  <ValaxyMain v-else-if="post" :frontmatter="mergedFrontmatter">
    <template #main-content-md>
      <div v-html="post.html" @vue:mounted="onContentMounted" />
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
.dynamic-post-loading,
.dynamic-post-error {
  text-align: center;
  padding: 4rem 1rem;
  color: #858585;
}
</style>

<route lang="yaml">
meta:
  layout: post
</route>
