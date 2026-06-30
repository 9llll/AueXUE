<script setup lang="ts">
import type { PostFrontmatter } from '../../types/posts'
import { computed, inject, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import AdminMarkdownEditor from './AdminMarkdownEditor.vue'
import { adminTopbarTargetKey } from '../../utils/adminShellContext'
import { isValidPostSlug, serializeFrontmatter } from '../../utils/postFrontmatter'
import { normalizePinOrder } from '../../utils/pinOrder'
import { useAdminToast } from '../../composables/useAdminToast'

const props = defineProps<{
  mode: 'create' | 'edit'
  initialSlug?: string
  initialFrontmatter?: Partial<PostFrontmatter>
  initialMarkdown?: string
}>()

const emit = defineEmits<{
  save: [payload: { slug: string, source: string, previousSlug?: string }]
  delete: []
}>()

const originalSlug = ref(props.initialSlug || '')
const slug = ref(props.initialSlug || '')
const slugTouched = ref(Boolean(props.initialSlug))
const title = ref(String(props.initialFrontmatter?.title || ''))
const date = ref(initDateField(props.initialFrontmatter?.date, props.mode === 'create'))
const updated = ref(initDateField(props.initialFrontmatter?.updated, props.mode === 'create'))
const excerpt = ref(String(props.initialFrontmatter?.excerpt || ''))
const cover = ref(String(props.initialFrontmatter?.cover || ''))
const categories = ref(formatCategories(props.initialFrontmatter?.categories))
const pinOrder = ref(initPinOrderField(props.initialFrontmatter))
const tagList = ref(parseTags(props.initialFrontmatter?.tags))
const tagInput = ref('')
const markdown = ref(props.initialMarkdown || '\n')
const saving = ref(false)
const error = ref<string | null>(null)
const adminToast = useAdminToast()
const showTopbar = ref(true)
const mdEditorRef = ref<InstanceType<typeof AdminMarkdownEditor> | null>(null)
const topbarTarget = inject<Ref<HTMLElement | null>>(adminTopbarTargetKey, ref(null))

function asText(value: unknown) {
  return value == null ? '' : String(value)
}

function teardownEditor() {
  showTopbar.value = false
  mdEditorRef.value?.destroy()
}

onBeforeRouteLeave(() => {
  teardownEditor()
  return true
})

onBeforeUnmount(() => {
  teardownEditor()
})

const slugChanged = computed(() =>
  props.mode === 'edit'
  && originalSlug.value
  && asText(slug.value).trim() !== originalSlug.value,
)

const excerptCount = computed(() => excerpt.value.length)

function initPinOrderField(fm?: Partial<PostFrontmatter>) {
  if (!fm)
    return ''
  const value = normalizePinOrder(fm.pin_order ?? fm.top)
  return value > 0 ? String(value) : ''
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function nowDateTimeLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function parseToDateTimeLocal(value: string) {
  const trimmed = value.trim()
  if (!trimmed)
    return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
    return `${trimmed}T00:00`

  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  if (match)
    return `${match[1]}T${match[2]}`

  const d = new Date(normalized)
  if (Number.isNaN(d.getTime()))
    return ''

  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function initDateField(value: PostFrontmatter['date'] | PostFrontmatter['updated'], useNow: boolean) {
  const parsed = parseToDateTimeLocal(value ? String(value) : '')
  if (parsed)
    return parsed
  return useNow ? nowDateTimeLocal() : ''
}

function formatDateTimeForFrontmatter(value: unknown) {
  const trimmed = asText(value).trim()
  if (!trimmed)
    return ''
  if (trimmed.includes('T'))
    return `${trimmed.replace('T', ' ')}:00`
  return trimmed
}

function formatCategories(value: PostFrontmatter['categories']) {
  if (!value)
    return ''
  if (Array.isArray(value))
    return value.join(' / ')
  return String(value)
}

function parseTags(value: PostFrontmatter['tags']) {
  if (!value)
    return [] as string[]
  if (Array.isArray(value))
    return value.map(String)
  return String(value).split(',').map(tag => tag.trim()).filter(Boolean)
}

function slugifyTitle(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
}

watch(title, (value) => {
  if (props.mode === 'create' && !slugTouched.value)
    slug.value = slugifyTitle(value)
})

function onSlugInput() {
  slugTouched.value = true
}

function addTagFromInput() {
  const value = tagInput.value.trim().replace(/,$/, '')
  if (!value)
    return
  for (const part of value.split(',').map(tag => tag.trim()).filter(Boolean)) {
    if (!tagList.value.includes(part))
      tagList.value.push(part)
  }
  tagInput.value = ''
}

function removeTag(index: number) {
  tagList.value.splice(index, 1)
}

function onTagKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addTagFromInput()
  }
  else if (event.key === 'Backspace' && !tagInput.value && tagList.value.length) {
    tagList.value.pop()
  }
}

function buildFrontmatter(): PostFrontmatter {
  const fm: PostFrontmatter = {
    title: asText(title.value).trim(),
    date: formatDateTimeForFrontmatter(asText(date.value)),
  }

  const updatedText = asText(updated.value).trim()
  if (updatedText)
    fm.updated = formatDateTimeForFrontmatter(updatedText)

  const excerptText = asText(excerpt.value).trim()
  if (excerptText)
    fm.excerpt = excerptText

  const coverText = asText(cover.value).trim()
  if (coverText)
    fm.cover = coverText

  const categoriesText = asText(categories.value).trim()
  if (categoriesText)
    fm.categories = categoriesText

  if (tagList.value.length)
    fm.tags = [...tagList.value]

  const pinText = asText(pinOrder.value).trim()
  const pin = Number.parseInt(pinText, 10)
  if (pinText && !Number.isNaN(pin) && pin > 0)
    fm.pin_order = pin

  return fm
}

function buildSource() {
  return serializeFrontmatter(buildFrontmatter(), markdown.value.startsWith('\n') ? markdown.value : `\n${markdown.value}`)
}

function showError(message: string) {
  error.value = message
  adminToast.error(message)
}

function onSave() {
  error.value = null
  addTagFromInput()

  const finalSlug = asText(slug.value).trim()
  if (!finalSlug) {
    showError('请填写 slug（仅支持英文、数字、点、下划线与连字符）')
    return
  }
  if (!isValidPostSlug(finalSlug)) {
    showError('slug 格式无效，只能使用英文、数字、点、下划线与连字符')
    return
  }
  if (!asText(title.value).trim()) {
    showError('请填写标题')
    return
  }
  if (!asText(date.value).trim()) {
    showError('请填写发布日期')
    return
  }

  emit('save', {
    slug: finalSlug,
    source: buildSource(),
    previousSlug: slugChanged.value ? originalSlug.value : undefined,
  })
}

function onDelete() {
  if (confirm('确定删除这篇文章吗？此操作不可恢复。'))
    emit('delete')
}

defineExpose({
  setSaving(value: boolean) {
    saving.value = value
  },
  setError(message: string | null) {
    if (message) {
      error.value = message
      adminToast.error(message)
    }
    else {
      error.value = null
    }
    saving.value = false
  },
  markSaved(newSlug: string) {
    originalSlug.value = newSlug
    slug.value = newSlug
    slugTouched.value = true
  },
})
</script>

<template>
  <div class="admin-editor">
    <Teleport v-if="showTopbar && topbarTarget" :to="topbarTarget">
      <header class="admin-editor__header">
        <div class="admin-editor__heading">
          <h1>{{ mode === 'create' ? '新建文章' : '编辑文章' }}</h1>
          <p>{{ mode === 'create' ? '创建并发布一篇新文章' : '修改并保存文章内容' }}</p>
        </div>
        <div class="admin-editor__actions">
          <RouterLink to="/admin" class="admin-editor__btn admin-editor__btn--ghost admin-editor__btn--cancel">
            取消
          </RouterLink>
          <button type="button" class="admin-editor__btn admin-editor__btn--primary" :disabled="saving" @click="onSave">
            {{ saving ? '保存中…' : '保存文章' }}
          </button>
        </div>
      </header>
    </Teleport>

    <p v-if="error" class="admin-editor__error">
      {{ error }}
    </p>
    <p v-if="slugChanged" class="admin-editor__hint">
      Slug 已修改，保存后将创建新路径并删除旧文章。
    </p>

    <div class="admin-editor__layout">
      <div class="admin-editor__main">
        <section class="admin-editor__meta">
          <div class="admin-editor__split">
            <section class="admin-editor__field admin-editor__field--title">
              <label for="admin-title">文章标题</label>
              <input
                id="admin-title"
                v-model="title"
                type="text"
                placeholder="请输入文章标题"
              >
            </section>
            <section class="admin-editor__field admin-editor__field--slug">
              <label for="admin-slug">文件名 (Slug)</label>
              <input
                id="admin-slug"
                v-model="slug"
                class="admin-editor__input--mono"
                type="text"
                placeholder="english-slug"
                @input="onSlugInput"
              >
            </section>
          </div>

          <section class="admin-editor__field admin-editor__field--excerpt">
            <div class="admin-editor__field-head">
              <label for="admin-excerpt">文章摘要</label>
              <span class="admin-editor__counter">{{ excerptCount }}/200</span>
            </div>
            <input
              id="admin-excerpt"
              v-model="excerpt"
              type="text"
              maxlength="200"
              placeholder="简要描述文章内容"
            >
          </section>
        </section>

        <section class="admin-editor__markdown">
          <ClientOnly>
            <AdminMarkdownEditor
              ref="mdEditorRef"
              v-model="markdown"
              placeholder="输入 Markdown，光标移开后实时渲染…"
            />
            <template #fallback>
              <div class="admin-editor__markdown-fallback">
                编辑器加载中…
              </div>
            </template>
          </ClientOnly>
        </section>
      </div>

      <aside class="admin-editor__aside">
        <section class="admin-editor__panel">
          <div class="admin-editor__panel-field">
            <label for="admin-date">发布时间</label>
            <input id="admin-date" v-model="date" type="datetime-local">
          </div>
          <div class="admin-editor__panel-field">
            <label for="admin-updated">更新时间</label>
            <input id="admin-updated" v-model="updated" type="datetime-local">
          </div>
          <div class="admin-editor__panel-field">
            <label for="admin-pin-order">置顶排序</label>
            <input
              id="admin-pin-order"
              v-model="pinOrder"
              type="number"
              min="0"
              step="1"
              placeholder="0 或不填表示不置顶"
            >
          </div>
        </section>

        <section class="admin-editor__panel">
          <h2 class="admin-editor__panel-title">
            分类
          </h2>
          <div class="admin-editor__panel-field">
            <input id="admin-categories" v-model="categories" type="text" placeholder="例如：生活随笔" aria-label="分类">
          </div>
        </section>

        <section class="admin-editor__panel">
          <h2 class="admin-editor__panel-title">
            标签
          </h2>
          <div class="admin-editor__tags">
            <span v-for="(tag, index) in tagList" :key="tag" class="admin-editor__tag">
              {{ tag }}
              <button type="button" class="admin-editor__tag-remove" @click="removeTag(index)">×</button>
            </span>
            <input
              v-model="tagInput"
              class="admin-editor__tag-input"
              type="text"
              placeholder="输入后回车添加"
              @keydown="onTagKeydown"
              @blur="addTagFromInput"
            >
          </div>
        </section>

        <section class="admin-editor__panel">
          <h2 class="admin-editor__panel-title">
            封面图片
          </h2>
          <div class="admin-editor__panel-field">
            <div class="admin-editor__cover-wrap">
              <input id="admin-cover" v-model="cover" type="url" placeholder="https://..." aria-label="封面 URL">
              <a
                v-if="cover.trim()"
                :href="cover.trim()"
                target="_blank"
                rel="noopener noreferrer"
                class="admin-editor__cover-link i-mdi-open-in-new"
                title="打开链接"
              />
            </div>
          </div>
        </section>

        <button
          v-if="mode === 'edit'"
          type="button"
          class="admin-editor__delete"
          @click="onDelete"
        >
          删除文章
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-editor {
  --admin-pink: #e93d6d;
  --admin-border: 1px solid #000;
  --admin-border-color: #000;

  &__header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    margin: 0;
    box-sizing: border-box;
  }

  &__heading {
    min-width: 0;

    h1 {
      margin: 0 0 0.1rem;
      font-size: 1.0625rem;
      font-weight: 700;
      color: #222;
      line-height: 1.25;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    p {
      margin: 0;
      font-size: 0.75rem;
      color: #888;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    flex: 0 1 auto;
    min-width: 0;
    gap: 0.4rem;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    height: 2.125rem;
    padding: 0 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
    white-space: nowrap;

    &--ghost {
      border: var(--admin-border);
      background: #fff;
      color: #555;

      &:hover {
        border-color: var(--admin-border-color);
        color: #333;
      }
    }

    &--primary {
      border: none;
      background: var(--admin-pink);
      color: #fff;

      &:hover:not(:disabled) {
        background: #d73563;
      }

      &:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
    }
  }

  &__error {
    margin: 0 0 0.75rem;
    color: #c0392b;
    font-size: 0.875rem;
  }

  &__hint {
    margin: 0 0 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    background: rgb(233 61 109 / 10%);
    color: #a86a6c;
    font-size: 0.8125rem;
  }

  &__layout {
    --admin-main-max: 800px;
    --admin-aside-width: 240px;
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    width: 100%;
    max-width: calc(var(--admin-main-max) + var(--admin-aside-width) + 1.25rem);
    margin: 0 auto;
  }

  &__main {
    flex: 1 1 auto;
    min-width: 0;
    max-width: var(--admin-main-max);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.65rem 1rem;
    border: var(--admin-border);
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 1px 4px rgb(0 0 0 / 4%);

    .admin-editor__field {
      gap: 0.25rem;

      label {
        font-size: 0.75rem;
        line-height: 1.2;
      }

      input,
      textarea {
        padding: 0.4rem 0.85rem;
        font-size: 0.875rem;
        line-height: 1.35;
        border-radius: 6px;
      }
    }

    .admin-editor__field--excerpt input {
      box-sizing: border-box;
      height: 2.125rem;
      padding: 0 0.85rem;
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;

    label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #666;
    }

    input,
    textarea {
      width: 100%;
      min-width: 0;
      padding: 0.65rem 0.85rem;
      border: var(--admin-border);
      border-radius: 8px;
      background: #fff;
      font-size: 0.9375rem;
      color: #111;
      line-height: 1.45;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;

      &:focus {
        outline: none;
        border-color: rgb(233 61 109 / 45%);
        box-shadow: 0 0 0 3px rgb(233 61 109 / 10%);
      }

      &::placeholder {
        color: #666;
      }
    }

    textarea {
      resize: vertical;
      min-height: 88px;
    }

    &--title input {
      font-weight: 600;
    }
  }

  &__split {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: 1rem;
    align-items: stretch;

    .admin-editor__field--title input,
    .admin-editor__field--slug input {
      box-sizing: border-box;
      height: 2.125rem;
      padding: 0 0.85rem;
      font-size: 0.875rem;
      line-height: 1.35;
    }
  }

  &__field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  &__counter {
    font-size: 0.75rem;
    color: #aaa;
    font-weight: 400;
  }

  &__input--mono {
    font-family: ui-monospace, Consolas, monospace;
  }

  &__markdown {
    :deep(.admin-md-editor .vditor) {
      border-color: var(--admin-border-color);
    }
  }

  &__markdown-fallback {
    min-height: 420px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: var(--admin-border);
    border-radius: 10px;
    color: #999;
    font-size: 0.875rem;
    background: #fff;
  }

  &__aside {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 0 0 var(--admin-aside-width);
    width: var(--admin-aside-width);
    min-width: 0;
  }

  &__panel {
    padding: 0.65rem 1rem;
    border: var(--admin-border);
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 1px 4px rgb(0 0 0 / 4%);
  }

  &__panel-title {
    margin: 0 0 0.35rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
    line-height: 1.2;
  }

  &__panel-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.35rem;

    &:last-child {
      margin-bottom: 0;
    }

    label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #666;
      line-height: 1.2;
    }

    input {
      box-sizing: border-box;
      width: 100%;
      height: 2.125rem;
      padding: 0 0.65rem;
      border: var(--admin-border);
      border-radius: 6px;
      background: #fff;
      font-size: 0.875rem;
      line-height: 1.35;
      color: #333;

      &:focus {
        outline: none;
        border-color: rgb(233 61 109 / 45%);
        box-shadow: 0 0 0 3px rgb(233 61 109 / 10%);
      }
    }
  }

  &__cover-wrap {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  &__cover-link {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    color: var(--admin-pink);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.55rem;
    border: var(--admin-border);
    border-radius: 6px;
    background: #fff;
    min-height: 2.125rem;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    background: rgb(233 61 109 / 12%);
    color: #c04d6a;
    font-size: 0.75rem;
  }

  &__tag-remove {
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font-size: 0.95rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0.75;

    &:hover {
      opacity: 1;
    }
  }

  &__tag-input {
    flex: 1 1 100px;
    min-width: 80px;
    padding: 0.1rem 0.2rem;
    border: none;
    background: transparent;
    font-size: 0.8125rem;
    line-height: 1.35;
    color: #333;

    &:focus {
      outline: none;
    }

    &::placeholder {
      color: #bbb;
    }
  }

  &__delete {
    padding: 0.4rem 0.65rem;
    border: var(--admin-border);
    border-radius: 6px;
    background: #fff;
    color: #c0392b;
    font-size: 0.75rem;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
      background: #fff5f5;
    }
  }

  @media (max-width: 960px) {
    &__layout {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      max-width: var(--admin-main-max);
      margin: 0 auto;
    }

    &__main {
      width: 100%;
      max-width: none;
    }

    &__aside {
      width: 100%;
      flex: none;
    }
  }

  @media (max-width: 768px) {
    &__heading p {
      display: none;
    }

    &__heading h1 {
      font-size: 0.9375rem;
    }

    &__actions {
      gap: 0.3rem;
    }

    &__btn--cancel {
      display: none;
    }

    &__layout {
      gap: 0.85rem;
    }

    &__meta {
      padding: 0.75rem;
    }

    &__aside {
      padding: 0.75rem;
    }
  }

  @media (max-width: 640px) {
    &__split {
      grid-template-columns: 1fr;
    }

    &__heading h1 {
      font-size: 0.9375rem;
    }
  }
}
</style>
