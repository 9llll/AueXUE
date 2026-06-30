import type { Plugin } from 'vite'

/**
 * 排除 pages/posts 下的 .md，文章改由 content/posts + R2 动态提供
 */
export function excludePagesPostsMd(): Plugin {
  return {
    name: 'exclude-pages-posts-md',
    enforce: 'pre',
    load(id) {
      if (/pages[\\/]posts[\\/].+\.md($|\?)/.test(id))
        return 'export default {}'
    },
  }
}
