import type { PostListItem } from '../types/posts'

export function toValaxyCompatiblePosts(posts: PostListItem[]) {
  return posts.map(post => ({
    ...post,
    path: post.path,
    title: post.title,
    date: post.date,
    updated: post.updated,
    categories: post.categories,
    tags: post.tags,
    excerpt: post.excerpt,
    cover: post.cover,
    lang: 'zh-CN',
    type: 'post',
  }))
}
