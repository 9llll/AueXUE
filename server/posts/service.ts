import type { CloudflareEnv } from '../../types/env'
import type { PostDetail, PostFrontmatter, PostListItem, PostRecord, PostsListResponse } from '../../types/posts'
import {
  decodePostSlug,
  encodePostPath,
  isPublished,
  normalizeCategories,
  normalizeTags,
  postR2Key,
  serializeFrontmatter,
  splitMarkdown,
} from './frontmatter'
import {
  categoryFilterSql,
  listArchiveMonths,
  listCategoryTree,
  listTagCounts,
  monthFilterSql,
  syncPostTaxonomy,
  tagFilterSql,
} from './taxonomy'
import { renderMarkdown, stripMarkdown } from './render'
import { normalizePinOrder, sortPostsByPinOrder } from '../../utils/pinOrder'

function recordToListItem(row: PostRecord): PostListItem {
  const categories = row.categories ? JSON.parse(row.categories) : undefined
  const tags = row.tags ? JSON.parse(row.tags) : undefined
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || undefined,
    date: row.date,
    updated: row.updated || undefined,
    categories,
    tags,
    cover: row.cover || undefined,
    path: encodePostPath(row.slug),
    pin_order: row.pin_order ?? 0,
  }
}

function sortPosts(posts: PostListItem[]) {
  return sortPostsByPinOrder(posts)
}

export async function listPosts(
  env: CloudflareEnv,
  options: {
    page?: number
    pageSize?: number
    category?: string
    tag?: string
    month?: string
    includeUnpublished?: boolean
  } = {},
): Promise<PostsListResponse> {
  const page = Math.max(1, options.page || 1)
  const pageSize = Math.min(200, Math.max(1, options.pageSize || 100))

  const joins: string[] = []
  const conditions: string[] = []
  const binds: unknown[] = []

  if (!options.includeUnpublished)
    conditions.push('p.published = 1')

  if (options.category) {
    const filter = categoryFilterSql(options.category)
    joins.push(filter.join)
    conditions.push(filter.where)
    binds.push(...filter.binds)
  }

  if (options.tag) {
    const filter = tagFilterSql(options.tag)
    joins.push(filter.join)
    conditions.push(filter.where)
    binds.push(filter.binds[0])
  }

  if (options.month) {
    const filter = monthFilterSql(options.month)
    if (filter.join)
      joins.push(filter.join)
    conditions.push(filter.where)
    binds.push(filter.binds[0])
  }

  const joinSql = [...new Set(joins)].join('\n')
  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRow = await env.DB.prepare(`
    SELECT COUNT(DISTINCT p.slug) AS total
    FROM posts p
    ${joinSql}
    ${whereSql}
  `).bind(...binds).first<{ total: number }>()

  const total = countRow?.total || 0
  const offset = (page - 1) * pageSize

  const { results } = await env.DB.prepare(`
    SELECT DISTINCT p.*
    FROM posts p
    ${joinSql}
    ${whereSql}
    ORDER BY p.pin_order DESC, p.date DESC
    LIMIT ? OFFSET ?
  `).bind(...binds, pageSize, offset).all<PostRecord>()

  return {
    posts: sortPosts((results || []).map(recordToListItem)),
    total,
    page,
    pageSize,
  }
}

export async function getTaxonomyCategories(env: CloudflareEnv) {
  return listCategoryTree(env)
}

export async function getTaxonomyTags(env: CloudflareEnv) {
  return listTagCounts(env)
}

export async function getTaxonomyArchives(env: CloudflareEnv) {
  return listArchiveMonths(env)
}

export async function getPostNeighbors(env: CloudflareEnv, slug: string) {
  const decoded = decodePostSlug(slug)
  const { results } = await env.DB.prepare(`
    SELECT slug FROM posts WHERE published = 1 ORDER BY pin_order DESC, date DESC
  `).all<{ slug: string }>()

  const slugs = (results || []).map(row => row.slug)
  const index = slugs.indexOf(decoded)
  if (index === -1)
    return { prev: null, next: null }

  const prevSlug = index > 0 ? slugs[index - 1] : null
  const nextSlug = index < slugs.length - 1 ? slugs[index + 1] : null

  const prevRow = prevSlug
    ? await env.DB.prepare('SELECT * FROM posts WHERE slug = ?').bind(prevSlug).first<PostRecord>()
    : null
  const nextRow = nextSlug
    ? await env.DB.prepare('SELECT * FROM posts WHERE slug = ?').bind(nextSlug).first<PostRecord>()
    : null

  return {
    prev: prevRow ? recordToListItem(prevRow) : null,
    next: nextRow ? recordToListItem(nextRow) : null,
  }
}

