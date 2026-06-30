<script setup lang="ts">
import type { HtmlFileSummary, HtmlFileUpsertPayload } from '../../types/htmlFile'
import { computed, inject, onBeforeUnmount, onMounted, onUnmounted, reactive, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { adminTopbarTargetKey } from '../../utils/adminShellContext'
import { useAdminToast } from '../../composables/useAdminToast'
import { HTML_FILE_SLUG_RE } from '../../server/htmlFiles/constants'

const props = defineProps<{
  initialFiles?: HtmlFileSummary[]
}>()

const emit = defineEmits<{
  save: [payload: HtmlFileUpsertPayload]
  delete: [payload: { slug: string }]
  load: [slug: string]
}>()

const files = ref<HtmlFileSummary[]>([...(props.initialFiles || [])])
const saving = ref(false)
const adminToast = useAdminToast()
const showTopbar = ref(true)
const topbarTarget = inject<Ref<HTMLElement | null>>(adminTopbarTargetKey, ref(null))
const dialogOpen = ref(false)
const isNew = ref(false)
const openMenuSlug = ref<string | null>(null)
const menuPosition = ref<{ top: string; left: string } | null>(null)
const draft = reactive(createEmptyDraft())

const dialogTitle = computed(() => isNew.value ? '新建 HTML 文件' : '编辑 HTML 文件')
const previewPath = computed(() => draft.slug.trim() ? `/${draft.slug.trim().replace(/\.html$/i, '')}.html` : '')
const openMenuFile = computed(() => {
  if (!openMenuSlug.value)
    return null
  return files.value.find(item => item.slug === openMenuSlug.value) ?? null
})

function createEmptyDraft() {
  return {
    slug: '',
    title: '',
    description: '',
    content: '',
  }
}

function resetDraft(input?: Partial<typeof draft>) {
  Object.assign(draft, createEmptyDraft(), input || {})
}

function openCreateDialog() {
  isNew.value = true
  resetDraft()
  dialogOpen.value = true
}

async function openEditDialog(slug: string) {
  const target = files.value.find(item => item.slug === slug)
  if (!target)
    return

  isNew.value = false
  resetDraft({
    slug: target.slug,
    title: target.title,
    description: target.description,
    content: '',
  })
  dialogOpen.value = true
  emit('load', slug)
}

function closeDialog() {
  dialogOpen.value = false
}

function buildPayload(): HtmlFileUpsertPayload | null {
  const slug = draft.slug.trim().replace(/\.html$/i, '')
  const title = draft.title.trim()
  const description = draft.description.trim()
  const content = draft.content

  if (!slug) {
    adminToast.error('请填写文件名')
    return null
  }
  if (!HTML_FILE_SLUG_RE.test(slug)) {
    adminToast.error('文件名仅支持字母、数字与连字符，且需以字母或数字开头')
    return null
  }
  if (!title) {
    adminToast.error('请填写标题')
    return null
  }
  if (!content.trim()) {
    adminToast.error('请填写 HTML 内容')
    return null
  }
  if (isNew.value && files.value.some(item => item.slug === slug)) {
    adminToast.error('该文件名已存在')
    return null
  }

  return { slug, title, description, content }
}

function saveDraft() {
  const payload = buildPayload()
  if (!payload)
    return

  saving.value = true
  emit('save', payload)
}

function deleteCurrent() {
  const slug = draft.slug.trim().replace(/\.html$/i, '')
  if (!slug || isNew.value)
    return
  if (!confirm(`确定删除「${slug}.html」吗？`))
    return

  saving.value = true
  emit('delete', { slug })
}

function deleteFile(file: HtmlFileSummary) {
  closeMenu()
  if (!confirm(`确定删除「${file.slug}.html」吗？`))
    return

  saving.value = true
  emit('delete', { slug: file.slug })
}

function positionMenu(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect()
  const menuWidth = 120
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

function onDocumentClick(event: MouseEvent) {
  if (!openMenuSlug.value)
    return
  const target = event.target as HTMLElement
  if (!target.closest('.admin-html-files__menu') && !target.closest('.admin-html-files__menu-dropdown'))
    closeMenu()
}

function onWindowScroll() {
  if (openMenuSlug.value)
    closeMenu()
}

function openPublicFile(publicPath: string) {
  closeMenu()
  window.open(publicPath, '_blank', 'noopener,noreferrer')
}

function handleEditFromMenu(slug: string) {
  closeMenu()
  openEditDialog(slug)
}

function formatDate(value?: string) {
  if (!value)
    return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('scroll', onWindowScroll, true)
  window.removeEventListener('resize', onWindowScroll)
})

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('scroll', onWindowScroll, true)
  window.addEventListener('resize', onWindowScroll)
})

