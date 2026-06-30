<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { PostListItem } from '../../types/posts'
import { deleteAdminPost } from '../../utils/adminPostsApi'
import {
  categoryColor,
  formatCategories,
  postCoverUrl,
  primaryCategory,
} from '../../utils/adminPostDisplay'
import { normalizePinOrder, comparePostsByPinAndDate } from '../../utils/pinOrder'

const props = defineProps<{
  posts: PostListItem[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  refresh: []
}>()

const searchQuery = ref('')
const categoryFilter = ref('all')
const page = ref(1)
const pageSize = ref(10)
const sortDesc = ref(true)
const deletingSlug = ref<string | null>(null)
const openMenuSlug = ref<string | null>(null)
const menuPosition = ref<{ top: string; left: string } | null>(null)
const shareCopiedSlug = ref<string | null>(null)
let shareCopiedTimer: ReturnType<typeof setTimeout> | undefined

const categoryOptions = computed(() => {
  const set = new Set<string>()
  for (const post of props.posts) {
    for (const cat of formatCategories(post.categories))
      set.add(cat)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const filteredPosts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let list = [...props.posts]

  if (q)
    list = list.filter(post =>
      post.title.toLowerCase().includes(q)
      || (post.excerpt || '').toLowerCase().includes(q)
      || post.slug.toLowerCase().includes(q),
    )

  if (categoryFilter.value !== 'all')
    list = list.filter(post => formatCategories(post.categories).includes(categoryFilter.value))

  list.sort((a, b) => comparePostsByPinAndDate(a, b, sortDesc.value))

  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredPosts.value.length / pageSize.value)))

const paginatedPosts = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredPosts.value.slice(start, start + pageSize.value)
})

const openMenuPost = computed(() => {
  if (!openMenuSlug.value)
    return null
  return paginatedPosts.value.find(post => post.slug === openMenuSlug.value) ?? null
})

watch([searchQuery, categoryFilter, pageSize], () => {
  page.value = 1
})

watch(totalPages, (total) => {
  if (page.value > total)
    page.value = total
})

function postPinOrder(post: PostListItem) {
  return normalizePinOrder(post.pin_order ?? post.top)
}

function resetFilters() {
  searchQuery.value = ''
  categoryFilter.value = 'all'
  page.value = 1
}

function toggleSort() {
  sortDesc.value = !sortDesc.value
}

function formatDateTime(date?: string) {
  if (!date)
    return '—'
  const normalized = date.includes('T') ? date : date.replace(' ', 'T')
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime()))
    return date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

async function handleDelete(post: PostListItem) {
  closeMenu()
  if (!window.confirm(`确定删除文章「${post.title}」？此操作不可恢复。`))
    return

  deletingSlug.value = post.slug
  try {
    await deleteAdminPost(post.slug)
    emit('refresh')
  }
  catch (err) {
    window.alert(err instanceof Error ? err.message : '删除失败')
  }
  finally {
    deletingSlug.value = null
  }
}

function positionMenu(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect()
  const menuWidth = 128
  const left = Math.min(
    Math.max(8, rect.right - menuWidth),
    window.innerWidth - menuWidth - 8,
  )
  menuPosition.value = {
    top: `${rect.bottom + 4}px`,
    left: `${left}px`,
  }
}

function toggleMenu(slug: string, event: MouseEvent) {
  if (openMenuSlug.value === slug) {
    closeMenu()
    return
  }
  openMenuSlug.value = slug
  positionMenu(event.currentTarget as HTMLElement)
}

function closeMenu() {
  openMenuSlug.value = null
  menuPosition.value = null
}

function getPostPublicUrl(path: string) {
  if (path.startsWith('http'))
    return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

async function sharePost(post: PostListItem) {
  const url = getPostPublicUrl(post.path)
  try {
    await navigator.clipboard.writeText(url)
    shareCopiedSlug.value = post.slug
    if (shareCopiedTimer)
      clearTimeout(shareCopiedTimer)
    shareCopiedTimer = setTimeout(() => {
      shareCopiedSlug.value = null
    }, 2000)
  }
  catch {
    window.prompt('复制以下链接', url)
  }
  closeMenu()
}

function onDocumentClick(event: MouseEvent) {
  if (!openMenuSlug.value)
    return
  const target = event.target as HTMLElement
  if (!target.closest('.admin-posts__menu') && !target.closest('.admin-posts__menu-dropdown'))
    closeMenu()
}

function onWindowScroll() {
  if (openMenuSlug.value)
    closeMenu()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('scroll', onWindowScroll, true)
  window.addEventListener('resize', onWindowScroll)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('scroll', onWindowScroll, true)
  window.removeEventListener('resize', onWindowScroll)
  if (shareCopiedTimer)
    clearTimeout(shareCopiedTimer)
})
</script>

