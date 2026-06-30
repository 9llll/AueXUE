import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { isLocalAdminRequest } from '../auth/localAdminApi'
import { resolveProjectRoot } from '../posts/localDevApi'
import { aboutLocalPath } from './constants'
import { getAboutFromSource, normalizeAboutSource } from './source'

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

function resolveAboutFile(root: string) {
  return aboutLocalPath(resolveProjectRoot([root]))
}

export async function handleLocalAboutApi(req: IncomingMessage, res: ServerResponse, root: string) {
  const pathname = (req.url || '').split('?')[0]
  if (pathname !== '/api/about')
    return false

  const filePath = resolveAboutFile(root)
  const isAdmin = await isLocalAdminRequest(req)

  if (req.method === 'GET') {
    if (!existsSync(filePath)) {
      sendJson(res, 404, { message: '关于页数据不存在' })
      return true
    }

    const source = readFileSync(filePath, 'utf8')
    const detail = await getAboutFromSource(source, { includeSource: isAdmin })
    sendJson(res, 200, detail)
    return true
  }

  if (req.method === 'PUT') {
    if (!isAdmin) {
      sendJson(res, 401, { message: '未授权' })
      return true
    }

    const source = await readBody(req)
    const normalized = normalizeAboutSource(source)
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, normalized, 'utf8')
    const detail = await getAboutFromSource(normalized)
    sendJson(res, 200, { r2Key: 'about/index.md', ...detail })
    return true
  }

  sendJson(res, 405, { message: 'Method not allowed' })
  return true
}
