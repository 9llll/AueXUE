import type { CloudflareEnv } from '../../../types/env'
import {
  deletePost,
  getPostBySlug,
  getPostNeighbors,
  getTaxonomyArchives,
  getTaxonomyCategories,
  getTaxonomyTags,
  listPosts,
  searchPosts,
  upsertPost,
} from '../../../server/posts/service'
import { verifyAdminRequest } from '../../../server/auth/adminSession'
import { isValidPostSlug } from '../../../server/posts/frontmatter'

function json(data: unknown, status = 200, cache: 'list' | 'default' | 'private' = 'default') {
  const cacheControl = status !== 200
    ? 'no-store'
    : cache === 'private'
      ? 'private, no-store'
      : cache === 'list'
        ? 'public, max-age=0, must-revalidate'
        : 'public, max-age=60, stale-while-revalidate=300'

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
    },
  })
}

function unauthorized() {
  return json({ message: '未授权' }, 401)
}

export async function onRequest(context: { request: Request, env: CloudflareEnv, params: { path?: string[] } }) {
  const { request, env, params } = context
  const segments = params.path || []
  const method = request.method
  const url = new URL(request.url)
  const isAdmin = await verifyAdminRequest(request, env)

  try {
    if (segments[0] === 'taxonomy' && method === 'GET') {
      const kind = segments[1]
      if (kind === 'categories')
        return json({ categories: await getTaxonomyCategories(env) })
      if (kind === 'tags')
        return json({ tags: await getTaxonomyTags(env) })
      if (kind === 'archives')
        return json({ months: await getTaxonomyArchives(env) })
      return json({ message: 'Not found' }, 404)
    }

    if (segments.length === 0 && method === 'GET') {
      const result = await listPosts(env, {
        page: Number(url.searchParams.get('page') || 1),
        pageSize: Number(url.searchParams.get('pageSize') || 100),
        category: url.searchParams.get('category') || undefined,
        tag: url.searchParams.get('tag') || undefined,
        month: url.searchParams.get('month') || undefined,
        includeUnpublished: isAdmin,
      })
      return json(result, 200, isAdmin ? 'private' : 'list')
    }

    if (segments[0] === 'search' && method === 'GET') {
      const q = url.searchParams.get('q') || ''
      const posts = await searchPosts(env, q, Number(url.searchParams.get('limit') || 20))
      return json({ posts })
    }

    if (segments[0] === 'neighbors' && segments[1] && method === 'GET') {
      if (!isValidPostSlug(decodeURIComponent(segments[1])))
        return json({ message: '文章 slug 格式无效' }, 400)
      const neighbors = await getPostNeighbors(env, segments[1])
      return json(neighbors, 200, 'list')
    }

    const slug = segments[0]
    if (!slug)
      return json({ message: 'Not found' }, 404)

    if (!isValidPostSlug(decodeURIComponent(slug)))
      return json({ message: '文章 slug 格式无效' }, 400)

    if (method === 'GET') {
      const post = await getPostBySlug(env, slug, {
        includeUnpublished: isAdmin,
        includeSource: isAdmin,
      })
      if (!post)
        return json({ message: '文章不存在' }, 404)
      return json(post, 200, isAdmin ? 'private' : 'default')
    }

    if (!isAdmin)
      return unauthorized()

    if (method === 'PUT') {
      const body = await request.text()
      if (!body.trim())
        return json({ message: '正文不能为空' }, 400)
      const result = await upsertPost(env, slug, body)
      return json({ ok: true, ...result })
    }

    if (method === 'DELETE') {
      const ok = await deletePost(env, slug)
      if (!ok)
        return json({ message: '文章不存在' }, 404)
      return json({ ok: true })
    }

    return json({ message: 'Method not allowed' }, 405)
  }
  catch (error) {
    return json({
      message: error instanceof Error ? error.message : '服务器错误',
    }, 500)
  }
}
