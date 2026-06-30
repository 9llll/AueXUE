import type { GalleryAlbumDetail, GalleryHubDetail } from '../types/gallery'
import { adminFetch } from './adminApi'

export async function fetchAdminGalleryHub() {
  return adminFetch('/api/gallery') as Promise<GalleryHubDetail>
}

export async function saveAdminGalleryHub(source: string) {
  return adminFetch('/api/gallery', {
    method: 'PUT',
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    body: source,
  })
}

export async function fetchAdminGalleryAlbum(slug: string) {
  return adminFetch(`/api/gallery/${encodeURIComponent(slug)}`) as Promise<GalleryAlbumDetail>
}

export async function saveAdminGalleryAlbum(slug: string, source: string) {
  return adminFetch(`/api/gallery/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    body: source,
  })
}

export async function deleteAdminGalleryAlbum(slug: string) {
  return adminFetch(`/api/gallery/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  })
}
