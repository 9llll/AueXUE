import type { CloudflareEnv } from '../../../types/env'
import { verifyAdminRequest } from '../../../server/auth/adminSession'
import {
  deleteGalleryAlbum,
  getGalleryAlbum,
  getGalleryHub,
  unlockGalleryAlbum,
  upsertGalleryAlbum,
  upsertGalleryHub,
} from '../../../server/gallery/service'
import { isValidGallerySlug } from '../../../server/gallery/constants'
import { sanitizeGalleryAlbumForPublic } from '../../../server/gallery/sanitize'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=0, must-revalidate' : 'no-store',
    },
  })
}

function unauthorized() {
  return json({ message: '未授权' }, 401)
}

export async function onRequest(context: { request: Request, env: CloudflareEnv, params: { path?: string[] } }) {
  const { request, env, params } = context
  const segments = params.path || []
  const method = request.method
  const isAdmin = await verifyAdminRequest(request, env)

  try {
    if (segments.length === 0) {
      if (method === 'GET') {
        const detail = await getGalleryHub(env, { includeSource: isAdmin })
        if (!detail)
          return json({ message: '相册数据不存在' }, 404)
        return json(detail)
      }

      if (method === 'PUT') {
        if (!isAdmin)
          return unauthorized()
        const source = await request.text()
        const result = await upsertGalleryHub(env, source)
        return json(result)
      }

      return json({ message: 'Method not allowed' }, 405)
    }

    const slug = segments[0]
    if (!slug || !isValidGallerySlug(slug))
      return json({ message: '相册 slug 格式无效' }, 400)

    if (segments[1] === 'unlock' && method === 'POST') {
      const body = await request.json() as { password?: string }
      const password = String(body.password || '')
      const result = await unlockGalleryAlbum(env, slug, password)
      if (!result.ok)
        return json({ message: '密码错误' }, 401)
      return json({ ok: true, photos: result.photos })
    }

    if (method === 'GET') {
      const detail = await getGalleryAlbum(env, slug, { includeSource: isAdmin })
      if (!detail)
        return json({ message: '相册不存在' }, 404)
      return json(isAdmin ? detail : sanitizeGalleryAlbumForPublic(detail))
    }

    if (method === 'PUT') {
      if (!isAdmin)
        return unauthorized()
      const source = await request.text()
      const result = await upsertGalleryAlbum(env, slug, source)
      return json(result)
    }

    if (method === 'DELETE') {
      if (!isAdmin)
        return unauthorized()
      const result = await deleteGalleryAlbum(env, slug)
      return json(result)
    }

    return json({ message: 'Method not allowed' }, 405)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '服务器错误'
    return json({ message }, 500)
  }
}
