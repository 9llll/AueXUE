import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

type IncomingMessageWithBody = IncomingMessage & { body?: unknown }

function attachUnifiedDevApi(server: import('vite').ViteDevServer) {
  const root = server.config.root
  const listeners = server.httpServer?.listeners('request') || []

  server.httpServer?.removeAllListeners('request')
  console.log('[dynamic-posts] 本地 API 已启用: /api/posts /api/links /api/about /api/gallery /api/notice /api/html-files /api/admin → content/')
  server.httpServer?.on('request', (req, res) => {
    const run = async () => {
      const { handleLocalPostsApi } = await import('../server/posts/localDevApi')
      const { handleLocalLinksApi } = await import('../server/links/localDevApi')
      const { handleLocalAboutApi } = await import('../server/about/localDevApi')
      const { handleLocalGalleryApi } = await import('../server/gallery/localDevApi')
      const { handleLocalNoticeApi } = await import('../server/notice/localDevApi')
      const { handleLocalHtmlFilesApi, handleLocalHtmlFileServe } = await import('../server/htmlFiles/localDevApi')
      const { handleLocalAdminApi } = await import('../server/auth/localAdminApi')
      const { handleAlbumWebDavRequest } = await import('./album-webdav-proxy')

      const pathname = (req.url || '').split('?')[0]

      if (pathname.startsWith('/api/admin')) {
        if (await handleLocalAdminApi(req, res))
          return true
      }

      if (pathname.startsWith('/api/posts')) {
        if (await handleLocalPostsApi(req, res, root))
          return true
      }

      if (pathname.startsWith('/api/links')) {
        if (await handleLocalLinksApi(req, res, root))
          return true
      }

      if (pathname.startsWith('/api/about')) {
        if (await handleLocalAboutApi(req, res, root))
          return true
      }

      if (pathname.startsWith('/api/gallery')) {
        if (await handleLocalGalleryApi(req, res, root))
          return true
      }

      if (pathname.startsWith('/api/notice')) {
        if (await handleLocalNoticeApi(req, res, root))
          return true
      }

      if (pathname.startsWith('/api/html-files')) {
        if (await handleLocalHtmlFilesApi(req, res, root))
          return true
      }

      if (await handleLocalHtmlFileServe(req, res, root))
        return true

      if (pathname.startsWith('/api/album-webdav')) {
        await handleAlbumWebDavRequest(req as IncomingMessageWithBody, res)
        return true
      }

      return false
    }

    run().catch((error) => {
      if (!res.headersSent) {
        sendJson(res, 500, {
          message: error instanceof Error ? error.message : '本地 API 失败',
        })
      }
    }).then((handled) => {
      if (handled)
        return

      for (const listener of listeners)
        (listener as (...args: unknown[]) => void).call(server.httpServer, req, res)
    })
  })
}

export function dynamicPostsDevApi(): Plugin {
  return {
    name: 'dynamic-posts-dev-api',
    configureServer(server) {
      return () => {
        if (server.httpServer)
          attachUnifiedDevApi(server)
      }
    },
  }
}
