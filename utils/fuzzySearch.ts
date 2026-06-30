import Fuse from 'fuse.js'
import type { IFuseOptions } from 'fuse.js'
import type { PostListItem } from '../types/posts'

export interface FuzzySearchOptions {
  keys?: string[]
  threshold?: number
  ignoreLocation?: boolean
}

const DEFAULT_KEYS = ['title', 'tags', 'categories', 'excerpt']

export function fuzzySearchPosts(
  posts: PostListItem[],
  keyword: string,
  options: FuzzySearchOptions = {},
  limit = 20,
): PostListItem[] {
  const q = keyword.trim()
  if (!q)
    return []

  const fuseOptions: IFuseOptions<PostListItem> = {
    keys: options.keys?.length ? options.keys : DEFAULT_KEYS,
    threshold: options.threshold ?? 0.4,
    ignoreLocation: options.ignoreLocation ?? true,
    includeScore: true,
    findAllMatches: true,
  }

  const fuse = new Fuse(posts, fuseOptions)
  return fuse.search(q, { limit }).map(result => result.item)
}
