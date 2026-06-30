<script setup lang="ts">
import type { AlbumDetailFrontmatter, AlbumPhoto } from '../../types/album'
import { computed, inject, onBeforeUnmount, reactive, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { adminTopbarTargetKey } from '../../utils/adminShellContext'
import { isAlbumVideo } from '../../utils/albumMedia'
import { groupPhotosByMonth } from '../../utils/albumPhotos'
import { serializeAlbumMarkdown } from '../../utils/galleryFrontmatter'
import { useAdminToast } from '../../composables/useAdminToast'
import AlbumVideoThumb from '../AlbumVideoThumb.vue'

const props = defineProps<{
  slug: string
  initialFrontmatter?: AlbumDetailFrontmatter
  persist?: (source: string) => Promise<void>
}>()

const frontmatter = ref<AlbumDetailFrontmatter>(cloneFrontmatter(props.initialFrontmatter))
const photos = ref<AlbumPhoto[]>([...(props.initialFrontmatter?.photos || [])])
const saving = ref(false)
const adminToast = useAdminToast()
const showTopbar = ref(true)
const topbarTarget = inject<Ref<HTMLElement | null>>(adminTopbarTargetKey, ref(null))

const selectionMode = ref(false)
const selectedUrls = ref<string[]>([])
const photoDialogOpen = ref(false)
const photoDraft = reactive(createEmptyPhoto())

const isWebDav = computed(() => frontmatter.value.source === 'webdav')
const selectedCount = computed(() => selectedUrls.value.length)
const allSelected = computed(() => {
  if (!photos.value.length)
    return false
  return photos.value.every(photo => selectedUrls.value.includes(photo.url))
})

const groupedPhotos = computed(() => groupPhotosByMonth(photos.value))

function cloneFrontmatter(input?: AlbumDetailFrontmatter): AlbumDetailFrontmatter {
  return {
    ...(input || {}),
    tags: Array.isArray(input?.tags) ? [...input.tags] : undefined,
    webdav: input?.webdav ? { ...input.webdav } : undefined,
  }
}

function createEmptyPhoto() {
  return {
    url: '',
    date: '',
  }
}

function resetPhotoDraft() {
  photoDraft.url = ''
  photoDraft.date = ''
}

function buildSource() {
  const { photos: _stalePhotos, ...rest } = frontmatter.value
  const payload: AlbumDetailFrontmatter = {
    ...rest,
    photos: isWebDav.value ? undefined : photos.value.map(photo => ({
      url: photo.url.trim(),
      date: photo.date?.trim() || undefined,
      type: photo.type,
      poster: photo.poster?.trim() || undefined,
    })).filter(photo => photo.url),
  }
  return serializeAlbumMarkdown(payload)
}

function toggleSelection(url: string) {
  const index = selectedUrls.value.indexOf(url)
  if (index >= 0)
    selectedUrls.value.splice(index, 1)
  else
    selectedUrls.value.push(url)
}

function clearSelection() {
  selectedUrls.value = []
  selectionMode.value = false
}

function toggleSelectionMode() {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value)
    clearSelection()
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedUrls.value = []
    return
  }
  selectedUrls.value = [...new Set(photos.value.map(photo => photo.url))]
}

function resolvePhotoTarget(groupKey: string, photoIndexInGroup: number) {
  const group = groupedPhotos.value.find(item => item.key === groupKey)
  return group?.photos[photoIndexInGroup]
}

function deletePhotoAtIndex(target: AlbumPhoto) {
  const index = photos.value.findIndex(photo => photo === target)
  if (index < 0)
    return -1
  photos.value.splice(index, 1)
  selectedUrls.value = selectedUrls.value.filter(url => url !== target.url)
  return index
}

async function deletePhotoAt(groupKey: string, photoIndexInGroup: number) {
  if (saving.value)
    return

  const target = resolvePhotoTarget(groupKey, photoIndexInGroup)
  if (!target)
    return

  if (!confirm('确定删除这张照片吗？'))
    return

  const snapshot = photos.value.map(photo => ({ ...photo }))
  if (deletePhotoAtIndex(target) < 0)
    return

  const ok = await autoSave('照片已删除')
  if (!ok)
    photos.value = snapshot
}

async function deleteSelected() {
  if (!selectedCount.value || saving.value)
    return
  if (!confirm(`确定删除选中的 ${selectedCount.value} 张照片吗？`))
    return

  const snapshot = photos.value.map(photo => ({ ...photo }))
  const selected = new Set(selectedUrls.value)
  photos.value = photos.value.filter(photo => !selected.has(photo.url))
  clearSelection()

  const ok = await autoSave('照片已删除')
  if (!ok)
    photos.value = snapshot
}

