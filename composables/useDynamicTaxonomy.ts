import type { ArchiveMonthItem, CategoryTreeNode, TagCountItem } from '../types/posts'
import { ref } from 'vue'
import {
  buildArchiveMonthsFromPosts,
  buildCategoryMapFromPosts,
  buildTagMapFromPosts,
  categoryTreeToMap,
  tagCountsToMap,
} from '../utils/taxonomyClient'
import { loadDynamicPosts, useDynamicPostsState } from './useDynamicPosts'

const categories = ref<CategoryTreeNode[]>([])
const tags = ref<TagCountItem[]>([])
const archives = ref<ArchiveMonthItem[]>([])
const loaded = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

export function useDynamicTaxonomyState() {
  return { categories, tags, archives, loaded, loading, error }
}

export function getDynamicTagMap() {
  return tagCountsToMap(tags.value)
}

export function getDynamicCategoryMap() {
  return categoryTreeToMap(categories.value)
}

function categoryMapToTree(map: ReturnType<typeof buildCategoryMapFromPosts>): CategoryTreeNode[] {
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
    .map(([name, node]) => ({
      name,
      total: node.total,
      children: categoryMapToTree(node.children),
    }))
}

function fillTaxonomyFromPosts(
  posts: ReturnType<typeof useDynamicPostsState>['posts']['value'],
  current: {
    categories: CategoryTreeNode[]
    tags: TagCountItem[]
    archives: ArchiveMonthItem[]
  },
) {
  if (!current.tags.length)
    current.tags = [...buildTagMapFromPosts(posts).entries()].map(([name, item]) => ({ name, count: item.count }))
  if (!current.categories.length)
    current.categories = categoryMapToTree(buildCategoryMapFromPosts(posts))
  if (!current.archives.length)
    current.archives = buildArchiveMonthsFromPosts(posts)
}

export async function loadDynamicTaxonomy(force = false) {
  const { categories, tags, archives, loaded, loading, error } = useDynamicTaxonomyState()

  if (loaded.value && !force)
    return { categories: categories.value, tags: tags.value, archives: archives.value }

  loading.value = true
  error.value = null
  try {
    const { fetchTaxonomyArchives, fetchTaxonomyCategories, fetchTaxonomyTags } = await import('../utils/taxonomyApi')
    const [categoryTree, tagList, monthList] = await Promise.all([
      fetchTaxonomyCategories(),
      fetchTaxonomyTags(),
      fetchTaxonomyArchives(),
    ])

    const result = {
      categories: categoryTree,
      tags: tagList,
      archives: monthList,
    }

    if (!tagList.length || !categoryTree.length || !monthList.length) {
      await loadDynamicPosts(force)
      fillTaxonomyFromPosts(useDynamicPostsState().posts.value, result)
    }

    categories.value = result.categories
    tags.value = result.tags
    archives.value = result.archives
    loaded.value = true
    return result
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '加载分类数据失败'
    try {
      await loadDynamicPosts(force)
      const posts = useDynamicPostsState().posts.value
      const result = {
        categories: categoryMapToTree(buildCategoryMapFromPosts(posts)),
        tags: [...buildTagMapFromPosts(posts).entries()].map(([name, item]) => ({ name, count: item.count })),
        archives: buildArchiveMonthsFromPosts(posts),
      }
      categories.value = result.categories
      tags.value = result.tags
      archives.value = result.archives
      loaded.value = true
      return result
    }
    catch {
      return { categories: [], tags: [], archives: [] }
    }
  }
  finally {
    loading.value = false
  }
}
