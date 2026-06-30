import type { Post } from 'valaxy'
import { useSiteConfig } from 'valaxy'
import { computed } from 'vue'
import { useThemeConfig } from '../node_modules/valaxy-theme-sakura/composables/config'
import { useSakuraAppStore } from '../node_modules/valaxy-theme-sakura/stores/app.ts'
import { getDynamicPostList, useDynamicPostsState } from './useDynamicPosts'

function resolveDefaultCover(cover: Post['cover'], defaultImage: unknown) {
  if (cover || !defaultImage)
    return cover
  if (typeof defaultImage === 'string')
    return defaultImage
  if (Array.isArray(defaultImage))
    return defaultImage[0]
  return cover
}

function decoratePosts(posts: Post[], defaultImage: unknown) {
  return posts.map((post) => {
    const cover = resolveDefaultCover(post.cover, defaultImage)
    if (post.tags && post.tags.length > 3)
      return { ...post, cover, tags: post.tags.slice(0, 3) }
    if (cover !== post.cover)
      return { ...post, cover }
    return post
  })
}

export function useAllMergedPosts(_params: { type?: string } = {}) {
  const { loaded } = useDynamicPostsState()

  return computed(() => {
    if (!loaded.value)
      return [] as Post[]
    return getDynamicPostList() as Post[]
  })
}

export function useMergedPostList(params: { type?: string } = {}) {
  const siteConfig = useSiteConfig()
  const themeConfig = useThemeConfig()
  const sakura = useSakuraAppStore()
  const allPosts = useAllMergedPosts(params)

  const pageSize = computed(() => themeConfig.value.pagination?.itemsPerPage || siteConfig.value.pageSize)
  const curPage = computed(() => sakura.curPage || 1)

  return computed(() => {
    const sliced = allPosts.value.slice(
      (curPage.value - 1) * pageSize.value,
      curPage.value * pageSize.value * sakura.loadMultiple,
    )
    return decoratePosts(sliced, themeConfig.value.postList?.defaultImage)
  })
}
