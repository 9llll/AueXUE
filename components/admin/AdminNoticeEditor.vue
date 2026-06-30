<script setup lang="ts">
import type { NoticeBoard, NoticeLine, NoticeSection } from '../../types/notice'
import { inject, onBeforeUnmount, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { adminTopbarTargetKey } from '../../utils/adminShellContext'
import { useAdminToast } from '../../composables/useAdminToast'

const props = defineProps<{
  initialTitle?: string
  initialSections?: NoticeSection[]
}>()

const emit = defineEmits<{
  save: [payload: NoticeBoard]
}>()

const title = ref(String(props.initialTitle || '公告栏'))
const sections = ref<NoticeSection[]>(cloneSections(props.initialSections || []))
const saving = ref(false)
const adminToast = useAdminToast()
const showTopbar = ref(true)
const topbarTarget = inject<Ref<HTMLElement | null>>(adminTopbarTargetKey, ref(null))

function cloneSections(input: NoticeSection[]): NoticeSection[] {
  return input.map(section => ({
    label: section.label || '',
    lines: (section.lines || []).map(line => ({
      text: line.text || '',
      url: line.url || '',
    })),
  }))
}

function createEmptyLine(): NoticeLine {
  return { text: '', url: '' }
}

function createEmptySection(): NoticeSection {
  return {
    label: '新分组',
    lines: [createEmptyLine()],
  }
}

function addSection() {
  sections.value.push(createEmptySection())
}

function removeSection(index: number) {
  sections.value.splice(index, 1)
}

function addLine(sectionIndex: number) {
  sections.value[sectionIndex]?.lines.push(createEmptyLine())
}

function removeLine(sectionIndex: number, lineIndex: number) {
  const section = sections.value[sectionIndex]
  if (!section)
    return
  section.lines.splice(lineIndex, 1)
  if (!section.lines.length)
    section.lines.push(createEmptyLine())
}

function buildPayload(): NoticeBoard {
  return {
    title: title.value.trim() || '公告栏',
    sections: sections.value
      .map((section) => {
        const label = section.label.trim()
        const lines = section.lines
          .map((line) => {
            const text = line.text.trim()
            if (!text)
              return null
            const url = line.url?.trim()
            return url ? { text, url } : { text }
          })
          .filter((line): line is NoticeLine => Boolean(line))

        if (!label && !lines.length)
          return null

        return {
          label: label || '分组',
          lines,
        }
      })
      .filter((section): section is NoticeSection => Boolean(section)),
  }
}

function onSave() {
  const payload = buildPayload()
  if (!payload.sections.length) {
    adminToast.error('请至少保留一个有效分组与一行内容')
    return
  }

  saving.value = true
  emit('save', payload)
}

function teardownEditor() {
  showTopbar.value = false
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
  <div class="admin-notice">
    <Teleport v-if="showTopbar && topbarTarget" :to="topbarTarget">
      <header class="admin-notice__header">
        <div class="admin-notice__heading">
          <h1>公告栏管理</h1>
          <p>编辑首页左侧公告栏内容</p>
        </div>
        <div class="admin-notice__actions">
          <button type="button" class="admin-notice__btn admin-notice__btn--primary" :disabled="saving" @click="onSave">
            {{ saving ? '保存中…' : '保存公告栏' }}
          </button>
        </div>
      </header>
    </Teleport>

    <section class="admin-notice__meta">
      <label class="admin-notice__field admin-notice__field--full">
        <span>公告标题</span>
        <input v-model="title" type="text" placeholder="公告栏">
      </label>
    </section>

    <section class="admin-notice__sections">
      <div
        v-for="(section, sectionIndex) in sections"
        :key="`section-${sectionIndex}`"
        class="admin-notice__section"
      >
        <div class="admin-notice__section-head">
          <label class="admin-notice__field admin-notice__field--grow">
            <span>分组标题</span>
            <input v-model="section.label" type="text" placeholder="--- 主域名 ---">
          </label>
          <button
            type="button"
            class="admin-notice__btn admin-notice__btn--ghost admin-notice__btn--compact"
            @click="removeSection(sectionIndex)"
          >
            删除分组
          </button>
        </div>

        <div class="admin-notice__lines">
          <div
            v-for="(line, lineIndex) in section.lines"
            :key="`line-${sectionIndex}-${lineIndex}`"
            class="admin-notice__line-row"
          >
            <label class="admin-notice__field">
              <span>显示文字</span>
              <input v-model="line.text" type="text" placeholder="daily.example.com">
            </label>
            <label class="admin-notice__field">
              <span>链接（可选）</span>
              <input v-model="line.url" type="text" placeholder="留空则自动识别域名">
            </label>
            <button
              type="button"
              class="admin-notice__btn admin-notice__btn--ghost admin-notice__btn--compact"
              @click="removeLine(sectionIndex, lineIndex)"
            >
              删除
            </button>
          </div>
        </div>

        <button
          type="button"
          class="admin-notice__btn admin-notice__btn--ghost"
          @click="addLine(sectionIndex)"
        >
          添加一行
        </button>
      </div>

      <button type="button" class="admin-notice__btn admin-notice__btn--ghost" @click="addSection">
        添加分组
      </button>
    </section>
  </div>
</template>

<style scoped lang="scss">
.admin-notice {
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

    &--compact {
      height: 2.125rem;
      padding: 0 0.75rem;
      align-self: flex-end;
    }

    &:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
  }

  &__meta,
  &__section {
    margin-bottom: 1rem;
    padding: 1rem;
    border: var(--admin-border);
    border-radius: 10px;
    background: #fff;
  }

  &__section-head {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
    margin-bottom: 0.75rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;

    &--full {
      width: 100%;
    }

    &--grow {
      flex: 1;
    }

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

  &__lines {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  &__line-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: end;
  }

  @media (max-width: 768px) {
    max-width: none;

    &__meta,
    &__section {
      padding: 0.75rem;
    }

    &__line-row {
      grid-template-columns: 1fr;
    }

    &__section-head {
      flex-direction: column;
      align-items: stretch;
    }

    &__btn--compact {
      align-self: stretch;
    }
  }
}
</style>
