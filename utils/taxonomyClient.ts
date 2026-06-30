import type { PostListItem } from '../types/posts'
import type { CategoryTreeNode } from '../server/posts/taxonomy'

export interface ValaxyCategoryItem {
  name: string
  total: number
  children: Map<string, ValaxyCategoryItem>
}

export function categoryTreeToMap(nodes: CategoryTreeNode[]): Map<string, ValaxyCategoryItem> {
  const map = new Map<string, ValaxyCategoryItem>()
  for (const node of nodes) {
    map.set(node.name, {
      name: node.name,
      total: node.total,
      children: categoryTreeToMap(node.children),
    })
  }
  return map
}

export function tagCountsToMap(tags: { name: string, count: number }[]) {
  const map = new Map<string, { count: number }>()
  for (const tag of tags)
    map.set(tag.name, { count: tag.count })
  return map
}

export function buildTagMapFromPosts(posts: PostListItem[]) {
  const tags = new Map<string, { count: number }>()
  for (const post of posts) {
    for (const tag of post.tags || [])
      tags.set(tag, { count: (tags.get(tag)?.count || 0) + 1 })
  }
  return tags
}

export function buildCategoryMapFromPosts(posts: PostListItem[]) {
  const root = new Map<string, ValaxyCategoryItem>()

  function ensure(parent: Map<string, ValaxyCategoryItem>, name: string) {
    const existing = parent.get(name)
    if (existing)
      return existing
    const node: ValaxyCategoryItem = { name, total: 0, children: new Map() }
    parent.set(name, node)
    return node
  }

  for (const post of posts) {
    const parts = !post.categories
      ? ['Uncategorized']
      : typeof post.categories === 'string'
        ? post.categories.split('/').filter(Boolean)
        : post.categories

    let current = root
    for (const part of parts) {
      const node = ensure(current, part)
      node.total += 1
      current = node.children
    }
  }

  return root
}

export function buildArchiveMonthsFromPosts(posts: PostListItem[]) {
  const months = new Map<string, number>()
  for (const post of posts) {
    if (!post.date)
      continue
    const month = post.date.slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(month))
      continue
    months.set(month, (months.get(month) || 0) + 1)
  }
  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, count]) => ({ month, count }))
}

export function filterPostsByTaxonomy(
  posts: PostListItem[],
  options: { category?: string, tag?: string, month?: string },
) {
  let filtered = posts

  if (options.category) {
    filtered = filtered.filter((post) => {
      const path = !post.categories
        ? 'Uncategorized'
        : typeof post.categories === 'string'
          ? post.categories
          : post.categories.join('/')

      if (options.category === 'Uncategorized')
        return path === 'Uncategorized'
      return path === options.category || path.startsWith(`${options.category}/`)
    })
  }

  if (options.tag)
    filtered = filtered.filter(post => post.tags?.includes(options.tag!))

  if (options.month)
    filtered = filtered.filter(post => post.date?.startsWith(options.month!))

  return filtered
}
