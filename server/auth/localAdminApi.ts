import type { IncomingMessage, ServerResponse } from 'node:http'
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
} from './adminSession'
import {
  formatLoginRateLimitMessage,
  getHttpClientIp,
  getLocalLoginRateLimitStore,
} from './loginRateLimit'

function sendJson(res: ServerResponse, status: number, payload: unknown, headers: Record<string, string> = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  for (const [key, value] of Object.entries(headers))
    res.setHeader(key, value)
  res.end(JSON.stringify(payload))
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req)
    chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

function isSecureRequest(req: IncomingMessage) {
  const forwarded = req.headers['x-forwarded-proto']
  if (forwarded === 'https')
    return true
  return false
}

export async function handleLocalAdminApi(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://localhost')
  const pathname = url.pathname
  const adminEnv = resolveAdminEnv()
  const secure = isSecureRequest(req)

  if (pathname === '/api/admin/login' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req)) as { username?: string, password?: string }
      const username = String(body.username || '').trim()
      const password = String(body.password || '')
      const clientIp = getHttpClientIp(req)
      const rateLimit = getLocalLoginRateLimitStore()

      if (!isAdminLoginConfigured(adminEnv)) {
        sendJson(res, 503, { message: '管理员登录未配置，请在环境变量中设置 ADMIN_USERNAME 与 ADMIN_PASSWORD' })
        return true
      }

      const limit = await rateLimit.check(clientIp)
      if (!limit.allowed) {
        sendJson(res, 429, { message: formatLoginRateLimitMessage(limit.retryAfterSec || 60) })
        return true
      }

      if (!validateAdminCredentials(username, password, adminEnv)) {
        await rateLimit.recordFailure(clientIp)
        sendJson(res, 401, { message: '账号或密码错误' })
        return true
      }

      await rateLimit.clear(clientIp)
      const token = await createSessionToken(username, adminEnv)
      sendJson(res, 200, { ok: true, username }, {
        'Set-Cookie': buildSessionCookie(token, secure),
      })
    }
    catch {
      sendJson(res, 400, { message: '请求格式错误' })
    }
    return true
  }

  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    sendJson(res, 200, { ok: true }, {
      'Set-Cookie': buildClearSessionCookie(secure),
    })
    return true
  }

  if (pathname === '/api/admin/me' && req.method === 'GET') {
    const adminEnv = resolveAdminEnv()
    const bearer = req.headers.authorization || ''
    const configuredToken = adminEnv.ADMIN_API_TOKEN?.trim()
    const bearerToken = bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : ''
    if (configuredToken && bearerToken === configuredToken) {
      sendJson(res, 200, { authenticated: true, username: 'token' })
      return true
    }

    const token = getCookieValue(req.headers.cookie, ADMIN_SESSION_COOKIE)
    const username = token ? await getSessionUser(token, adminEnv) : null
    if (!username) {
      sendJson(res, 200, { authenticated: false })
      return true
    }
    sendJson(res, 200, { authenticated: true, username })
    return true
  }

  return false
}

export async function isLocalAdminRequest(req: IncomingMessage) {
  const adminEnv = resolveAdminEnv()
  const configuredToken = adminEnv.ADMIN_API_TOKEN?.trim()
  const bearer = req.headers.authorization || ''
  const bearerToken = bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : ''
  if (configuredToken && bearerToken === configuredToken)
    return true

  const token = getCookieValue(req.headers.cookie, ADMIN_SESSION_COOKIE)
  if (!token)
    return false

  return verifySessionTokenLocal(token, adminEnv)
}

async function verifySessionTokenLocal(token: string, adminEnv: ReturnType<typeof resolveAdminEnv>) {
  return Boolean(await getSessionUser(token, adminEnv))
}
