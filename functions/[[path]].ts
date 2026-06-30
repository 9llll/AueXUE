import type { CloudflareEnv } from '../types/env'
import { serveHtmlFileByPath } from '../server/htmlFiles/service'

export async function onRequest(context: { request: Request, env: CloudflareEnv }) {
  const { request, env } = context
  const url = new URL(request.url)

  if (request.method !== 'GET')
    return new Response('Method Not Allowed', { status: 405 })

  try {
    const response = await serveHtmlFileByPath(env, url.pathname)
    if (response)
      return response
  }
  catch {
    // fall through to 404
  }

  return new Response('Not Found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
