export interface PostFrontmatter {
  title: string
  excerpt?: string
  description?: string
  date: string
  updated?: string
  categories?: string | string[]
  tags?: string[] | string
  cover?: string
  image?: string
  top?: number | boolean
  pin_order?: number
  hidden?: boolean
  draft?: boolean
  [key: string]: unknown
}

export interface PostRecord {
  slug: string
  title: string
  excerpt: string | null
  description: string | null
  date: string
  updated: string | null
  categories: string | null
  tags: string | null
  cover: string | null
  pin_order?: number
  published: number
  r2_key: string
  created_at: string
  updated_at: string
}

export interface PostListItem {
  slug: string
  title: string
  excerpt?: string
  date: string
  updated?: string
  categories?: string | string[]
  tags?: string[]
  cover?: string
  path: string
  top?: number | boolean
  pin_order?: number
  hidden?: boolean
  draft?: boolean
}

export interface PostDetail extends PostListItem {
  html: string
  frontmatter: PostFrontmatter
  description?: string
  /** 完整 Markdown 源码（仅管理员 GET 时返回） */
  source?: string
  /** Markdown 正文（不含 frontmatter，仅管理员 GET 时返回） */
  markdown?: string
}

export interface PostsListResponse {
  posts: PostListItem[]
  total: number
  page: number
  pageSize: number
}

export interface PostNeighborsResponse {
  prev: PostListItem | null
  next: PostListItem | null
}

export interface CategoryTreeNode {
  name: string
  total: number
  children: CategoryTreeNode[]
}

export interface TagCountItem {
  name: string
  count: number
}

export interface ArchiveMonthItem {
  month: string
  count: number
}