function openPhotoDialog() {
  if (saving.value)
    return
  resetPhotoDraft()
  photoDialogOpen.value = true
}

async function savePhotoDraft() {
  if (saving.value)
    return
  if (!photoDraft.url.trim()) {
    adminToast.error('请填写图片或视频链接')
    return
  }

  photos.value.push({
    url: photoDraft.url.trim(),
    date: photoDraft.date?.trim() || undefined,
  })
  photoDialogOpen.value = false
  const addedUrl = photoDraft.url.trim()
  const ok = await autoSave('照片已添加')
  if (!ok)
    photos.value = photos.value.filter(photo => photo.url !== addedUrl)
}

async function autoSave(message: string) {
  if (isWebDav.value || saving.value)
    return false

  saving.value = true
  try {
    const source = buildSource()
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
  setPhotos(next: AlbumPhoto[]) {
    photos.value = next.map(photo => ({ ...photo }))
  },
})
</script>

<template>
  <div class="admin-gallery-album">
    <Teleport v-if="showTopbar && topbarTarget" :to="topbarTarget">
      <header class="admin-gallery-album__header">
        <div class="admin-gallery-album__heading">
          <h1>{{ frontmatter.title || slug }}</h1>
          <p>{{ isWebDav ? 'WebDAV 相册 · 仅元数据可编辑' : saving ? '保存中…' : `${photos.length} 张照片` }}</p>
        </div>
        <div class="admin-gallery-album__actions">
          <template v-if="!isWebDav">
            <button
              type="button"
              class="admin-gallery-album__btn admin-gallery-album__btn--ghost"
              :disabled="saving"
              @click="toggleSelectionMode"
            >
              {{ selectionMode ? '取消多选' : '多选' }}
            </button>
            <button
              v-if="selectionMode"
              type="button"
              class="admin-gallery-album__btn admin-gallery-album__btn--ghost"
              :disabled="saving"
              @click="toggleSelectAll"
            >
              {{ allSelected ? '取消全选' : '全选' }}
            </button>
            <button
              v-if="selectionMode && selectedCount"
              type="button"
              class="admin-gallery-album__btn admin-gallery-album__btn--danger"
              :disabled="saving"
              @click="deleteSelected"
            >
              删除选中 ({{ selectedCount }})
            </button>
            <button
              type="button"
              class="admin-gallery-album__btn admin-gallery-album__btn--ghost"
              :disabled="saving"
              @click="openPhotoDialog"
            >
              新增照片
            </button>
          </template>
        </div>
      </header>
    </Teleport>

    <div class="admin-gallery-album__board">
      <p v-if="isWebDav" class="admin-gallery-album__notice">
        此相册照片来自 WebDAV，后台仅可编辑相册元数据。请返回相册列表，点击右上角编辑按钮修改标题、封面等信息。
      </p>

      <p v-else-if="!photos.length" class="admin-gallery-album__empty">
        暂无照片，点击「新增照片」添加 URL。
      </p>

      <div v-else class="admin-gallery-album__timeline">
        <section
          v-for="group in groupedPhotos"
          :key="group.key"
          class="admin-gallery-album__group"
        >
          <h3 class="admin-gallery-album__month">
            {{ group.label }}
          </h3>

          <div class="admin-gallery-album__grid">
            <div
              v-for="(photo, photoIndex) in group.photos"
              :key="`${group.key}-${photo.url}-${photoIndex}`"
              class="admin-gallery-album__item"
            >
              <button
                type="button"
                class="admin-gallery-album__photo"
                :class="{
                  'is-video': isAlbumVideo(photo),
                  'is-selected': selectedUrls.includes(photo.url),
                  'is-selectable': selectionMode,
                }"
                @click="selectionMode ? toggleSelection(photo.url) : undefined"
              >
                <span v-if="selectionMode" class="admin-gallery-album__check" aria-hidden="true">
                  {{ selectedUrls.includes(photo.url) ? '✓' : '' }}
                </span>
                <AlbumVideoThumb
                  v-if="isAlbumVideo(photo)"
                  :src="photo.url"
                  :poster="photo.poster"
                  alt="相册视频"
                />
                <img
                  v-else
                  :src="photo.url"
                  alt="相册照片"
                  loading="lazy"
                >
              </button>
              <button
                v-if="!selectionMode"
                type="button"
                class="admin-gallery-album__delete"
                aria-label="删除照片"
                :disabled="saving"
                @click="deletePhotoAt(group.key, photoIndex)"
              >
                <span class="i-mdi-close" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="photoDialogOpen" class="admin-gallery-album-dialog" @click.self="photoDialogOpen = false">
        <div class="admin-gallery-album-dialog__panel" role="dialog" aria-modal="true" aria-label="新增照片">
          <header class="admin-gallery-album-dialog__head">
            <h2>新增照片</h2>
            <button type="button" class="admin-gallery-album-dialog__close" aria-label="关闭" @click="photoDialogOpen = false">
              <span class="i-mdi-close" aria-hidden="true" />
            </button>
          </header>

          <div class="admin-gallery-album-dialog__body">
            <label class="admin-gallery-album-dialog__field">
              <span>图片或视频链接 *</span>
              <input v-model="photoDraft.url" type="url" placeholder="https://...">
            </label>
            <label class="admin-gallery-album-dialog__field">
              <span>日期</span>
              <input v-model="photoDraft.date" type="text" placeholder="2026-6-1">
            </label>
          </div>

          <footer class="admin-gallery-album-dialog__foot">
            <div class="admin-gallery-album-dialog__foot-spacer" />
            <button type="button" class="admin-gallery-album-dialog__btn admin-gallery-album-dialog__btn--ghost" @click="photoDialogOpen = false">
              取消
            </button>
            <button type="button" class="admin-gallery-album-dialog__btn admin-gallery-album-dialog__btn--primary" :disabled="saving" @click="savePhotoDraft">
              添加
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.admin-gallery-album,
.admin-gallery-album-dialog {
  --admin-pink: #e93d6d;
  --admin-border: 1px solid #000;
}