defineExpose({
  setFiles(next: HtmlFileSummary[]) {
    files.value = [...next]
  },
  setDraftContent(content: string) {
    draft.content = content
  },
  closeDialog() {
    closeDialog()
    saving.value = false
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
  <div class="admin-html-files">
    <Teleport v-if="showTopbar && topbarTarget" :to="topbarTarget">
      <header class="admin-html-files__header">
        <div class="admin-html-files__heading">
          <h1>HTML 文件</h1>
          <p>{{ saving ? '保存中…' : `${files.length} 个文件` }}</p>
        </div>
        <div class="admin-html-files__actions">
          <button type="button" class="admin-html-files__btn admin-html-files__btn--primary" @click="openCreateDialog">
            新建文件
          </button>
        </div>
      </header>
    </Teleport>

    <div class="admin-html-files__board">
      <p v-if="!files.length" class="admin-html-files__empty">
        暂无 HTML 文件，点击「新建文件」开始创建。
      </p>

      <div v-else class="admin-html-files__table">
        <div class="admin-html-files__list-head" aria-hidden="true">
          <span>标题</span>
          <span>简介</span>
          <span>路径</span>
          <span>更新时间</span>
          <span />
        </div>

        <ul class="admin-html-files__list">
          <li v-for="file in files" :key="file.slug" class="admin-html-files__item">
            <h3 class="admin-html-files__title">{{ file.title }}</h3>
            <p class="admin-html-files__desc" :class="{ 'is-empty': !file.description }">
              {{ file.description || '—' }}
            </p>
            <code class="admin-html-files__path">{{ file.publicPath }}</code>
            <time class="admin-html-files__date">{{ formatDate(file.updatedAt) }}</time>
            <div
              class="admin-html-files__menu"
              :class="{ 'is-open': openMenuSlug === file.slug }"
            >
              <button
                type="button"
                class="admin-html-files__menu-trigger"
                :aria-expanded="openMenuSlug === file.slug"
                aria-label="更多操作"
                :disabled="saving"
                @click.stop="toggleMenu(file.slug, $event)"
              >
                <span class="i-mdi-dots-vertical" aria-hidden="true" />
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="openMenuFile && menuPosition"
        class="admin-html-files__menu-dropdown"
        :style="menuPosition"
        @click.stop
      >
        <button
          type="button"
          class="admin-html-files__menu-item"
          @click="handleEditFromMenu(openMenuFile.slug)"
        >
          编辑
        </button>
        <button
          type="button"
          class="admin-html-files__menu-item"
          @click="openPublicFile(openMenuFile.publicPath)"
        >
          访问
        </button>
        <button
          type="button"
          class="admin-html-files__menu-item admin-html-files__menu-item--danger"
          :disabled="saving"
          @click="deleteFile(openMenuFile)"
        >
          {{ saving ? '删除中…' : '删除' }}
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="dialogOpen" class="admin-html-files-dialog" @click.self="closeDialog">
        <div class="admin-html-files-dialog__panel" role="dialog" aria-modal="true" :aria-label="dialogTitle">
          <header class="admin-html-files-dialog__head">
            <h2>{{ dialogTitle }}</h2>
            <button type="button" class="admin-html-files-dialog__close" aria-label="关闭" @click="closeDialog">
              <span class="i-mdi-close" aria-hidden="true" />
            </button>
          </header>

          <div class="admin-html-files-dialog__body">
            <div class="admin-html-files-dialog__row">
              <label class="admin-html-files-dialog__field">
                <span>文件名</span>
                <div class="admin-html-files-dialog__filename">
                  <input
                    v-model="draft.slug"
                    type="text"
                    placeholder="demo"
                    :readonly="!isNew"
                  >
                  <span>.html</span>
                </div>
                <small v-if="previewPath">访问路径：{{ previewPath }}</small>
              </label>

              <label class="admin-html-files-dialog__field">
                <span>标题</span>
                <input v-model="draft.title" type="text" placeholder="页面标题">
              </label>
            </div>

            <label class="admin-html-files-dialog__field">
              <span>描述</span>
              <input v-model="draft.description" type="text" placeholder="可选，用于文件列表展示">
            </label>

            <label class="admin-html-files-dialog__field admin-html-files-dialog__field--code">
              <span>HTML 内容</span>
              <textarea
                v-model="draft.content"
                rows="18"
                spellcheck="false"
                placeholder="在此粘贴或编写 HTML 源码"
              />
            </label>
          </div>

          <footer class="admin-html-files-dialog__foot">
            <button
              v-if="!isNew"
              type="button"
              class="admin-html-files__btn admin-html-files__btn--danger"
              :disabled="saving"
              @click="deleteCurrent"
            >
              删除
            </button>
            <div class="admin-html-files-dialog__foot-actions">
              <button type="button" class="admin-html-files__btn admin-html-files__btn--ghost" @click="closeDialog">
                取消
              </button>
              <button type="button" class="admin-html-files__btn admin-html-files__btn--primary" :disabled="saving" @click="saveDraft">
                {{ saving ? '保存中…' : '保存' }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.admin-html-files {
  &__board {
    border: 1px solid #000;
    border-radius: 12px;
    background: #fff;
    padding: 0.75rem;
  }

  &__empty {
    margin: 0;
    padding: 1.5rem 1rem;
    text-align: center;
    color: #777;
  }

  &__table {
    min-width: 0;
  }

  &__list-head,
  &__item {
    display: grid;
    grid-template-columns:
      minmax(5.5rem, 8rem)
      minmax(0, 1fr)
      minmax(5.5rem, 7rem)
      minmax(8.75rem, 10.25rem)
      1.75rem;
    align-items: center;
    column-gap: 0.75rem;
  }

  &__list-head {
    padding: 0 0.7rem 0.35rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: #999;

    span:nth-child(3),
    span:nth-child(4) {
      white-space: nowrap;
    }
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.4rem;
  }

  &__item {
    padding: 0.42rem 0.7rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fafafa;
  }

  &__title {
    margin: 0;
    min-width: 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: #222;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__desc {
    margin: 0;
    min-width: 0;
    color: #777;
    font-size: 0.8125rem;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.is-empty {
      color: #bbb;
    }
  }

  &__path {
    justify-self: start;
    max-width: 100%;
    padding: 0.05rem 0.3rem;
    border-radius: 4px;
    background: #f0f0f3;
    color: #444;
    font-size: 0.6875rem;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__date {
    justify-self: start;
    color: #888;
    font-size: 0.6875rem;
    line-height: 1.3;
    white-space: nowrap;
  }

  &__menu {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    justify-content: center;
  }

  &__menu-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #666;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;

    span {
      width: 1.15rem;
      height: 1.15rem;
    }

    &:hover:not(:disabled) {
      background: #f0f0f3;
      color: #333;
    }

    &:disabled {
      opacity: 0.55;
      cursor: wait;
    }
  }

  &__menu.is-open &__menu-trigger {
    background: #f0f0f3;
    color: #e93d6d;
  }

  &__menu-dropdown {
    position: fixed;
    z-index: 1200;
    min-width: 112px;
    padding: 0.35rem;
    border: 1px solid #000;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
  }

  &__menu-item {
    display: block;
    width: 100%;
    padding: 0.45rem 0.7rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #444;
    font-size: 0.8125rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;

    &:hover:not(:disabled) {
      background: rgb(233 61 109 / 12%);
      color: #e93d6d;
    }

    &--danger {
      color: #e03131;

      &:hover:not(:disabled) {
        background: rgb(224 49 49 / 10%);
        color: #c0392b;
      }
    }

    &:disabled {
      opacity: 0.65;
      cursor: wait;
    }
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.25rem;
    padding: 0 0.9rem;
    border-radius: 8px;
    border: 1px solid #000;
    background: #fff;
    color: #222;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;

    &--primary {
      background: #e93d6d;
      border-color: #e93d6d;
      color: #fff;
    }

    &--ghost {
      background: #fff;
    }

    &--danger {
      background: #fff;
      border-color: #c0392b;
      color: #c0392b;
    }

    &:disabled {
      opacity: 0.65;
      cursor: wait;
    }
  }
}

.admin-html-files-dialog {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(0 0 0 / 45%);

  &__panel {
    width: min(920px, 100%);
    max-height: min(92vh, 900px);
    display: flex;
    flex-direction: column;
    border: 1px solid #000;
    border-radius: 12px;
    background: #fff;
    overflow: hidden;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #eee;

    h2 {
      margin: 0;
      font-size: 1.05rem;
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
    cursor: pointer;

    span {
      width: 1.2rem;
      height: 1.2rem;
    }
  }

  &__body {
    flex: 1;
    overflow: auto;
    padding: 0.85rem 1rem 1rem;
    display: grid;
    gap: 0.55rem;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    align-items: start;

    .admin-html-files-dialog__field {
      position: relative;
      padding-bottom: 1.05rem;
    }

    .admin-html-files-dialog__field small {
      position: absolute;
      left: 0;
      bottom: 0;
      min-height: 0.875rem;
    }
  }

  &__field {
    display: grid;
    gap: 0.25rem;

    > span {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #444;
    }

    input,
    textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 0 0.65rem;
      border: 1px solid #000;
      border-radius: 8px;
      font: inherit;
      line-height: 1.35;
    }

    input {
      height: 2rem;
      min-height: 2rem;
    }

    small {
      color: #888;
      font-size: 0.6875rem;
      line-height: 1.3;
    }

    &--code textarea {
      padding: 0.65rem 0.75rem;
      font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
      font-size: 0.8125rem;
      line-height: 1.55;
      resize: vertical;
      min-height: 320px;
    }
  }

  &__filename {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    height: 2rem;

    input {
      flex: 1;
      min-width: 0;
      height: 100%;
      min-height: 0;
    }

    > span {
      flex-shrink: 0;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1;
      color: #666;
    }
  }

  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-top: 1px solid #eee;
  }

  &__foot-actions {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }
}

@media (max-width: 768px) {
  .admin-html-files__list-head {
    display: none;
  }

  .admin-html-files__item {
    grid-template-columns: minmax(0, 1fr) 1.75rem;
    grid-template-rows: auto auto auto auto;
    row-gap: 0.2rem;
    align-items: start;
  }

  .admin-html-files__title {
    grid-column: 1;
    grid-row: 1;
  }

  .admin-html-files__desc {
    grid-column: 1;
    grid-row: 2;
    white-space: normal;
  }

  .admin-html-files__path {
    grid-column: 1;
    grid-row: 3;
  }

  .admin-html-files__date {
    grid-column: 1;
    grid-row: 4;
  }

  .admin-html-files__menu {
    grid-column: 2;
    grid-row: 1 / -1;
    align-self: start;
    margin-top: 0.05rem;
  }

  .admin-html-files-dialog {
    padding: 0.5rem;

    &__panel {
      max-height: 96vh;
    }

    &__row {
      grid-template-columns: 1fr;
    }
  }
}
</style>

<style lang="scss">
.admin-html-files__header {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 0.75rem;
}

.admin-html-files__heading {
  h1 {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 700;
    color: #222;
  }

  p {
    margin: 0.1rem 0 0;
    font-size: 0.75rem;
    color: #888;
  }
}

.admin-html-files__actions {
  margin-left: auto;
  display: flex;
  gap: 0.45rem;
}
</style>
