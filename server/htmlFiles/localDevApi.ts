import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { isLocalAdminRequest } from '../auth/localAdminApi'
import { resolveProjectRoot } from '../posts/localDevApi'
import type { HtmlFileDetail, HtmlFileSummary, HtmlFileUpsertPayload } from '../../types/htmlFile'
import {
  htmlFilesLocalContentPath,
  htmlFilesLocalIndexPath,
} from './constants'
import { normalizeHtmlFilePayload, normalizeHtmlFileSlug } from './service'

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function sendHtml(res: ServerResponse, status: number, content: string) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  res.end(content)
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req)
    chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

function readLocalIndex(root: string): HtmlFileSummary[] {
  const filePath = htmlFilesLocalIndexPath(resolveProjectRoot([root]))
  if (!existsSync(filePath))
    return []

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as HtmlFileSummary[]
    return Array.isArray(parsed) ? parsed : []
  }
  catch {
    return []
  }
}

function writeLocalIndex(root: string, items: HtmlFileSummary[]) {
  const projectRoot = resolveProjectRoot([root])
  const filePath = htmlFilesLocalIndexPath(projectRoot)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(items, null, 2)}\n`, 'utf8')
}

function readLocalDetail(root: string, slugInput: string): HtmlFileDetail | null {
  let slug: string
  try {
    slug = normalizeHtmlFileSlug(slugInput)
  }
  catch {
    return null
  }

  const projectRoot = resolveProjectRoot([root])
  const summary = readLocalIndex(root).find(item => item.slug === slug)
  const contentPath = htmlFilesLocalContentPath(projectRoot, slug)
  if (!summary || !existsSync(contentPath))
    return null

  return {
    ...summary,
    content: readFileSync(contentPath, 'utf8'),
  }
}

function upsertLocalFile(root: string, payload: HtmlFileUpsertPayload): HtmlFileDetail {
  const normalized = normalizeHtmlFilePayload(payload)
  const projectRoot = resolveProjectRoot([root])
  const now = new Date().toISOString()
  const items = readLocalIndex(root)
  const existing = items.find(item => item.slug === normalized.slug)
  const summary: HtmlFileSummary = {
    slug: normalized.slug,
    title: normalized.title,
    description: normalized.description || '',
    publicPath: `/${normalized.slug}.html`,
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  }

  const nextItems = [
    summary,
    ...items.filter(item => item.slug !== normalized.slug),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  writeLocalIndex(root, nextItems)
  const contentPath = htmlFilesLocalContentPath(projectRoot, normalized.slug)
  mkdirSync(dirname(contentPath), { recursive: true })
  writeFileSync(contentPath, normalized.content, 'utf8')

  return {
    ...summary,
    content: normalized.content,
  }
}

function deleteLocalFile(root: string, slugInput: string): boolean {
  const slug = normalizeHtmlFileSlug(slugInput)
  const projectRoot = resolveProjectRoot([root])
  const items = readLocalIndex(root)
  const nextItems = items.filter(item => item.slug !== slug)
  if (nextItems.length === items.length)
    return false

  writeLocalIndex(root, nextItems)
  const contentPath = htmlFilesLocalContentPath(projectRoot, slug)
  if (existsSync(contentPath))
    unlinkSync(contentPath)

  return true
}

export async function handleLocalHtmlFilesApi(req: IncomingMessage, res: ServerResponse, root: string) {
  const url = new URL(req.url || '/', 'http://localhost')
  const pathname = url.pathname

  if (pathname === '/api/html-files' && req.method === 'GET') {
    sendJson(res, 200, { files: readLocalIndex(root) })
    return true
  }

  const match = pathname.match(/^\/api\/html-files\/([^/]+)$/)
  if (match) {
    let slug: string
    try {
      slug = normalizeHtmlFileSlug(decodeURIComponent(match[1]))
    }
    catch {
      sendJson(res, 400, { message: '路径无效' })
      return true
    }

    if (req.method === 'GET') {
      if (!(await isLocalAdminRequest(req))) {
        sendJson(res, 401, { message: '未授权' })
        return true
      }

      const detail = readLocalDetail(root, slug)
      if (!detail) {
        sendJson(res, 404, { message: 'HTML 文件不存在' })
        return true
      }
      sendJson(res, 200, detail)
      return true
    }

    if (req.method === 'PUT') {
      if (!(await isLocalAdminRequest(req))) {
        sendJson(res, 401, { message: '未授权' })
        return true
      }

      const body = await readBody(req)
      const payload = JSON.parse(body) as HtmlFileUpsertPayload
      const detail = upsertLocalFile(root, payload)
      sendJson(res, 200, detail)
      return true
    }

    if (req.method === 'DELETE') {
      if (!(await isLocalAdminRequest(req))) {
        sendJson(res, 401, { message: '未授权' })
        return true
      }

      const deleted = deleteLocalFile(root, slug)
      if (!deleted) {
        sendJson(res, 404, { message: 'HTML 文件不存在' })
        return true
      }
      sendJson(res, 200, { ok: true })
      return true
    }

    sendJson(res, 405, { message: 'Method not allowed' })
    return true
  }

  return false
}

export async function handleLocalHtmlFileServe(req: IncomingMessage, res: ServerResponse, root: string) {
  const url = new URL(req.url || '/', 'http://localhost')
  const pathname = url.pathname.replace(/\/+$/, '')
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 1 || !segments[0].endsWith('.html'))
    return false

  const slugRaw = segments[0].replace(/\.html$/i, '')
  let slug: string
  try {
    slug = normalizeHtmlFileSlug(slugRaw)
  }
  catch {
    return false
  }

  const detail = readLocalDetail(root, slug)
  if (!detail)
    return false

  sendHtml(res, 200, detail.content)
  return true
}
