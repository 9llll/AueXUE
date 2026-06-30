import type { GalleryAlbumDetail, GalleryHubDetail } from '../types/gallery'

export async function fetchGalleryHub() {
  const res = await fetch('/api/gallery')
  if (res.status === 404)
    return null
  if (!res.ok)
    throw new Error(`加载相册失败 (${res.status})`)
  return res.json() as Promise<GalleryHubDetail>
}

export async function fetchGalleryAlbum(slug: string) {
  const res = await fetch(`/api/gallery/${encodeURIComponent(slug)}`)
  if (res.status === 404)
    return null
  if (!res.ok)
    throw new Error(`加载相册失败 (${res.status})`)
  return res.json() as Promise<GalleryAlbumDetail>
}

export async function unlockGalleryAlbum(slug: string, password: string) {
  const res = await fetch(`/api/gallery/${encodeURIComponent(slug)}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (res.status === 401)
    throw new Error('密码错误')
  if (!res.ok)
    throw new Error(`解锁相册失败 (${res.status})`)
  return res.json() as Promise<{ ok: boolean, photos: GalleryAlbumDetail['frontmatter']['photos'] }>
}
