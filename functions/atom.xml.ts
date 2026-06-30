import type { CloudflareEnv } from '../types/env'
import { listPosts } from '../server/posts/service'
import { siteMeta } from '../shared/site-meta'

function escapeXml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function onRequest(context: { request: Request, env: CloudflareEnv }) {
  const siteUrl = (context.env.SITE_URL || new URL(context.request.url).origin).replace(/\/$/, '')
  const { posts } = await listPosts(context.env, { pageSize: 50 })
  const updated = posts[0]?.updated || posts[0]?.date || new Date().toISOString()

  const items = posts.map((post) => {
    const link = `${siteUrl}${post.path}`
    return `
  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${link}" />
    <id>${link}</id>
    <updated>${escapeXml(post.updated || post.date)}</updated>
    <summary>${escapeXml(post.excerpt || '')}</summary>
  </entry>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(siteMeta.title)}</title>
  <subtitle>${escapeXml(siteMeta.description)}</subtitle>
  <link href="${siteUrl}/" />
  <link href="${siteUrl}/atom.xml" rel="self" />
  <updated>${escapeXml(updated)}</updated>
  <id>${siteUrl}/</id>${items}
</feed>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  })
}
