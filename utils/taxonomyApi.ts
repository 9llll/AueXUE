import type { ArchiveMonthItem, CategoryTreeNode, TagCountItem } from '../types/posts'

export async function fetchTaxonomyCategories() {
  const response = await fetch('/api/posts/taxonomy/categories')
  if (!response.ok)
    throw new Error(`加载分类失败 (${response.status})`)
  const data = await response.json() as { categories: CategoryTreeNode[] }
  return data.categories
}

export async function fetchTaxonomyTags() {
  const response = await fetch('/api/posts/taxonomy/tags')
  if (!response.ok)
    throw new Error(`加载标签失败 (${response.status})`)
  const data = await response.json() as { tags: TagCountItem[] }
  return data.tags
}

export async function fetchTaxonomyArchives() {
  const response = await fetch('/api/posts/taxonomy/archives')
  if (!response.ok)
    throw new Error(`加载归档统计失败 (${response.status})`)
  const data = await response.json() as { months: ArchiveMonthItem[] }
  return data.months
}
