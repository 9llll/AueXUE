import type { CloudflareEnv } from '../../../types/env'
import { verifyAdminRequest } from '../../../server/auth/adminSession'
import {
  deleteHtmlFile,
  getHtmlFile,
  listHtmlFiles,
  parseHtmlFileSlugParam,
  upsertHtmlFile,
} from '../../../server/htmlFiles/service'
import type { HtmlFileUpsertPayload } from '../../../types/htmlFile'

function json(data: unknown, status = 200, cache: 'public' | 'private' = 'public') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200
        ? (cache === 'private' ? 'private, no-store' : 'public, max-age=0, must-revalidate')
        : 'no-store',
    },
  })
}

function unauthorized() {
  return json({ message: '未授权' }, 401)
}

export async function onRequest(context: { request: Request, env: CloudflareEnv, params: { path?: string | string[] } }) {
  const { request, env, params } = context
  const method = request.method
  const segments = Array.isArray(params.path)
    ? params.path
    : params.path
      ? [params.path]
      : []

  try {
    const isAdmin = await verifyAdminRequest(request, env)

    if (!segments.length) {
      if (method === 'GET') {
        const files = await listHtmlFiles(env)
        return json({ files })
      }
      return json({ message: 'Method not allowed' }, 405)
    }

    let slug: string
    try {
      slug = parseHtmlFileSlugParam(segments)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : '路径无效'
      return json({ message }, 400)
    }

    if (method === 'GET') {
      if (!isAdmin)
        return unauthorized()

      const detail = await getHtmlFile(env, slug)
      if (!detail)
        return json({ message: 'HTML 文件不存在' }, 404)
      return json(detail, 200, 'private')
    }

    if (method === 'PUT') {
      if (!isAdmin)
        return unauthorized()

      const payload = await request.json() as HtmlFileUpsertPayload
      const detail = await upsertHtmlFile(env, payload)
      return json(detail, 200, 'private')
    }

    if (method === 'DELETE') {
      if (!isAdmin)
        return unauthorized()

      const deleted = await deleteHtmlFile(env, slug)
      if (!deleted)
        return json({ message: 'HTML 文件不存在' }, 404)
      return json({ ok: true })
    }

    return json({ message: 'Method not allowed' }, 405)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '服务器错误'
    const status = /不能为空|仅支持|已被系统保留|路径无效/.test(message) ? 400 : 500
    return json({ message }, status)
  }
}