<template>
  <div class="admin-posts">
    <div class="admin-posts__card">
      <div class="admin-posts__filters">
        <label class="admin-posts__search">
          <span class="i-mdi-magnify" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="搜索文章标题…"
          >
        </label>

        <select v-model="categoryFilter" class="admin-posts__select">
          <option value="all">
            所有分类
          </option>
          <option v-for="cat in categoryOptions" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>

        <button type="button" class="admin-posts__reset" @click="resetFilters">
          <span class="i-mdi-refresh" aria-hidden="true" />
          重置
        </button>

        <button type="button" class="admin-posts__sort-mobile" @click="toggleSort">
          发布时间
          <span :class="sortDesc ? 'i-mdi-arrow-down' : 'i-mdi-arrow-up'" aria-hidden="true" />
        </button>

        <RouterLink to="/admin/new" class="admin-posts__create">
          <span class="i-mdi-plus" aria-hidden="true" />
          新建
        </RouterLink>
      </div>

      <p v-if="error" class="admin-posts__error">
        {{ error }}
      </p>
      <p v-else-if="loading" class="admin-posts__hint">
        正在加载文章列表…
      </p>

      <div v-else class="admin-posts__body">
        <div class="admin-posts__table-wrap">
          <table class="admin-posts__table">
          <colgroup>
            <col class="admin-posts__col-article">
            <col class="admin-posts__col-category">
            <col class="admin-posts__col-spacer">
            <col class="admin-posts__col-date">
            <col class="admin-posts__col-spacer">
            <col class="admin-posts__col-actions">
          </colgroup>
          <thead>
            <tr>
              <th class="admin-posts__article-cell">文章</th>
              <th class="admin-posts__category-cell">分类</th>
              <th class="admin-posts__spacer" aria-hidden="true" />
              <th class="admin-posts__date admin-posts__th-sort" @click="toggleSort">
                发布时间
                <span :class="sortDesc ? 'i-mdi-arrow-down' : 'i-mdi-arrow-up'" aria-hidden="true" />
              </th>
              <th class="admin-posts__spacer" aria-hidden="true" />
              <th class="admin-posts__actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="post in paginatedPosts" :key="post.slug">
              <td class="admin-posts__article-cell">
                <div class="admin-posts__article">
                  <div class="admin-posts__cover">
                    <img :src="postCoverUrl(post.cover)" alt="" loading="lazy">
                  </div>
                  <div class="admin-posts__article-meta">
                    <div class="admin-posts__article-title">
                      <span v-if="postPinOrder(post) > 0" class="admin-posts__pin">置顶 {{ postPinOrder(post) }}</span>
                      {{ post.title }}
                    </div>
                    <div class="admin-posts__article-excerpt">
                      {{ post.excerpt || '暂无摘要' }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="admin-posts__category-cell">
                <span
                  class="admin-posts__tag"
                  :style="{
                    color: categoryColor(primaryCategory(post.categories)),
                    backgroundColor: `${categoryColor(primaryCategory(post.categories))}18`,
                  }"
                >
                  {{ primaryCategory(post.categories) }}
                </span>
              </td>
              <td class="admin-posts__spacer" aria-hidden="true" />
              <td class="admin-posts__date">
                {{ formatDateTime(post.date) }}
              </td>
              <td class="admin-posts__spacer" aria-hidden="true" />
              <td class="admin-posts__actions">
                <div
                  class="admin-posts__menu"
                  :class="{ 'is-open': openMenuSlug === post.slug }"
                >
                  <button
                    type="button"
                    class="admin-posts__menu-trigger"
                    :aria-expanded="openMenuSlug === post.slug"
                    aria-label="更多操作"
                    @click.stop="toggleMenu(post.slug, $event)"
                  >
                    <span class="i-mdi-dots-vertical" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        <div class="admin-posts__mobile-list">
        <article
          v-for="post in paginatedPosts"
          :key="`mobile-${post.slug}`"
          class="admin-posts__mobile-item"
        >
          <div class="admin-posts__mobile-main">
            <div class="admin-posts__cover">
              <img :src="postCoverUrl(post.cover)" alt="" loading="lazy">
            </div>
            <div class="admin-posts__article-meta">
              <div class="admin-posts__article-title">
                <span v-if="postPinOrder(post) > 0" class="admin-posts__pin">置顶 {{ postPinOrder(post) }}</span>
                {{ post.title }}
              </div>
              <div class="admin-posts__article-excerpt">
                {{ post.excerpt || '暂无摘要' }}
              </div>
            </div>
            <div
              class="admin-posts__menu"
              :class="{ 'is-open': openMenuSlug === post.slug }"
            >
              <button
                type="button"
                class="admin-posts__menu-trigger"
                :aria-expanded="openMenuSlug === post.slug"
                aria-label="更多操作"
                @click.stop="toggleMenu(post.slug, $event)"
              >
                <span class="i-mdi-dots-vertical" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div class="admin-posts__mobile-meta">
            <span
              class="admin-posts__tag"
              :style="{
                color: categoryColor(primaryCategory(post.categories)),
                backgroundColor: `${categoryColor(primaryCategory(post.categories))}18`,
              }"
            >
              {{ primaryCategory(post.categories) }}
            </span>
            <time class="admin-posts__mobile-date">{{ formatDateTime(post.date) }}</time>
          </div>
        </article>
        </div>

        <p v-if="!paginatedPosts.length" class="admin-posts__hint">
          暂无符合条件的文章
        </p>
      </div>

      <div v-if="!loading && !error" class="admin-posts__footer">
        <span>共 {{ filteredPosts.length }} 条</span>
        <div class="admin-posts__pagination">
          <button type="button" :disabled="page <= 1" @click="page -= 1">
            上一页
          </button>
          <span class="admin-posts__page-num">{{ page }}</span>
          <button type="button" :disabled="page >= totalPages" @click="page += 1">
            下一页
          </button>
          <select v-model.number="pageSize" class="admin-posts__page-size">
            <option :value="10">
              10 条/页
            </option>
            <option :value="20">
              20 条/页
            </option>
            <option :value="50">
              50 条/页
            </option>
          </select>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="openMenuPost && menuPosition"
        class="admin-posts__menu-dropdown"
        :style="menuPosition"
        @click.stop
      >
        <RouterLink
          :to="`/admin/edit/${encodeURIComponent(openMenuPost.slug)}`"
          class="admin-posts__menu-item"
          @click="closeMenu"
        >
          编辑
        </RouterLink>
        <a
          :href="openMenuPost.path"
          target="_blank"
          rel="noopener noreferrer"
          class="admin-posts__menu-item"
          @click="closeMenu"
        >
          查看
        </a>
        <button
          type="button"
          class="admin-posts__menu-item"
          @click="sharePost(openMenuPost)"
        >
          {{ shareCopiedSlug === openMenuPost.slug ? '已复制链接' : '分享' }}
        </button>
        <button
          type="button"
          class="admin-posts__menu-item admin-posts__menu-item--danger"
          :disabled="deletingSlug === openMenuPost.slug"
          @click="handleDelete(openMenuPost)"
        >
          {{ deletingSlug === openMenuPost.slug ? '删除中…' : '删除' }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.admin-posts {
  --admin-pink: #e93d6d;
  --admin-border: 1px solid #000;
  --admin-border-color: #000;

  &__card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgb(0 0 0 / 6%);
    border: var(--admin-border);
  }

  &__filters {
    --admin-filter-height: 2rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
  }

  &__create {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    box-sizing: border-box;
    height: var(--admin-filter-height);
    margin-left: auto;
    padding: 0 1rem;
    border-radius: 8px;
    background: var(--admin-pink);
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.2s ease, transform 0.15s ease;

    span {
      width: 1.1rem;
      height: 1.1rem;
    }

    &:hover {
      background: #d73563;
    }

    &:active {
      transform: scale(0.98);
    }
  }

  &__search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-sizing: border-box;
    height: var(--admin-filter-height);
    flex: 1;
    min-width: 200px;
    max-width: 320px;
    padding: 0 0.75rem;
    border: var(--admin-border);
    border-radius: 8px;
    background: #fafafa;

    span {
      width: 1.1rem;
      height: 1.1rem;
      color: #aaa;
      flex-shrink: 0;
    }

    input {
      flex: 1;
      min-width: 0;
      height: 100%;
      padding: 0;
      border: none;
      background: transparent;
      font-size: 0.875rem;
      line-height: 1;
      outline: none;
    }
  }

  &__select {
    box-sizing: border-box;
    height: var(--admin-filter-height);
    padding: 0 0.75rem;
    border: var(--admin-border);
    border-radius: 8px;
    background: #fff;
    font-size: 0.875rem;
    line-height: 1;
    color: #555;
    cursor: pointer;
  }

  &__reset {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    box-sizing: border-box;
    height: var(--admin-filter-height);
    padding: 0 0.85rem;
    border: var(--admin-border);
    border-radius: 8px;
    background: #fff;
    color: #666;
    font-size: 0.875rem;
    line-height: 1;
    cursor: pointer;

    span {
      width: 1rem;
      height: 1rem;
    }

    &:hover {
      border-color: var(--admin-border-color);
      color: #333;
    }
  }

  &__error {
    padding: 1rem 1.25rem;
    color: #c0392b;
    font-size: 0.875rem;
  }

  &__hint {
    padding: 2.5rem 1.25rem;
    text-align: center;
    color: #999;
    font-size: 0.9375rem;
  }

  &__table-wrap {
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: 0.875rem;

    th,
    td {
      padding: 0.9rem 1.25rem;
      text-align: left;
      vertical-align: middle;
    }

    th {
      color: #888;
      font-weight: 600;
      font-size: 0.8125rem;
      background: #fafafa;
    }

    td {
      border-bottom: none;
    }

    tbody tr:hover {
      background: #fafbfc;
    }
  }

  &__th-sort {
    cursor: pointer;
    user-select: none;

    span {
      display: inline-block;
      width: 0.9rem;
      height: 0.9rem;
      margin-left: 0.15rem;
      vertical-align: -2px;
    }
  }

  &__col-article {
    width: 38%;
  }

  &__col-category {
    width: 88px;
  }

  &__col-date {
    width: 160px;
  }

  &__col-actions {
    width: 56px;
  }

  &__article-cell {
    width: 38%;
    overflow: hidden;
    padding-right: 0.75rem;
  }

  &__category-cell {
    width: 88px;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    white-space: nowrap;
  }

  &__spacer {
    width: auto;
    padding: 0;
  }

  &__table tbody tr:hover td.admin-posts__spacer {
    background: #fafbfc;
  }

  &__date {
    width: 160px;
    padding-left: 0.35rem;
    padding-right: 0.35rem;
    color: #666;
    text-align: center;
    white-space: nowrap;
  }

  &__actions {
    position: sticky;
    right: 0.75rem;
    z-index: 1;
    width: 56px;
    min-width: 56px;
    padding-left: 0.25rem;
    padding-right: 0.75rem;
    text-align: center;
    white-space: nowrap;
    background: #fff;
  }

  &__table th.admin-posts__actions {
    z-index: 2;
    background: #fafafa;
  }

  &__table tbody tr:hover td.admin-posts__actions {
    background: #fafbfc;
  }

  &__article {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    min-width: 0;
  }

  &__cover {
    flex-shrink: 0;
    width: 72px;
    height: 48px;
    border-radius: 8px;
    overflow: hidden;
    background: #f0f0f3;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #bbb;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    span {
      width: 1.5rem;
      height: 1.5rem;
    }
  }

  &__article-meta {
    flex: 1 1 0%;
    min-width: 0;
    overflow: hidden;
  }

  &__article-title {
    font-weight: 600;
    color: #222;
    line-height: 1.4;
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__pin {
    display: inline-block;
    margin-right: 0.35rem;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    background: rgb(233 61 109 / 12%);
    color: var(--admin-pink);
    font-size: 0.6875rem;
    font-weight: 600;
    vertical-align: middle;
  }

  &__article-excerpt {
    font-size: 0.8125rem;
    color: #999;
    line-height: 1.45;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__tag {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  &__menu {
    position: relative;
    display: inline-flex;
    justify-content: center;
  }

  &__menu-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #666;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;

    span {
      width: 1.25rem;
      height: 1.25rem;
    }

    &:hover {
      background: #f0f0f3;
      color: #333;
    }
  }

  &__menu.is-open &__menu-trigger {
    background: #f0f0f3;
    color: var(--admin-pink);
  }

  &__menu-dropdown {
    --admin-pink: #e93d6d;
    position: fixed;
    z-index: 1200;
    min-width: 120px;
    padding: 0.35rem;
    border: var(--admin-border);
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
  }

  &__menu-item {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #444;
    font-size: 0.8125rem;
    font-weight: 500;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;

    &:link,
    &:visited {
      color: #444;
    }

    &:hover {
      background: rgb(233 61 109 / 12%);
      color: #e93d6d;
    }

    &--danger {
      color: #e03131;

      &:link,
      &:visited {
        color: #e03131;
      }

      &:hover:not(:disabled) {
        background: rgb(224 49 49 / 12%);
        color: #c92a2a;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 1.25rem;
    font-size: 0.8125rem;
    color: #888;
  }

  &__pagination {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      height: 2rem;
      padding: 0 0.65rem;
      border: var(--admin-border);
      border-radius: 6px;
      background: #fff;
      color: #555;
      font-size: 0.8125rem;
      line-height: 1;
      cursor: pointer;

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }
  }

  &__page-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.35rem;
    border-radius: 6px;
    background: var(--admin-pink);
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1;
  }

  &__page-size {
    box-sizing: border-box;
    height: 2rem;
    padding: 0 1.75rem 0 0.5rem;
    border: var(--admin-border);
    border-radius: 6px;
    background: #fff;
    font-size: 0.8125rem;
    line-height: 1;
    color: #555;
    cursor: pointer;
  }

  &__sort-mobile {
    display: none;
  }

  &__mobile-list {
    display: none;
  }

  &__mobile-item {
    padding: 0.85rem 1rem;
  }

  &__mobile-main {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    min-width: 0;
  }

  &__mobile-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 0.65rem;
    padding-left: calc(56px + 0.75rem);
  }

  &__mobile-date {
    flex-shrink: 0;
    font-size: 0.75rem;
    color: #999;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    &__card {
      border-radius: 10px;
    }

    &__filters {
      padding: 0.85rem;
      gap: 0.55rem;
    }

    &__search {
      flex: 1 1 100%;
      max-width: none;
      min-width: 0;
    }

    &__select,
    &__reset,
    &__sort-mobile {
      flex: 1;
      min-width: 0;
      justify-content: center;
    }

    &__sort-mobile {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      box-sizing: border-box;
      height: var(--admin-filter-height);
      padding: 0 0.65rem;
      border: var(--admin-border);
      border-radius: 8px;
      background: #fff;
      color: #666;
      font-size: 0.8125rem;
      line-height: 1;
      cursor: pointer;

      span {
        width: 0.9rem;
        height: 0.9rem;
      }
    }

    &__create {
      flex: 1 1 100%;
      margin-left: 0;
      justify-content: center;
      height: var(--admin-filter-height);
    }

    &__table-wrap {
      display: none;
    }

    &__mobile-list {
      display: block;
    }

    &__cover {
      width: 56px;
      height: 42px;
    }

    &__article-title {
      font-size: 0.9375rem;
    }

    &__article-excerpt {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      white-space: normal;
    }

    &__footer {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.75rem 0.85rem;

      > span {
        flex-shrink: 0;
        white-space: nowrap;
      }
    }

    &__pagination {
      flex-wrap: nowrap;
      justify-content: flex-end;
      gap: 0.35rem;
      min-width: 0;

      button {
        height: 1.75rem;
        padding: 0 0.5rem;
        font-size: 0.75rem;
      }
    }

    &__page-num {
      min-width: 1.75rem;
      height: 1.75rem;
      font-size: 0.75rem;
    }

    &__page-size {
      display: none;
    }

    &__mobile-item + &__mobile-item {
      border-top: 1px solid rgb(0 0 0 / 8%);
    }
  }

  @media (max-width: 480px) {
    &__filters {
      padding: 0.65rem;
    }

    &__footer {
      flex-direction: column;
      align-items: stretch;
      gap: 0.65rem;

      > span {
        text-align: center;
      }
    }

    &__pagination {
      justify-content: center;
      flex-wrap: wrap;
    }
  }
}
</style>
