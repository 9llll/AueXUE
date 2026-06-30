import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { isLocalAdminRequest } from '../auth/localAdminApi'
import { isPublished, isValidPostSlug, serializeFrontmatter, splitMarkdown, encodePostPath } from './frontmatter'
import { renderMarkdown, stripMarkdown } from './render'
import {
  buildArchiveMonthsFromPosts,
  buildCategoryTreeFromPosts,
  buildTagCountsFromPosts,
  serializeCategoryTree,
} from './taxonomy'
import { filterPostsByTaxonomy } from '../../utils/taxonomyClient'
import { normalizePinOrder, sortPostsByPinOrder } from '../../utils/pinOrder'
import type { PostFrontmatter, PostListItem } from '../../types/posts'
import { getLocalPostNeighbors } from './neighbors'

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

export function resolveProjectRoot(candidates: string[] = []) {
  const roots = [...candidates, process.cwd()]
  for (const root of roots) {
    if (!root)
      continue
    const resolved = resolve(root)
    if (existsSync(join(resolved, 'content', 'posts')) || existsSync(join(resolved, 'valaxy.config.ts')))
      return resolved
  }
  return resolve(process.cwd())
}

function resolvePostsDir(root: string) {
  const contentDir = join(root, 'content', 'posts')
  if (existsSync(contentDir))
    return contentDir
  return join(root, 'pages', 'posts')
}

function resolveSafePostFilePath(root: string, slug: string) {
  if (!isValidPostSlug(slug))
    return null

  const dir = resolvePostsDir(root)
  const filePath = resolve(join(dir, `${slug}.md`))
  if (!filePath.startsWith(resolve(dir)))
    return null

  return filePath
}

export function loadLocalPosts(root: string, options: { includeUnpublished?: boolean } = {}) {
  const projectRoot = resolveProjectRoot([root])
  const dir = resolvePostsDir(projectRoot)
  if (!existsSync(dir))
    return []

  const posts = readdirSync(dir)
    .filter(name => name.endsWith('.md'))
    .map((name) => {
      const slug = basename(name, '.md')
      const source = readFileSync(join(dir, name), 'utf8')
      const { frontmatter } = splitMarkdown(source)
      return {
        slug,
        title: String(frontmatter.title || slug),
        excerpt: frontmatter.excerpt ? String(frontmatter.excerpt) : undefined,
        date: String(frontmatter.date || ''),
        updated: frontmatter.updated ? String(frontmatter.updated) : undefined,
        categories: frontmatter.categories,
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : frontmatter.tags ? [String(frontmatter.tags)] : undefined,
        cover: frontmatter.cover ? String(frontmatter.cover) : undefined,
        path: encodePostPath(slug),
        pin_order: normalizePinOrder(frontmatter.pin_order ?? frontmatter.top),
        top: frontmatter.top,
        hidden: frontmatter.hidden,
        draft: frontmatter.draft,
        published: isPublished(frontmatter as PostFrontmatter),
      }
    })
    .filter(post => options.includeUnpublished || post.published) as PostListItem[]

  return sortPostsByPinOrder(posts)
}

function listLocalPosts(
  root: string,
  options: {
    includeUnpublished?: boolean
    page?: number
    pageSize?: number
    category?: string
    tag?: string
    month?: string
  } = {},
) {
  const page = Math.max(1, options.page || 1)
  const pageSize = Math.max(1, options.pageSize || 100)
  const all = loadLocalPosts(root, { includeUnpublished: options.includeUnpublished })
  const filtered = filterPostsByTaxonomy(all, {
    category: options.category,
    tag: options.tag,
    month: options.month,
  })
  const offset = (page - 1) * pageSize
  return {
    posts: filtered.slice(offset, offset + pageSize),
    total: filtered.length,
    page,
    pageSize,
  }
}

function upsertLocalPost(root: string, slug: string, source: string) {
  const filePath = resolveSafePostFilePath(resolveProjectRoot([root]), slug)
  if (!filePath)
    throw new Error('文章 slug 格式无效')
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, source, 'utf8')
}

function deleteLocalPost(root: string, slug: string) {
  const filePath = resolveSafePostFilePath(resolveProjectRoot([root]), slug)
  if (!filePath || !existsSync(filePath))
    return false
  unlinkSync(filePath)
  return true
}

