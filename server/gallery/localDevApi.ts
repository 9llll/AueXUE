import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { isLocalAdminRequest } from '../auth/localAdminApi'
import { resolveProjectRoot } from '../posts/localDevApi'
import { galleryAlbumLocalPath, galleryHubLocalPath, isValidGallerySlug } from './constants'
import { sanitizeGalleryAlbumForPublic } from './sanitize'
import {
  normalizeAlbumSlugs,
  parseAlbumSource,
  parseHubSource,
  serializeAlbumMarkdown,
  serializeHubMarkdown,
  toAlbumSummary,
} from './frontmatter'

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req)
    chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

function loadLocalAlbumSummaries(root: string, slugs: string[]) {
  const summaries = []
  for (const slug of slugs) {
    const filePath = galleryAlbumLocalPath(root, slug)
    if (!existsSync(filePath))
      continue
    const source = readFileSync(filePath, 'utf8')
    const parsed = parseAlbumSource(source)
    summaries.push(toAlbumSummary(slug, parsed.frontmatter))
  }
  return summaries
}

export async function handleLocalGalleryApi(req: IncomingMessage, res: ServerResponse, root: string) {
  const pathname = (req.url || '').split('?')[0]
  if (!pathname.startsWith('/api/gallery'))
    return false

  const projectRoot = resolveProjectRoot([root])
  const rest = pathname.slice('/api/gallery'.length).replace(/^\//, '')
  const restParts = rest ? rest.split('/') : []
  const slug = restParts[0] || ''
  const subAction = restParts[1] || ''
  const isAdmin = await isLocalAdminRequest(req)

  if (slug && subAction === 'unlock' && req.method === 'POST') {
    if (!isValidGallerySlug(slug)) {
      sendJson(res, 400, { message: '相册 slug 格式无效' })
      return true
    }

    const albumPath = galleryAlbumLocalPath(projectRoot, slug)
    if (!existsSync(albumPath)) {
      sendJson(res, 404, { message: '相册不存在' })
      return true
    }

    const source = readFileSync(albumPath, 'utf8')
    const parsed = parseAlbumSource(source)
    const body = JSON.parse(await readBody(req)) as { password?: string }
    const password = String(body.password || '')

    if (parsed.frontmatter.encrypted) {
      const expected = String(parsed.frontmatter.password || '').trim()
      if (!expected || password !== expected) {
        sendJson(res, 401, { message: '密码错误' })
        return true
      }
    }

    sendJson(res, 200, { ok: true, photos: parsed.frontmatter.photos || [] })
    return true
  }

  if (!slug) {
    const hubPath = galleryHubLocalPath(projectRoot)

    if (req.method === 'GET') {
      if (!existsSync(hubPath)) {
        sendJson(res, 404, { message: '相册数据不存在' })
        return true
      }

      const source = readFileSync(hubPath, 'utf8')
      const parsed = parseHubSource(source)
      const slugs = normalizeAlbumSlugs(parsed.frontmatter.albums)
      sendJson(res, 200, {
        frontmatter: parsed.frontmatter,
        albums: loadLocalAlbumSummaries(projectRoot, slugs),
        source: isAdmin ? source : undefined,
      })
      return true
    }

    if (req.method === 'PUT') {
      if (!isAdmin) {
        sendJson(res, 401, { message: '未授权' })
        return true
      }

      const source = await readBody(req)
      const parsed = parseHubSource(source)
      const normalized = serializeHubMarkdown(parsed.frontmatter, parsed.content)
      mkdirSync(dirname(hubPath), { recursive: true })
      writeFileSync(hubPath, normalized, 'utf8')

      const slugs = normalizeAlbumSlugs(parsed.frontmatter.albums)
      sendJson(res, 200, {
        r2Key: 'gallery/index.md',
        frontmatter: parsed.frontmatter,
        albums: loadLocalAlbumSummaries(projectRoot, slugs),
      })
      return true
    }

    sendJson(res, 405, { message: 'Method not allowed' })
    return true
  }

  if (!isValidGallerySlug(slug)) {
    sendJson(res, 400, { message: '相册 slug 格式无效' })
    return true
  }

  const albumPath = galleryAlbumLocalPath(projectRoot, slug)

  if (req.method === 'GET') {
    if (!existsSync(albumPath)) {
      sendJson(res, 404, { message: '相册不存在' })
      return true
    }

    const source = readFileSync(albumPath, 'utf8')
    const parsed = parseAlbumSource(source)
    const detail = {
      slug,
      frontmatter: parsed.frontmatter,
      source: isAdmin ? source : undefined,
    }
    sendJson(res, 200, isAdmin ? detail : sanitizeGalleryAlbumForPublic(detail))
    return true
  }

  if (req.method === 'PUT') {
    if (!isAdmin) {
      sendJson(res, 401, { message: '未授权' })
      return true
    }

    const source = await readBody(req)
    const parsed = parseAlbumSource(source)
    const normalized = serializeAlbumMarkdown(parsed.frontmatter, parsed.content)
    mkdirSync(dirname(albumPath), { recursive: true })
    writeFileSync(albumPath, normalized, 'utf8')

    sendJson(res, 200, {
      r2Key: `gallery/${slug}/index.md`,
      slug,
      frontmatter: parsed.frontmatter,
    })
    return true
  }

  if (req.method === 'DELETE') {
    if (!isAdmin) {
      sendJson(res, 401, { message: '未授权' })
      return true
    }

    if (existsSync(albumPath))
      unlinkSync(albumPath)

    let removedFromHub = false
    const hubPath = galleryHubLocalPath(projectRoot)
    if (existsSync(hubPath)) {
      const hubSource = readFileSync(hubPath, 'utf8')
      const parsed = parseHubSource(hubSource)
      const nextSlugs = normalizeAlbumSlugs(parsed.frontmatter.albums).filter(item => item !== slug)
      if (nextSlugs.length !== normalizeAlbumSlugs(parsed.frontmatter.albums).length) {
        parsed.frontmatter.albums = nextSlugs
        writeFileSync(hubPath, serializeHubMarkdown(parsed.frontmatter, parsed.content), 'utf8')
        removedFromHub = true
      }
    }

    sendJson(res, 200, { slug, removedFromHub })
    return true
  }

  sendJson(res, 405, { message: 'Method not allowed' })
  return true
}
