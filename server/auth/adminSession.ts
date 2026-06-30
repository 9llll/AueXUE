import type { CloudflareEnv } from '../../types/env'
import { getAdminEnvFromProcess, loadAdminEnv } from './loadAdminEnv'

export const ADMIN_SESSION_COOKIE = 'admin_session'
/** 单次管理会话有效时长（离开 /admin 后会清除 Cookie） */
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 4

export interface AdminAuthEnv {
  ADMIN_USERNAME?: string
  ADMIN_PASSWORD?: string
  ADMIN_API_TOKEN?: string
}

function getSecret(env: AdminAuthEnv) {
  return env.ADMIN_API_TOKEN || env.ADMIN_PASSWORD || ''
}

function base64urlEncode(input: string) {
  if (typeof btoa === 'function')
    return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return Buffer.from(input, 'utf8').toString('base64url')
}

function base64urlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)

  if (typeof atob === 'function')
    return atob(padded)

  return Buffer.from(padded, 'base64').toString('utf8')
}

async function hmacSign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const bytes = new Uint8Array(signature)
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)

  if (typeof btoa === 'function')
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return Buffer.from(bytes).toString('base64url')
}

export async function createSessionToken(username: string, env: AdminAuthEnv) {
  const secret = getSecret(env)
  if (!secret)
    throw new Error('未配置 ADMIN_API_TOKEN 或 ADMIN_PASSWORD')

  const exp = Date.now() + ADMIN_SESSION_MAX_AGE * 1000
  const payload = base64urlEncode(JSON.stringify({ u: username, exp }))
  const sig = await hmacSign(payload, secret)
  return `${payload}.${sig}`
}

export async function verifySessionToken(token: string, env: AdminAuthEnv) {
  const user = await getSessionUser(token, env)
  return Boolean(user)
}

export async function getSessionUser(token: string, env: AdminAuthEnv) {
  const secret = getSecret(env)
  if (!secret || !token)
    return null

  const [payload, sig] = token.split('.')
  if (!payload || !sig)
    return null

  const expected = await hmacSign(payload, secret)
  if (expected !== sig)
    return null

  try {
    const data = JSON.parse(base64urlDecode(payload)) as { u?: string, exp?: number }
    if (!data.exp || Date.now() > data.exp)
      return null
    return data.u || null
  }
  catch {
    return null
  }
}

export function getCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader)
    return null

  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=')
    if (rawKey === name)
      return decodeURIComponent(rest.join('='))
  }

  return null
}

export function buildSessionCookie(token: string, secure: boolean) {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ADMIN_SESSION_MAX_AGE}`,
  ]
  if (secure)
    parts.push('Secure')
  return parts.join('; ')
}

export function buildClearSessionCookie(secure: boolean) {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (secure)
    parts.push('Secure')
  return parts.join('; ')
}

export function resolveAdminEnv(env?: CloudflareEnv): AdminAuthEnv {
  if (env?.ADMIN_USERNAME || env?.ADMIN_PASSWORD || env?.ADMIN_API_TOKEN)
    return env

  loadAdminEnv()
  return getAdminEnvFromProcess()
}

export function validateAdminCredentials(
  username: string,
  password: string,
  env: AdminAuthEnv,
) {
  if (!isAdminLoginConfigured(env))
    return false

  const expectedUser = env.ADMIN_USERNAME!.trim()
  const expectedPass = env.ADMIN_PASSWORD!
  return username === expectedUser && password === expectedPass
}

/** 浏览器登录必须同时配置用户名与密码 */
export function isAdminLoginConfigured(env: AdminAuthEnv) {
  return Boolean(env.ADMIN_USERNAME?.trim() && env.ADMIN_PASSWORD)
}

export async function verifyAdminRequest(request: Request, env?: CloudflareEnv) {
  const adminEnv = resolveAdminEnv(env)
  const configuredToken = adminEnv.ADMIN_API_TOKEN?.trim()
  const bearer = request.headers.get('Authorization') || ''
  const bearerToken = bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : ''
  if (configuredToken && bearerToken === configuredToken)
    return true

  const token = getCookieValue(request.headers.get('Cookie'), ADMIN_SESSION_COOKIE)
  if (!token)
    return false

  return verifySessionToken(token, adminEnv)
}

export async function verifyAdminHeaders(
  headers: { authorization?: string | null, cookie?: string | null },
  env?: CloudflareEnv,
) {
  const adminEnv = resolveAdminEnv(env)
  const configuredToken = adminEnv.ADMIN_API_TOKEN?.trim()
  const bearer = headers.authorization || ''
  const bearerToken = bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : ''
  if (configuredToken && bearerToken === configuredToken)
    return true

  const token = getCookieValue(headers.cookie || null, ADMIN_SESSION_COOKIE)
  if (!token)
    return false

  return verifySessionToken(token, adminEnv)
}
