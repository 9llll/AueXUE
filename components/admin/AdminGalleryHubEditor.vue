<script setup lang="ts">
import type { AlbumDetailFrontmatter, AlbumSummary } from '../../types/album'
import { computed, inject, onBeforeUnmount, reactive, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import AlbumTimeline from '../AlbumTimeline.vue'
import { adminTopbarTargetKey } from '../../utils/adminShellContext'
import { fetchAdminGalleryAlbum } from '../../utils/adminGalleryApi'
import { isValidGallerySlug } from '../../server/gallery/constants'
import { serializeAlbumMarkdown, serializeHubMarkdown } from '../../utils/galleryFrontmatter'
import { useAdminToast } from '../../composables/useAdminToast'

const props = defineProps<{
  initialFrontmatter?: Record<string, unknown>
  initialAlbums?: AlbumSummary[]
  persist?: (source: string) => Promise<void>
}>()

const emit = defineEmits<{
  saveAlbum: [payload: { slug: string, source: string, isNew: boolean }]
  deleteAlbum: [payload: { slug: string }]
}>()

const title = ref(String(props.initialFrontmatter?.title || '相册'))
const cover = ref(String(props.initialFrontmatter?.cover || ''))
const icon = ref(String(props.initialFrontmatter?.icon || 'i-ri-gallery-line'))
const comment = ref(props.initialFrontmatter?.comment === true)
const albums = ref<AlbumSummary[]>([...(props.initialAlbums || [])])
const saving = ref(false)
const adminToast = useAdminToast()
const showTopbar = ref(true)
const topbarTarget = inject<Ref<HTMLElement | null>>(adminTopbarTargetKey, ref(null))

const pageDialogOpen = ref(false)
const albumDialogOpen = ref(false)
const editingSlug = ref('')
const isNewAlbum = ref(false)
const loadedPhotos = ref<import('../../types/album').AlbumPhoto[]>([])
const albumDraft = reactive(createEmptyAlbumDraft())

const albumDialogTitle = computed(() => isNewAlbum.value ? '新建相册' : '编辑相册')

function createEmptyAlbumDraft() {
  return {
    slug: '',
    title: '',
    date: '',
    cover: '',
    desc: '',
    location: '',
    tags: '',
    comment: false,
    encrypted: false,
    password: '',
    source: 'local' as 'local' | 'webdav',
    webdavUrl: '',
    webdavUsername: '',
  }
}

function resetAlbumDraft(input?: Partial<typeof albumDraft>) {
  const base = createEmptyAlbumDraft()
  Object.assign(albumDraft, base, input || {})
}

function summaryToDraft(slug: string, fm: AlbumDetailFrontmatter) {
  resetAlbumDraft({
    slug,
    title: fm.title || slug,
    date: fm.date || '',
    cover: fm.cover || '',
    desc: fm.desc || '',
    location: fm.location || '',
    tags: Array.isArray(fm.tags) ? fm.tags.join(', ') : '',
    comment: fm.comment === true,
    encrypted: !!fm.encrypted,
    password: fm.password || '',
    source: fm.source === 'webdav' ? 'webdav' : 'local',
    webdavUrl: fm.webdav?.url || '',
    webdavUsername: fm.webdav?.username || '',
  })
}

function buildAlbumFrontmatter(): AlbumDetailFrontmatter {
  const tags = albumDraft.tags
    .split(/[,，]/)
    .map(item => item.trim())
    .filter(Boolean)

  const frontmatter: AlbumDetailFrontmatter = {
    title: albumDraft.title.trim() || albumDraft.slug.trim(),
    date: albumDraft.date.trim() || undefined,
    cover: albumDraft.cover.trim() || undefined,
    desc: albumDraft.desc.trim() || undefined,
    location: albumDraft.location.trim() || undefined,
    tags: tags.length ? tags : undefined,
    comment: albumDraft.comment ? true : undefined,
    encrypted: albumDraft.encrypted,
    password: albumDraft.encrypted ? albumDraft.password.trim() || undefined : undefined,
    source: albumDraft.source,
    photos: albumDraft.source === 'local'
      ? (loadedPhotos.value.length ? [...loadedPhotos.value] : [])
      : undefined,
  }

  if (albumDraft.source === 'webdav') {
    frontmatter.webdav = {
      url: albumDraft.webdavUrl.trim(),
      username: albumDraft.webdavUsername.trim() || undefined,
    }
  }

  return frontmatter
}

function buildHubSource() {
  return serializeHubMarkdown({
    layout: 'gallery',
    title: title.value.trim() || '相册',
    icon: icon.value.trim() || 'i-ri-gallery-line',
    cover: cover.value.trim() || undefined,
    comment: comment.value ? true : undefined,
    albums: albums.value.map(item => item.slug),
  })
}

function buildAlbumSource() {
  return serializeAlbumMarkdown(buildAlbumFrontmatter())
}

function upsertLocalSummary(slug: string, fm: AlbumDetailFrontmatter) {
  const summary: AlbumSummary = {
    slug,
    title: fm.title || slug,
    date: fm.date || '',
    cover: fm.cover,
    desc: fm.desc,
    count: fm.source === 'webdav' ? undefined : (fm.photos?.length || 0),
    location: fm.location,
    tags: fm.tags,
    encrypted: !!fm.encrypted,
    source: fm.source,
  }

  const index = albums.value.findIndex(item => item.slug === slug)
  if (index >= 0)
    albums.value[index] = summary
  else
    albums.value.unshift(summary)
}

async function openAlbumDialog(slug?: string) {
  if (slug) {
    isNewAlbum.value = false
    editingSlug.value = slug
    try {
      const detail = await fetchAdminGalleryAlbum(slug)
      loadedPhotos.value = Array.isArray(detail.frontmatter.photos) ? [...detail.frontmatter.photos] : []
      summaryToDraft(slug, detail.frontmatter)
    }
    catch (err) {
      adminToast.error(err instanceof Error ? err.message : '加载相册失败')
      return
    }
  }
  else {
    isNewAlbum.value = true
    editingSlug.value = ''
    loadedPhotos.value = []
    resetAlbumDraft()
  }
  albumDialogOpen.value = true
}

function closeAlbumDialog() {
  albumDialogOpen.value = false
  editingSlug.value = ''
  isNewAlbum.value = false
}

function saveAlbumDraft() {
  const slug = albumDraft.slug.trim()
  if (!slug) {
    adminToast.error('请填写相册 slug')
    return
  }
  if (!isValidGallerySlug(slug)) {
    adminToast.error('slug 只能包含字母、数字和连字符，且不能以连字符开头')
    return
  }
  if (!albumDraft.title.trim()) {
    adminToast.error('请填写相册标题')
    return
  }
  if (albumDraft.source === 'webdav' && !albumDraft.webdavUrl.trim()) {
    adminToast.error('WebDAV 相册请填写 WebDAV 地址')
    return
  }
  if (isNewAlbum.value && albums.value.some(item => item.slug === slug)) {
    adminToast.error('该 slug 已存在')
    return
  }

  const frontmatter = buildAlbumFrontmatter()
  const source = serializeAlbumMarkdown(frontmatter)
  upsertLocalSummary(slug, frontmatter)
  emit('saveAlbum', { slug, source, isNew: isNewAlbum.value })
  closeAlbumDialog()
}

function deleteCurrentAlbum() {
  const slug = editingSlug.value
  if (!slug)
    return
  if (!confirm(`确定删除相册「${slug}」吗？相册内照片配置也将被删除。`))
    return
  albums.value = albums.value.filter(item => item.slug !== slug)
  emit('deleteAlbum', { slug })
  closeAlbumDialog()
}

async function autoSaveHub(message: string) {
  if (saving.value)
    return false

  if (!title.value.trim()) {
    adminToast.error('请填写页面标题')
    pageDialogOpen.value = true
    return false
  }

  saving.value = true
  try {
    const source = buildHubSource()
    if (props.persist)
      await props.persist(source)
    adminToast.success(message)
    return true
  }
  catch (err) {
    adminToast.error(err instanceof Error ? err.message : '保存失败')
    return false
  }
  finally {
    saving.value = false
  }
}

async function closePageDialog() {
  pageDialogOpen.value = false
  await autoSaveHub('页面设置已保存')
}

function teardown() {
  showTopbar.value = false
}

onBeforeRouteLeave(() => {
  teardown()
  return true
})

onBeforeUnmount(() => {
  teardown()
})

defineExpose({
  setAlbums(next: AlbumSummary[]) {
    albums.value = [...next]
  },
  setSaving(value: boolean) {
    saving.value = value
  },
  setError(message: string | null) {
    if (message)
      adminToast.error(message)
    saving.value = false
  },
  setSuccess(message: string) {
    adminToast.success(message)
    saving.value = false
  },
})
</script>

<template>
  <div class="admin-gallery">
    <Teleport v-if="showTopbar && topbarTarget" :to="topbarTarget">
      <header class="admin-gallery__header">
        <div class="admin-gallery__heading">
          <h1>相册管理</h1>
          <p>{{ saving ? '保存中…' : `${albums.length} 个相册` }}</p>
        </div>
        <div class="admin-gallery__actions">
          <button type="button" class="admin-gallery__btn admin-gallery__btn--ghost" @click="pageDialogOpen = true">
            页面设置
          </button>
          <button type="button" class="admin-gallery__btn admin-gallery__btn--ghost" @click="openAlbumDialog()">
            新建相册
          </button>
        </div>
      </header>
    </Teleport>

    <div class="admin-gallery__board">
      <AlbumTimeline
        admin
        base-path="/admin/gallery"
        :albums="albums"
        @edit-album="openAlbumDialog"
        @create-album="openAlbumDialog()"
      />
    </div>

    <Teleport to="body">
      <div v-if="albumDialogOpen" class="admin-gallery-dialog" @click.self="closeAlbumDialog">
        <div class="admin-gallery-dialog__panel" role="dialog" aria-modal="true" :aria-label="albumDialogTitle">
          <header class="admin-gallery-dialog__head">
            <h2>{{ albumDialogTitle }}</h2>
            <button type="button" class="admin-gallery-dialog__close" aria-label="关闭" @click="closeAlbumDialog">
              <span class="i-mdi-close" aria-hidden="true" />
            </button>
          </header>

          <div class="admin-gallery-dialog__body">
            <label class="admin-gallery-dialog__field">
              <span>slug *</span>
              <input v-model="albumDraft.slug" type="text" placeholder="例如：bizhi" :readonly="!isNewAlbum">
            </label>
            <label class="admin-gallery-dialog__field">
              <span>标题 *</span>
              <input v-model="albumDraft.title" type="text" placeholder="相册标题">
            </label>
            <label class="admin-gallery-dialog__field">
              <span>日期</span>
              <input v-model="albumDraft.date" type="text" placeholder="2025-08-18">
            </label>
            <label class="admin-gallery-dialog__field admin-gallery-dialog__field--wide">
              <span>封面 URL</span>
              <input v-model="albumDraft.cover" type="url" placeholder="https://...">
            </label>
            <label class="admin-gallery-dialog__field admin-gallery-dialog__field--wide">
              <span>描述</span>
              <input v-model="albumDraft.desc" type="text" placeholder="相册简介">
            </label>
            <label class="admin-gallery-dialog__field">
              <span>地点</span>
              <input v-model="albumDraft.location" type="text" placeholder="重庆">
            </label>
            <label class="admin-gallery-dialog__field admin-gallery-dialog__field--wide">
              <span>标签（逗号分隔）</span>
              <input v-model="albumDraft.tags" type="text" placeholder="壁纸, 云端">
            </label>
            <label class="admin-gallery-dialog__field">
              <span>数据来源</span>
              <select v-model="albumDraft.source">
                <option value="local">
                  本地 URL 列表
                </option>
                <option value="webdav">
                  WebDAV
                </option>
              </select>
            </label>
            <label class="admin-gallery-dialog__check">
              <input v-model="albumDraft.comment" type="checkbox">
              <span>开启评论</span>
            </label>
            <label class="admin-gallery-dialog__check">
              <input v-model="albumDraft.encrypted" type="checkbox">
              <span>加密相册</span>
            </label>
            <label v-if="albumDraft.encrypted" class="admin-gallery-dialog__field admin-gallery-dialog__field--wide">
              <span>访问密码</span>
              <input v-model="albumDraft.password" type="text" placeholder="相册密码">
            </label>
            <template v-if="albumDraft.source === 'webdav'">
              <label class="admin-gallery-dialog__field admin-gallery-dialog__field--wide">
                <span>WebDAV 地址 *</span>
                <input v-model="albumDraft.webdavUrl" type="url" placeholder="https://.../dav/相册">
              </label>
              <label class="admin-gallery-dialog__field admin-gallery-dialog__field--wide">
                <span>WebDAV 用户名</span>
                <input v-model="albumDraft.webdavUsername" type="text" placeholder="可选">
              </label>
              <p class="admin-gallery-dialog__hint">
                WebDAV 照片仍从云端读取，此处仅编辑元数据；密码使用环境变量 <code>WEBDAV_PASSWORD</code>。
              </p>
            </template>
            <p v-else class="admin-gallery-dialog__hint">
              照片 URL 请在进入相册后管理。
            </p>
          </div>

          <footer class="admin-gallery-dialog__foot">
            <button
              v-if="!isNewAlbum"
              type="button"
              class="admin-gallery-dialog__btn admin-gallery-dialog__btn--danger"
              @click="deleteCurrentAlbum"
            >
              删除相册
            </button>
            <div class="admin-gallery-dialog__foot-spacer" />
            <button type="button" class="admin-gallery-dialog__btn admin-gallery-dialog__btn--ghost" @click="closeAlbumDialog">
              取消
            </button>
            <button type="button" class="admin-gallery-dialog__btn admin-gallery-dialog__btn--primary" @click="saveAlbumDraft">
              确定
            </button>
          </footer>
        </div>
      </div>

      <div v-if="pageDialogOpen" class="admin-gallery-dialog" @click.self="closePageDialog">
        <div class="admin-gallery-dialog__panel admin-gallery-dialog__panel--narrow" role="dialog" aria-modal="true" aria-label="页面设置">
          <header class="admin-gallery-dialog__head">
            <h2>页面设置</h2>
            <button type="button" class="admin-gallery-dialog__close" aria-label="关闭" @click="closePageDialog">
              <span class="i-mdi-close" aria-hidden="true" />
            </button>
          </header>

          <div class="admin-gallery-dialog__body">
            <label class="admin-gallery-dialog__field admin-gallery-dialog__field--wide">
              <span>页面标题</span>
              <input v-model="title" type="text" placeholder="相册">
            </label>
            <label class="admin-gallery-dialog__field admin-gallery-dialog__field--wide">
              <span>头图 URL</span>
              <input v-model="cover" type="url" placeholder="https://...">
            </label>
            <label class="admin-gallery-dialog__field admin-gallery-dialog__field--wide">
              <span>图标 class</span>
              <input v-model="icon" type="text" placeholder="i-ri-gallery-line">
            </label>
            <label class="admin-gallery-dialog__check">
              <input v-model="comment" type="checkbox">
              <span>开启评论</span>
            </label>
          </div>

          <footer class="admin-gallery-dialog__foot">
            <div class="admin-gallery-dialog__foot-spacer" />
            <button type="button" class="admin-gallery-dialog__btn admin-gallery-dialog__btn--primary" :disabled="saving" @click="closePageDialog">
              确定
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.admin-gallery,
.admin-gallery-dialog {
  --admin-pink: #e93d6d;
  --admin-border: 1px solid #000;
}

.admin-gallery {
  &__header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    width: 100%;
    min-width: 0;
  }

  &__heading {
    min-width: 0;

    h1 {
      margin: 0 0 0.1rem;
      font-size: 1.0625rem;
      font-weight: 700;
      color: #222;
    }

    p {
      margin: 0;
      font-size: 0.75rem;
      color: #888;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    height: 2.125rem;
    padding: 0 0.85rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    white-space: nowrap;

    &--ghost {
      border: var(--admin-border);
      background: #fff;
      color: #555;
    }

    &--primary {
      border: var(--admin-border);
      background: var(--admin-pink);
      color: #fff;
    }

    &:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
  }

  &__board {
    padding: 24px;
    border: var(--admin-border);
    border-radius: 12px;
    background: #fff;
  }
}

.admin-gallery-dialog {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(0 0 0 / 45%);

  &__panel {
    width: min(640px, 100%);
    max-height: min(88vh, 900px);
    display: flex;
    flex-direction: column;
    border: 1px solid #000;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 18px 48px rgb(0 0 0 / 18%);

    &--narrow {
      width: min(480px, 100%);
    }
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #000;

    h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #222;
    }
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #666;
    cursor: pointer;

    &:hover {
      background: #f3f3f3;
      color: #222;
    }
  }

  &__body {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    padding: 1rem;
    overflow: auto;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;

    span {
      font-size: 0.75rem;
      color: #666;
    }

    input,
    select {
      height: 2.125rem;
      padding: 0 0.75rem;
      border: 1px solid #000;
      border-radius: 8px;
      font-size: 0.875rem;
      background: #fff;
    }

    &--wide {
      grid-column: 1 / -1;
    }
  }

  &__check {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    grid-column: 1 / -1;
    font-size: 0.875rem;
    color: #444;
  }

  &__hint {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 0.8125rem;
    color: #777;
    line-height: 1.5;
  }

  &__foot {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    border-top: 1px solid #000;
  }

  &__foot-spacer {
    flex: 1;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 2.125rem;
    padding: 0 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;

    &--ghost {
      border: 1px solid #000;
      background: #fff;
      color: #555;
    }

    &--primary {
      border: 1px solid #000;
      background: #e93d6d;
      color: #fff;
    }

    &--danger {
      border: 1px solid #000;
      background: #fff;
      color: #c0392b;
    }
  }
}

@media (max-width: 768px) {
  .admin-gallery {
    &__board {
      padding: 0.85rem;
      border-radius: 10px;
    }
  }

  .admin-gallery-dialog {
    padding: 0;
    align-items: stretch;

    &__panel {
      width: 100%;
      max-height: 100dvh;
      min-height: 100dvh;
      border-radius: 0;
      border-left: none;
      border-right: none;
    }

    &__body {
      grid-template-columns: 1fr;
    }
  }
}
</style>
