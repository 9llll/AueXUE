import type { Post } from 'valaxy'
import { useSiteConfig } from 'valaxy'
import type { PostListItem } from '../types/posts'
import { fuzzySearchPosts } from '../utils/fuzzySearch'
import { normalizePinOrder } from '../utils/pinOrder'
import { loadDynamicPosts } from './useDynamicPosts'
import { useAllMergedPosts } from './useMergedPostList'

function toPostListItem(post: Post | PostListItem): PostListItem {
  const slug = (post as PostListItem).slug
    || (post.path?.replace(/^\/posts\//, '').replace(/\/$/, '') ?? '')
  return {
    slug,
    title: post.title || '',
    excerpt: post.excerpt,
    date: String(post.date || ''),
    updated: post.updated ? String(post.updated) : undefined,
    categories: post.categories,
    tags: post.tags,
    cover: post.cover,
    path: post.path || `/posts/${slug}`,
    pin_order: (post as PostListItem).pin_order ?? normalizePinOrder(post.top),
    top: post.top,
    hidden: post.hidden,
    draft: post.draft,
  }
}

export function useFuzzyPostSearch() {
  const siteConfig = useSiteConfig()
  const mergedPosts = useAllMergedPosts()

  async function search(keyword: string, limit = 20): Promise<PostListItem[]> {
    await loadDynamicPosts()
    const posts = mergedPosts.value.map(post => toPostListItem(post))
    const fuseOptions = siteConfig.value.fuse?.options || {}
    return fuzzySearchPosts(posts, keyword, fuseOptions, limit)
  }

  return { search }
}
