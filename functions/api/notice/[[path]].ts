import type { CloudflareEnv } from '../../../types/env'
import { verifyAdminRequest } from '../../../server/auth/adminSession'
import { getNotice, upsertNotice } from '../../../server/notice/service'

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

export async function onRequest(context: { request: Request, env: CloudflareEnv }) {
  const { request, env } = context
  const method = request.method

  try {
    if (method === 'GET') {
      const detail = await getNotice(env)
      if (!detail)
        return json({ message: '公告栏数据不存在' }, 404)
      return json(detail)
    }

    if (method === 'PUT') {
      const isAdmin = await verifyAdminRequest(request, env)
      if (!isAdmin)
        return unauthorized()

      const source = await request.text()
      const result = await upsertNotice(env, source)
      return json(result)
    }

    return json({ message: 'Method not allowed' }, 405)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '服务器错误'
    return json({ message }, 500)
  }
}
