import type { PostListItem, PostNeighborsResponse } from '../types/posts'

export async function fetchPostList(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '')
      query.set(key, String(value))
  }
  const suffix = query.toString() ? `?${query}` : ''
  const response = await fetch(`/api/posts${suffix}`, { cache: 'no-store' })
  if (!response.ok)
    throw new Error(`加载文章列表失败 (${response.status})`)
  return response.json() as Promise<{ posts: PostListItem[], total: number, page: number, pageSize: number }>
}

export async function fetchFilteredPosts(params: {
  category?: string
  tag?: string
  month?: string
  page?: number
  pageSize?: number
} = {}) {
  return fetchPostList({
    page: params.page || 1,
    pageSize: params.pageSize || 100,
    category: params.category,
    tag: params.tag,
    month: params.month,
  })
}

export async function fetchPost(slug: string) {
  const response = await fetch(`/api/posts/${encodeURIComponent(slug)}`)
  if (!response.ok)
    throw new Error(response.status === 404 ? '文章不存在' : `加载文章失败 (${response.status})`)
  return response.json()
}

export async function fetchPostNeighbors(slug: string) {
  const response = await fetch(`/api/posts/neighbors/${encodeURIComponent(slug)}`, { cache: 'no-store' })
  if (!response.ok)
    throw new Error(`加载相邻文章失败 (${response.status})`)
  return response.json() as Promise<PostNeighborsResponse>
}
