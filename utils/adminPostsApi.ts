import type { PostDetail, PostListItem, PostsListResponse } from '../types/posts'
import { adminFetch } from './adminApi'

export async function fetchAdminPostList() {
  const data = await adminFetch('/api/posts?pageSize=200') as PostsListResponse
  return data.posts
}

export async function fetchAdminPost(slug: string) {
  return adminFetch(`/api/posts/${encodeURIComponent(slug)}`) as Promise<PostDetail>
}

export async function saveAdminPost(slug: string, source: string) {
  return adminFetch(`/api/posts/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    body: source,
  })
}

export async function deleteAdminPost(slug: string) {
  return adminFetch(`/api/posts/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  })
}

export type { PostListItem, PostDetail }
