import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { isLocalAdminRequest } from '../auth/localAdminApi'
import { resolveProjectRoot } from '../posts/localDevApi'
import { linksLocalPath } from './constants'
import { parseLinksSource, serializeLinksFrontmatter } from './frontmatter'

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

function resolveLinksFile(root: string) {
  const projectRoot = resolveProjectRoot([root])
  return linksLocalPath(projectRoot)
}

export async function handleLocalLinksApi(req: IncomingMessage, res: ServerResponse, root: string) {
  const pathname = (req.url || '').split('?')[0]
  if (pathname !== '/api/links')
    return false

  const filePath = resolveLinksFile(root)
  const isAdmin = await isLocalAdminRequest(req)

  if (req.method === 'GET') {
    if (!existsSync(filePath)) {
      sendJson(res, 404, { message: '友链数据不存在' })
      return true
    }

    const source = readFileSync(filePath, 'utf8')
    const parsed = parseLinksSource(source)
    sendJson(res, 200, {
      frontmatter: parsed.frontmatter,
      linkGroups: parsed.linkGroups,
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
    const parsed = parseLinksSource(source)
    const normalized = serializeLinksFrontmatter(parsed.frontmatter, parsed.content)
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, normalized, 'utf8')

    sendJson(res, 200, {
      r2Key: 'links/index.md',
      frontmatter: parsed.frontmatter,
      linkGroups: parsed.linkGroups,
    })
    return true
  }

  sendJson(res, 405, { message: 'Method not allowed' })
  return true
}