.admin-gallery-album {
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
    height: 2.125rem;
    padding: 0 0.85rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    white-space: nowrap;
    border: var(--admin-border);
    background: #fff;
    color: #555;

    &--primary {
      background: var(--admin-pink);
      color: #fff;
    }

    &--danger {
      color: #c0392b;
    }

    &:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
  }

  &__notice,
  &__empty {
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border: var(--admin-border);
    border-radius: 8px;
    font-size: 0.875rem;
  }

  &__notice,
  &__empty {
    background: #fafafa;
    color: #666;
    text-align: center;
  }

  &__board {
    padding: 24px;
    border: var(--admin-border);
    border-radius: 12px;
    background: #fff;
  }

  &__timeline {
    width: 100%;
  }

  &__group + &__group {
    margin-top: 32px;
  }

  &__month {
    margin: 0 0 16px;
    padding-left: 12px;
    border-left: 3px solid var(--sakura-color-primary, #fe9500);
    font-size: 1rem;
    font-weight: 700;
    color: #222;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  &__item {
    position: relative;
    min-width: 0;
  }

  &__photo {
    position: relative;
    width: 100%;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 1;
    background: #f3f3f3;
    cursor: default;

    img,
    :deep(.album-video-thumb__img),
    :deep(.album-video-thumb__video) {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    &.is-selectable {
      cursor: pointer;
    }

    &.is-selected {
      border-color: var(--admin-pink);
      box-shadow: 0 0 0 2px rgb(233 61 109 / 20%);
    }
  }

  &__check {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgb(0 0 0 / 55%);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
  }

  &__delete {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 3;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgb(0 0 0 / 58%);
    color: #fff;
    cursor: pointer;
    backdrop-filter: blur(4px);

    span {
      width: 14px;
      height: 14px;
    }

    &:hover:not(:disabled) {
      background: rgb(192 57 43 / 88%);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  @media (max-width: 768px) {
    &__board {
      padding: 0.85rem;
      border-radius: 10px;
    }

    &__group + &__group {
      margin-top: 24px;
    }

    &__month {
      margin-bottom: 12px;
      font-size: 0.9375rem;
    }

    &__grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 8px;
    }

    &__check,
    &__delete {
      top: 6px;
      right: 6px;
      width: 22px;
      height: 22px;
    }
  }
}

.admin-gallery-album-dialog {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(0 0 0 / 45%);

  &__panel {
    width: min(520px, 100%);
    border: 1px solid #000;
    border-radius: 12px;
    background: #fff;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #000;

    h2 {
      margin: 0;
      font-size: 1rem;
    }
  }

  &__close {
    border: none;
    background: transparent;
    cursor: pointer;
  }

  &__body {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;

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
    }

    &--wide {
      grid-column: 1 / -1;
    }
  }

  &__foot {
    display: flex;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    border-top: 1px solid #000;
  }

  &__foot-spacer {
    flex: 1;
  }

  &__btn {
    height: 2.125rem;
    padding: 0 1rem;
    border-radius: 8px;
    border: 1px solid #000;
    cursor: pointer;

    &--primary {
      background: #e93d6d;
      color: #fff;
    }
  }
}

@media (max-width: 768px) {
  .admin-gallery-album-dialog {
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

    &__foot {
      flex-wrap: wrap;
    }
  }
}
</style>
