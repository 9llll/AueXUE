import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { handleAlbumWebDavFile, handleAlbumWebDavList } from '../server/albumWebdav'
import { loadAlbumWebDavEnv } from '../server/albumWebdavEnv'

type IncomingMessageWithBody = IncomingMessage & { body?: unknown }

function readJsonBody(req: IncomingMessageWithBody): Promise<any> {
  if (req.body !== undefined && req.body !== null)
    return Promise.resolve(req.body)

  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      resolve({})
      return
    }

    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      }
      catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function parseAccessQuery(params: URLSearchParams) {
  return {
    encrypted: params.get('encrypted') || undefined,
    albumPassword: params.get('albumPassword') || undefined,
    accessPassword: params.get('accessPassword') || undefined,
  }
}

export async function handleAlbumWebDavRequest(req: IncomingMessageWithBody, res: ServerResponse) {
  const pathname = (req.url || '').split('?')[0]

  if (pathname === '/api/album-webdav/file') {
    const parsed = new URL(req.url || '', 'http://localhost')
    const slug = parsed.searchParams.get('slug') || ''
    const target = parsed.searchParams.get('url')
    const access = parseAccessQuery(parsed.searchParams)

    if (!slug) {
      sendJson(res, 400, { message: '缺少相册标识' })
      return
    }

    if (!target) {
      sendJson(res, 400, { message: '缺少媒体地址' })
      return
    }

    const range = typeof req.headers.range === 'string' ? req.headers.range : undefined
    const file = await handleAlbumWebDavFile(slug, target, access, range)
    res.statusCode = file.status
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    if (file.contentRange)
      res.setHeader('Content-Range', file.contentRange)
    if (file.contentLength)
      res.setHeader('Content-Length', file.contentLength)
    res.end(file.buffer)
    return
  }

  if (pathname === '/api/album-webdav/list' && (req.method === 'GET' || req.method === 'POST')) {
    let body: Record<string, string | undefined> = {}

    if (req.method === 'GET') {
      const parsed = new URL(req.url || '', 'http://localhost')
      body = {
        slug: parsed.searchParams.get('slug') || undefined,
        encrypted: parsed.searchParams.get('encrypted') || undefined,
        albumPassword: parsed.searchParams.get('albumPassword') || undefined,
        accessPassword: parsed.searchParams.get('accessPassword') || undefined,
      }
    }
    else {
      body = await readJsonBody(req)
    }

    const result = await handleAlbumWebDavList({
      slug: body.slug || '',
      encrypted: body.encrypted,
      albumPassword: body.albumPassword,
      accessPassword: body.accessPassword,
    })
    sendJson(res, 200, result)
    return
  }

  sendJson(res, 404, { message: 'Not found' })
}

export function albumWebdavProxy(): Plugin {
  return {
    name: 'album-webdav-proxy',
    configureServer(server) {
      loadAlbumWebDavEnv(process.cwd())
      loadAlbumWebDavEnv(server.config.root)
    },
  }
}
