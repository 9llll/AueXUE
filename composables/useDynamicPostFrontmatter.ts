import type { PostFrontmatter } from '../types/posts'
import { ref } from 'vue'

const dynamicFrontmatter = ref<Partial<PostFrontmatter> | null>(null)

export function useDynamicPostFrontmatter() {
  return dynamicFrontmatter
}

export function setDynamicPostFrontmatter(fm: Partial<PostFrontmatter> | null) {
  dynamicFrontmatter.value = fm
}