export async function getPostBySlug(
  env: CloudflareEnv,
  slug: string,
  options: { includeUnpublished?: boolean, includeSource?: boolean } = {},
): Promise<PostDetail | null> {
  const decoded = decodePostSlug(slug)
  const row = await env.DB.prepare('SELECT * FROM posts WHERE slug = ?').bind(decoded).first<PostRecord>()
  if (!row)
    return null
  if (!options.includeUnpublished && row.published !== 1)
    return null

  const object = await env.BUCKET.get(row.r2_key)
  if (!object)
    return null

  const source = await object.text()
  const { frontmatter, content } = splitMarkdown(source)
  const html = await renderMarkdown(content)

  const listItem = recordToListItem(row)
  return {
    ...listItem,
    html,
    frontmatter,
    description: row.description || row.excerpt || undefined,
    ...(options.includeSource
      ? { source, markdown: content }
      : {}),
  }
}

export async function searchPosts(
  env: CloudflareEnv,
  keyword: string,
  limit = 20,
): Promise<PostListItem[]> {
  const q = keyword.trim()
  if (!q)
    return []

  const { results } = await env.DB.prepare(`
    SELECT p.* FROM posts_fts f
    JOIN posts p ON p.slug = f.slug
    WHERE posts_fts MATCH ? AND p.published = 1
    ORDER BY rank
    LIMIT ?
  `).bind(q, limit).all<PostRecord>()

  return sortPosts((results || []).map(recordToListItem))
}

export async function upsertPost(
  env: CloudflareEnv,
  slug: string,
  source: string,
) {
  const decoded = decodePostSlug(slug)
  const { frontmatter, content } = splitMarkdown(source)
  if (!frontmatter.title || !frontmatter.date)
    throw new Error('文章 frontmatter 必须包含 title 与 date')

  const published = isPublished(frontmatter) ? 1 : 0
  const r2Key = postR2Key(decoded)
  const categories = normalizeCategories(frontmatter.categories)
  const tags = normalizeTags(frontmatter.tags)
  const plain = stripMarkdown(content)
  const pinOrder = normalizePinOrder(frontmatter.pin_order ?? frontmatter.top)

  await env.BUCKET.put(r2Key, source, {
    httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
  })

  await env.DB.prepare(`
    INSERT INTO posts (
      slug, title, excerpt, description, date, updated, categories, tags, cover, pin_order, published, r2_key, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      excerpt = excluded.excerpt,
      description = excluded.description,
      date = excluded.date,
      updated = excluded.updated,
      categories = excluded.categories,
      tags = excluded.tags,
      cover = excluded.cover,
      pin_order = excluded.pin_order,
      published = excluded.published,
      r2_key = excluded.r2_key,
      updated_at = datetime('now')
  `).bind(
    decoded,
    String(frontmatter.title),
    frontmatter.excerpt ? String(frontmatter.excerpt) : null,
    frontmatter.description ? String(frontmatter.description) : null,
    String(frontmatter.date),
    frontmatter.updated ? String(frontmatter.updated) : null,
    categories ? JSON.stringify(categories) : null,
    tags ? JSON.stringify(tags) : null,
    frontmatter.cover ? String(frontmatter.cover) : null,
    pinOrder,
    published,
    r2Key,
  ).run()

  await env.DB.prepare('DELETE FROM posts_fts WHERE slug = ?').bind(decoded).run()
  await env.DB.prepare(`
    INSERT INTO posts_fts (slug, title, excerpt, content)
    VALUES (?, ?, ?, ?)
  `).bind(
    decoded,
    String(frontmatter.title),
    frontmatter.excerpt ? String(frontmatter.excerpt) : '',
    plain,
  ).run()

  await syncPostTaxonomy(env, decoded, frontmatter)

  return { slug: decoded, r2Key }
}

export async function deletePost(env: CloudflareEnv, slug: string) {
  const decoded = decodePostSlug(slug)
  const row = await env.DB.prepare('SELECT r2_key FROM posts WHERE slug = ?').bind(decoded).first<{ r2_key: string }>()
  if (!row)
    return false

  await env.BUCKET.delete(row.r2_key)
  await env.DB.prepare('DELETE FROM posts WHERE slug = ?').bind(decoded).run()
  await env.DB.prepare('DELETE FROM posts_fts WHERE slug = ?').bind(decoded).run()
  return true
}

export function buildPostSource(frontmatter: PostFrontmatter, content: string) {
  return serializeFrontmatter(frontmatter, content)
}

export async function importPostFromFile(
  env: CloudflareEnv,
  slug: string,
  source: string,
) {
  return upsertPost(env, slug, source)
}
