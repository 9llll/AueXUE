import type { CloudflareEnv } from '../../../types/env'
import {
  ADMIN_SESSION_COOKIE,
  buildClearSessionCookie,
  buildSessionCookie,
  createSessionToken,
  getCookieValue,
  getSessionUser,
  isAdminLoginConfigured,
  resolveAdminEnv,
  validateAdminCredentials,
  verifyAdminRequest,
} from '../../../server/auth/adminSession'
import {
  createD1LoginRateLimit,
  formatLoginRateLimitMessage,
  getRequestClientIp,
} from '../../../server/auth/loginRateLimit'

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  })
}

export async function onRequest(context: { request: Request, env: CloudflareEnv, params: { path?: string[] } }) {
  const { request, env, params } = context
  const segments = params.path || []
  const action = segments[0] || ''
  const adminEnv = resolveAdminEnv(env)
  const secure = new URL(request.url).protocol === 'https:'

  try {
    if (action === 'login' && request.method === 'POST') {
      const body = await request.json() as { username?: string, password?: string }
      const username = String(body.username || '').trim()
      const password = String(body.password || '')
      const clientIp = getRequestClientIp(request)
      const rateLimit = createD1LoginRateLimit(env.DB)

      if (!isAdminLoginConfigured(adminEnv))
        return json({ message: '管理员登录未配置，请在环境变量中设置 ADMIN_USERNAME 与 ADMIN_PASSWORD' }, 503)

      const limit = await rateLimit.check(clientIp)
      if (!limit.allowed) {
        return json(
          { message: formatLoginRateLimitMessage(limit.retryAfterSec || 60) },
          429,
        )
      }

      if (!validateAdminCredentials(username, password, adminEnv)) {
        await rateLimit.recordFailure(clientIp)
        return json({ message: '账号或密码错误' }, 401)
      }

      await rateLimit.clear(clientIp)
      const token = await createSessionToken(username, adminEnv)
      return json(
        { ok: true, username },
        200,
        { 'Set-Cookie': buildSessionCookie(token, secure) },
      )
    }

    if (action === 'logout' && request.method === 'POST') {
      return json(
        { ok: true },
        200,
        { 'Set-Cookie': buildClearSessionCookie(secure) },
      )
    }

    if (action === 'me' && request.method === 'GET') {
      const isAdmin = await verifyAdminRequest(request, env)
      if (isAdmin) {
        const bearer = request.headers.get('Authorization') || ''
        if (bearer.startsWith('Bearer '))
          return json({ authenticated: true, username: 'token' })
      }

      const token = getCookieValue(request.headers.get('Cookie'), ADMIN_SESSION_COOKIE)
      const username = token ? await getSessionUser(token, adminEnv) : null
      if (!username)
        return json({ authenticated: false })

      return json({ authenticated: true, username })
    }

    return json({ message: 'Not found' }, 404)
  }
  catch (error) {
    return json({
      message: error instanceof Error ? error.message : '服务器错误',
    }, 500)
  }
}
