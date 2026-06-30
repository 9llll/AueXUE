import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AlbumWebDavConfig } from '../types/album'
import { getAlbumWebDavPublicConfig } from './albumWebdavPublicConfig'

const loadedRoots = new Set<string>()

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL
    || process.env.CF_PAGES
    || process.env.NETLIFY
    || process.env.AWS_LAMBDA_FUNCTION_NAME
  )
}

function parseEnvFile(content: string) {
  const vars: Record<string, string> = {}
  const normalized = content.replace(/^\uFEFF/, '')

  for (const line of normalized.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#'))
      continue

    const idx = trimmed.indexOf('=')
    if (idx === -1)
      continue

    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1)
    }

    vars[key] = value
  }

  return vars
}

export function loadAlbumWebDavEnv(root = process.cwd()) {
  if (isServerlessRuntime())
    return

  const resolvedRoot = resolve(root)
  if (loadedRoots.has(resolvedRoot))
    return

  loadedRoots.add(resolvedRoot)

  const mode = process.env.NODE_ENV || 'development'
  const files = [
    '.env',
    '.env.local',
    `.env.${mode}`,
    `.env.${mode}.local`,
  ]

  for (const file of files) {
    const filePath = resolve(resolvedRoot, file)
    if (!existsSync(filePath))
      continue

    try {
      const vars = parseEnvFile(readFileSync(filePath, 'utf8'))
      for (const [key, value] of Object.entries(vars)) {
        if (process.env[key] === undefined)
          process.env[key] = value
      }
    }
    catch {
      // ignore unreadable env files
    }
  }
}

export const WEBDAV_PASSWORD_ENV = 'WEBDAV_PASSWORD'

export function applyRuntimeEnv(runtimeEnv?: Record<string, string | undefined>) {
  if (!runtimeEnv)
    return

  for (const [key, value] of Object.entries(runtimeEnv)) {
    if (value !== undefined && process.env[key] === undefined)
      process.env[key] = value
  }
}

export function getWebDavPassword() {
  loadAlbumWebDavEnv()
  return process.env[WEBDAV_PASSWORD_ENV]
}

export function resolveWebDavConfig(slug: string): AlbumWebDavConfig {
  loadAlbumWebDavEnv()

  if (!slug)
    throw new Error('缺少相册标识')

  const registered = getAlbumWebDavPublicConfig(slug)
  if (!registered?.url?.trim())
    throw new Error(`未找到 WebDAV 相册配置，请检查 content/gallery/${slug}/index.md`)

  const password = getWebDavPassword()

  if (!password)
    throw new Error(`未配置 WebDAV 密码环境变量 ${WEBDAV_PASSWORD_ENV}`)

  return {
    url: registered.url.trim(),
    username: registered.username?.trim() || undefined,
    password,
  }
}

export function assertTargetInWebDavScope(targetUrl: string, baseUrl: string) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  let target: URL
  let base: URL
  try {
    target = new URL(targetUrl)
    base = new URL(normalizedBase)
  }
  catch {
    throw new Error('非法媒体地址')
  }

  if (target.origin !== base.origin)
    throw new Error('媒体地址不在相册范围内')

  const basePath = base.pathname.replace(/\/$/, '') || '/'
  if (!target.pathname.startsWith(basePath))
    throw new Error('媒体地址不在相册范围内')
}
