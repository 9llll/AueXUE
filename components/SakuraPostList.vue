<script setup lang="ts">
import type { Post } from 'valaxy'
import { computed } from 'vue'
import { useMergedPostList } from '../composables/useMergedPostList'
import { useThemeConfig } from '../node_modules/valaxy-theme-sakura/composables'

const props = defineProps<{
  icon?: string
  text?: string
  posts?: Post[]
}>()

const themeConfig = useThemeConfig()
const postsList = useMergedPostList()

const isImageReversed = computed(() => themeConfig.value.postList?.isImageReversed)

const icon = computed(() => props.icon ?? themeConfig.value.ui.postList?.icon)
const text = computed(() => props.text ?? themeConfig.value.postList?.text)
const posts = computed(() => props.posts || postsList.value)
</script>

<template>
  <div id="home-post-list" class="sakura-post-list">
    <SakuraDivider :icon :text />
    <div class="post-list-container">
      <SakuraPostCard
        v-for="(post, index) in posts"
        :id="`article-${index}`"
        :key="post.path || index"
        class="article-list"
        :cols="1"
        :position="(index % 2 === (isImageReversed ? 1 : 0) ? 'left' : 'right')"
        :post
      />
    </div>
  </div>
</template>
