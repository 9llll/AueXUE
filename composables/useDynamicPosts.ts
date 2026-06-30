import type { PostDetail, PostListItem } from '../types/posts'
import { ref } from 'vue'
import { toValaxyCompatiblePosts } from '../utils/dynamicPostIndex'
import { fetchPost, fetchPostList } from '../utils/postsApi'

const posts = ref<PostListItem[]>([])
const loaded = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

export function useDynamicPostsState() {
  return { posts, loaded, loading, error }
}

export function invalidateDynamicPostsCache() {
  loaded.value = false
  posts.value = []
}

export async function loadDynamicPosts(force = false) {
  if (loaded.value && !force)
    return posts.value

  loading.value = true
  error.value = null
  try {
    const data = await fetchPostList({ pageSize: 200 })
    posts.value = data.posts
    loaded.value = true
    return posts.value
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '加载文章失败'
    return []
  }
  finally {
    loading.value = false
  }
}

export function getDynamicPostList() {
  return toValaxyCompatiblePosts(posts.value)
}

export async function loadDynamicPost(slug: string) {
  return fetchPost(slug) as Promise<PostDetail>
}
