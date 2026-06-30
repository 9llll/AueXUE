import type { PostListItem } from '../types/posts'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchPostNeighbors } from '../utils/postsApi'

function resolveSlug(param: unknown) {
  if (Array.isArray(param))
    return param.map(part => decodeURIComponent(String(part))).join('/')
  return decodeURIComponent(String(param || ''))
}

export function usePostNeighbors() {
  const route = useRoute()
  const prev = ref<PostListItem | null>(null)
  const next = ref<PostListItem | null>(null)

  async function load(slug: string) {
    if (!slug) {
      prev.value = null
      next.value = null
      return
    }

    try {
      const data = await fetchPostNeighbors(slug)
      prev.value = data.prev
      next.value = data.next
    }
    catch {
      prev.value = null
      next.value = null
    }
  }

  watch(
    () => resolveSlug(route.params.slug),
    slug => load(slug),
    { immediate: true },
  )

  return { prev, next }
}
