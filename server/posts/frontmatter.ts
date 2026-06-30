import type { PostFrontmatter } from '../../types/posts'

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  let currentKey: string | null = null
  let listItems: string[] | null = null

  function flushList() {
    if (currentKey && listItems)
      result[currentKey] = listItems
    listItems = null
  }

  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    if (!line.trim() || line.trim().startsWith('#'))
      continue

    const listMatch = line.match(/^\s*-\s+(.+)$/)
    if (listMatch && listItems) {
      listItems.push(unquote(listMatch[1].trim()))
      continue
    }

    flushList()

    const kvMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!kvMatch)
      continue

    const key = kvMatch[1]
    const value = kvMatch[2].trim()
    currentKey = key

    if (!value) {
      listItems = []
      continue
    }

    result[key] = parseScalar(value)
  }

  flushList()
  return result
}

function unquote(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith('\'') && value.endsWith('\''))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function parseScalar(value: string) {
  const unquoted = unquote(value)
  if (unquoted === 'true')
    return true
  if (unquoted === 'false')
    return false
  if (/^-?\d+$/.test(unquoted))
    return Number(unquoted)
  return unquoted
}

export function splitMarkdown(source: string) {
  const match = source.match(FRONTMATTER_RE)
  if (!match)
    return { frontmatter: {} as PostFrontmatter, content: source }

  const parsed = parseSimpleYaml(match[1])
  return {
    frontmatter: parsed as PostFrontmatter,
    content: match[2],
  }
}

export function postR2Key(slug: string) {
  return `posts/${slug}.md`
}

export function encodePostPath(slug: string) {
  return `/posts/${encodeURIComponent(slug)}`
}

export function decodePostSlug(pathSegment: string) {
  try {
    return decodeURIComponent(pathSegment)
  }
  catch {
    return pathSegment
  }
}

/** 合法文章 slug：禁止路径分隔符与 ..，避免 R2/本地文件路径穿越 */
export function isValidPostSlug(slug: string) {
  if (!slug || slug.includes('..') || slug.includes('/') || slug.includes('\\'))
    return false
  return /^[a-zA-Z0-9._-]+$/.test(slug)
}

export function normalizeTags(tags: PostFrontmatter['tags']): string[] | undefined {
  if (!tags)
    return undefined
  if (Array.isArray(tags))
    return tags.map(String)
  return [String(tags)]
}

export function normalizeCategories(categories: PostFrontmatter['categories']) {
  return categories
}

export function categoryPathFromFrontmatter(categories: PostFrontmatter['categories']): string {
  if (!categories)
    return 'Uncategorized'
  if (typeof categories === 'string')
    return categories.trim() || 'Uncategorized'
  const parts = categories.map(String).filter(Boolean)
  return parts.length ? parts.join('/') : 'Uncategorized'
}

export function isPublished(fm: PostFrontmatter) {
  if (fm.draft === true || fm.hidden === true)
    return false
  return true
}

export function serializeFrontmatter(fm: PostFrontmatter, content: string) {
  const lines = ['---']
  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined || value === null)
      continue
    if (Array.isArray(value)) {
      lines.push(`${key}:`)
      for (const item of value)
        lines.push(`  - ${item}`)
      continue
    }
    if (typeof value === 'string' && /[:#]/.test(value))
      lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`)
    else
      lines.push(`${key}: ${value}`)
  }
  lines.push('---', '')
  return `${lines.join('\n')}${content}`
}
