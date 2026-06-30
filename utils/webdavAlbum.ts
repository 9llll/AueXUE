import type { AlbumPhoto } from '~/types/album'
import type { AlbumAccessParams } from './albumAuth'

function appendAccessParams(params: URLSearchParams, access: AlbumAccessParams) {
  if (access.encrypted)
    params.set('encrypted', 'true')
  if (access.password)
    params.set('albumPassword', access.password)
  if (access.accessPassword)
    params.set('accessPassword', access.accessPassword)
}

export function buildWebDavMediaProxyUrl(
  slug: string,
  photoUrl: string,
  access: AlbumAccessParams,
) {
  const params = new URLSearchParams({
    slug,
    url: photoUrl,
  })
  appendAccessParams(params, access)
  return `/api/album-webdav/file?${params.toString()}`
}

function buildWebDavListUrl(slug: string, access: AlbumAccessParams) {
  const params = new URLSearchParams({ slug })
  appendAccessParams(params, access)
  return `/api/album-webdav/list?${params.toString()}`
}

export async function fetchWebDavPhotos(
  slug: string,
  access: AlbumAccessParams,
): Promise<AlbumPhoto[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(buildWebDavListUrl(slug, access), {
      method: 'GET',
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => ({} as { message?: string, photos?: AlbumPhoto[] }))

    if (!response.ok)
      throw new Error(payload.message || `WebDAV 代理请求失败 (${response.status})`)

    const photos = Array.isArray(payload.photos) ? payload.photos : []

    return photos.map((photo: AlbumPhoto) => ({
      ...photo,
      url: buildWebDavMediaProxyUrl(slug, photo.url, access),
    }))
  }
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError')
      throw new Error('WebDAV 加载超时，请检查网络或代理配置')
    throw error
  }
  finally {
    clearTimeout(timeout)
  }
}