export async function handleLocalPostsApi(req: IncomingMessage, res: ServerResponse, root: string) {
  const url = new URL(req.url || '/', 'http://localhost')
  const pathname = url.pathname
  const projectRoot = resolveProjectRoot([root])
  const isAdmin = await isLocalAdminRequest(req)

  if (pathname === '/api/posts/taxonomy/categories' && req.method === 'GET') {
    const posts = loadLocalPosts(projectRoot)
    sendJson(res, 200, {
      categories: serializeCategoryTree(buildCategoryTreeFromPosts(posts)),
    })
    return true
  }

  if (pathname === '/api/posts/taxonomy/tags' && req.method === 'GET') {
    const posts = loadLocalPosts(projectRoot)
    sendJson(res, 200, { tags: buildTagCountsFromPosts(posts) })
    return true
  }

  if (pathname === '/api/posts/taxonomy/archives' && req.method === 'GET') {
    const posts = loadLocalPosts(projectRoot)
    sendJson(res, 200, { months: buildArchiveMonthsFromPosts(posts) })
    return true
  }

  if (pathname === '/api/posts' && req.method === 'GET') {
    const result = listLocalPosts(projectRoot, {
      includeUnpublished: isAdmin,
      page: Number(url.searchParams.get('page') || 1),
      pageSize: Number(url.searchParams.get('pageSize') || 100),
      category: url.searchParams.get('category') || undefined,
      tag: url.searchParams.get('tag') || undefined,
      month: url.searchParams.get('month') || undefined,
    })
    sendJson(res, 200, result)
    return true
  }

  if (pathname === '/api/posts/search' && req.method === 'GET') {
    const q = (url.searchParams.get('q') || '').toLowerCase()
    const posts = loadLocalPosts(projectRoot, { includeUnpublished: isAdmin }).filter((post) => {
      const haystack = [post.title, post.excerpt || '', ...(post.tags || [])].join(' ').toLowerCase()
      return haystack.includes(q)
    })
    sendJson(res, 200, { posts })
    return true
  }

  const neighborsMatch = pathname.match(/^\/api\/posts\/neighbors\/([^/]+)$/)
  if (neighborsMatch && req.method === 'GET') {
    const slug = decodeURIComponent(neighborsMatch[1])
    if (!isValidPostSlug(slug)) {
      sendJson(res, 400, { message: '文章 slug 格式无效' })
      return true
    }
    const posts = loadLocalPosts(projectRoot, { includeUnpublished: isAdmin })
    sendJson(res, 200, getLocalPostNeighbors(posts, slug))
    return true
  }

  const match = pathname.match(/^\/api\/posts\/([^/]+)$/)
  if (match) {
    const slug = decodeURIComponent(match[1])
    if (!isValidPostSlug(slug)) {
      sendJson(res, 400, { message: '文章 slug 格式无效' })
      return true
    }
    const filePath = resolveSafePostFilePath(projectRoot, slug)
    if (!filePath) {
      sendJson(res, 400, { message: '文章 slug 格式无效' })
      return true
    }

    if (req.method === 'GET') {
      if (!existsSync(filePath)) {
        sendJson(res, 404, { message: '文章不存在' })
        return true
      }
      const source = readFileSync(filePath, 'utf8')
      const { frontmatter, content } = splitMarkdown(source)
      if (!isAdmin && !isPublished(frontmatter as PostFrontmatter)) {
        sendJson(res, 404, { message: '文章不存在' })
        return true
      }
      try {
        const html = await renderMarkdown(content)
        const post = loadLocalPosts(projectRoot, { includeUnpublished: isAdmin }).find(item => item.slug === slug)
        sendJson(res, 200, {
          ...post,
          html,
          frontmatter,
          ...(isAdmin ? { source, markdown: content } : {}),
        })
      }
      catch (error) {
        sendJson(res, 500, {
          message: error instanceof Error ? error.message : '渲染文章失败',
        })
      }
      return true
    }

    if (!isAdmin) {
      sendJson(res, 401, { message: '未授权' })
      return true
    }

    if (req.method === 'PUT') {
      const body = await readBody(req)
      if (!body.trim()) {
        sendJson(res, 400, { message: '正文不能为空' })
        return true
      }
      const { frontmatter } = splitMarkdown(body)
      if (!frontmatter.title || !frontmatter.date) {
        sendJson(res, 400, { message: 'frontmatter 必须包含 title 与 date' })
        return true
      }
      upsertLocalPost(projectRoot, slug, body)
      sendJson(res, 200, { ok: true, slug, r2Key: `posts/${slug}.md` })
      return true
    }

    if (req.method === 'DELETE') {
      const ok = deleteLocalPost(projectRoot, slug)
      if (!ok) {
        sendJson(res, 404, { message: '文章不存在' })
        return true
      }
      sendJson(res, 200, { ok: true })
      return true
    }
  }

  return false
}

export { stripMarkdown, serializeFrontmatter, splitMarkdown }
