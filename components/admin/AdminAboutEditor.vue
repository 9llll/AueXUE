<script setup lang="ts">
import type { AboutFrontmatter } from '../../types/about'
import type { PostFrontmatter } from '../../types/posts'
import { inject, onBeforeUnmount, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import AdminMarkdownEditor from './AdminMarkdownEditor.vue'
import { adminTopbarTargetKey } from '../../utils/adminShellContext'
import { serializeFrontmatter } from '../../utils/aboutFrontmatter'
import { useAdminToast } from '../../composables/useAdminToast'

const props = defineProps<{
  initialFrontmatter?: Partial<AboutFrontmatter>
  initialMarkdown?: string
}>()

const emit = defineEmits<{
  save: [payload: { source: string }]
}>()

const title = ref(String(props.initialFrontmatter?.title || '关于我'))
const cover = ref(String(props.initialFrontmatter?.cover || ''))
const date = ref(String(props.initialFrontmatter?.date || today()))
const markdown = ref(props.initialMarkdown || '\n# 关于本站\n\n')
const saving = ref(false)
const adminToast = useAdminToast()
const showTopbar = ref(true)
const mdEditorRef = ref<InstanceType<typeof AdminMarkdownEditor> | null>(null)
const topbarTarget = inject<Ref<HTMLElement | null>>(adminTopbarTargetKey, ref(null))

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function buildSource() {
  const frontmatter: PostFrontmatter = {
    title: title.value.trim(),
    layout: 'post',
    cover: cover.value.trim() || undefined,
    date: date.value.trim() || today(),
  }

  const body = markdown.value.startsWith('\n') ? markdown.value : `\n${markdown.value}`
  return serializeFrontmatter(frontmatter, body)
}

function onSave() {
  if (!title.value.trim()) {
    adminToast.error('请填写页面标题')
    return
  }

  saving.value = true
  emit('save', { source: buildSource() })
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
})
</script>

<template>
  <div class="admin-about">
    <Teleport v-if="showTopbar && topbarTarget" :to="topbarTarget">
      <header class="admin-about__header">
        <div class="admin-about__heading">
          <h1>关于页管理</h1>
          <p>可视化编辑关于页正文</p>
        </div>
        <div class="admin-about__actions">
          <button type="button" class="admin-about__btn admin-about__btn--primary" :disabled="saving" @click="onSave">
            {{ saving ? '保存中…' : '保存关于页' }}
          </button>
        </div>
      </header>
    </Teleport>

    <section class="admin-about__meta">
      <label class="admin-about__field">
        <span>页面标题</span>
        <input v-model="title" type="text" placeholder="关于我">
      </label>
      <label class="admin-about__field">
        <span>头图 URL</span>
        <input v-model="cover" type="url" placeholder="https://...">
      </label>
      <label class="admin-about__field">
        <span>发布日期</span>
        <input v-model="date" type="date">
      </label>
    </section>

    <section class="admin-about__editor">
      <ClientOnly>
        <AdminMarkdownEditor
          ref="mdEditorRef"
          v-model="markdown"
          placeholder="开始编写关于页内容…"
          :min-height="520"
        />
        <template #fallback>
          <div class="admin-about__editor-fallback">
            编辑器加载中…
          </div>
        </template>
      </ClientOnly>
    </section>
  </div>
</template>

<style scoped lang="scss">
.admin-about {
  --admin-pink: #e93d6d;
  --admin-border: 1px solid #000;
  max-width: 860px;
  margin: 0 auto;

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
    gap: 0.4rem;
    flex-shrink: 0;
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

  &__meta {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 1rem;
    border: var(--admin-border);
    border-radius: 10px;
    background: #fff;
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

    input {
      height: 2.125rem;
      padding: 0 0.75rem;
      border: var(--admin-border);
      border-radius: 8px;
      font-size: 0.875rem;
      background: #fff;
      color: #111;
    }
  }

  &__editor {
    border: var(--admin-border);
    border-radius: 10px;
    background: #fff;
    overflow: hidden;
  }

  &__editor-fallback {
    min-height: 520px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    max-width: none;

    &__meta {
      grid-template-columns: 1fr;
      padding: 0.75rem;
    }

    &__editor-fallback {
      min-height: 360px;
    }
  }
}
</style>
