export const ADMIN_CATEGORY_COLORS = [
  '#e93d6d',
  '#9c36b5',
  '#1971c2',
  '#2f9e44',
  '#f59f00',
  '#fd7e14',
]

export const DEFAULT_POST_COVER = '/default-cover.png'

export function postCoverUrl(cover?: string | null) {
  const value = cover?.trim()
  return value || DEFAULT_POST_COVER
}

export function categoryColor(name: string) {
  let hash = 0
  for (const char of name)
    hash = (hash + char.charCodeAt(0)) | 0
  return ADMIN_CATEGORY_COLORS[Math.abs(hash) % ADMIN_CATEGORY_COLORS.length]
}

export function formatCategories(categories?: string | string[]) {
  if (!categories)
    return []
  if (Array.isArray(categories))
    return categories.filter(Boolean)
  return categories.split('/').filter(Boolean)
}

export function primaryCategory(categories?: string | string[]) {
  const parts = formatCategories(categories)
  return parts[0] || '未分类'
}

export function isDraftPost(post: { draft?: boolean, hidden?: boolean }) {
  return Boolean(post.draft || post.hidden)
}
