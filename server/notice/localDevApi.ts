import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { isLocalAdminRequest } from '../auth/localAdminApi'
import { resolveProjectRoot } from '../posts/localDevApi'
import { noticeLocalPath } from './constants'
import { normalizeNoticeBoard, parseNoticePayload } from './normalize'
import type { NoticeBoardDetail } from '../../types/notice'

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

function readLocalNotice(root: string): NoticeBoardDetail | null {
  const filePath = noticeLocalPath(resolveProjectRoot([root]))
  if (!existsSync(filePath))
    return null

  const source = readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(source) as Partial<NoticeBoardDetail>
  const normalized = normalizeNoticeBoard(parsed)
  return {
    ...normalized,
    updatedAt: parsed.updatedAt,
  }
}

function writeLocalNotice(root: string, detail: NoticeBoardDetail) {
  const projectRoot = resolveProjectRoot([root])
  const filePath = noticeLocalPath(projectRoot)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify({
    title: detail.title,
    sections: detail.sections,
    updatedAt: detail.updatedAt || new Date().toISOString(),
  }, null, 2)}\n`, 'utf8')
}

export async function handleLocalNoticeApi(req: IncomingMessage, res: ServerResponse, root: string) {
  const pathname = (req.url || '').split('?')[0]
  if (pathname !== '/api/notice')
    return false

  if (req.method === 'GET') {
    const detail = readLocalNotice(root)
    if (!detail) {
      sendJson(res, 404, { message: '公告栏数据不存在' })
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

    const source = await readBody(req)
    const normalized = parseNoticePayload(source)
    const detail: NoticeBoardDetail = {
      ...normalized,
      updatedAt: new Date().toISOString(),
    }
    writeLocalNotice(root, detail)
    sendJson(res, 200, detail)
    return true
  }

  sendJson(res, 405, { message: 'Method not allowed' })
  return true
}
