<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  minHeight?: number
}>(), {
  placeholder: '开始写作…',
  minHeight: 420,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const VDITOR_CDN = 'https://cdn.jsdelivr.net/npm/vditor@3.11.2'

const containerRef = ref<HTMLElement>()
const editorRef = shallowRef<Vditor>()
const ready = ref(false)
let destroyed = false
let pendingInstance: Vditor | null = null

let irElement: HTMLElement | null = null
let syncCodeBlockPreview: (() => void) | null = null
let suppressCodeLangHint: (() => void) | null = null

function focusCodeIfInInfo(vditor: Vditor) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0)
    return

  let node: Node | null = selection.getRangeAt(0).startContainer
  if (node.nodeType === Node.TEXT_NODE)
    node = node.parentElement

  const info = (node as Element | null)?.closest?.('[data-type="code-block-info"]')
  if (!info)
    return

  vditor.vditor.hint.element.style.display = 'none'
  vditor.vditor.hint.recentLanguage = ''

  const codeEl = info.parentElement?.querySelector('.vditor-ir__marker--pre code')
  if (!codeEl?.firstChild)
    return

  const range = document.createRange()
  range.selectNodeContents(codeEl)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

function bindCodeBlockLangSuppress(vditor: Vditor) {
  const element = vditor.vditor.ir.element
  vditor.vditor.hint.recentLanguage = ''
  suppressCodeLangHint = () => focusCodeIfInInfo(vditor)

  const events = ['input', 'keyup', 'click', 'mouseup'] as const
  for (const eventName of events)
    element.addEventListener(eventName, suppressCodeLangHint)
}

function isCodeBlockComplete(node: Element) {
  const closeMarker = node.querySelector('[data-type="code-block-close-marker"]')
  if (!closeMarker)
    return false
  return closeMarker.textContent?.replace(/\u200b/g, '').trim() === '```'
}

function bindCodeBlockPreviewSync(vditor: Vditor) {
  irElement = vditor.vditor.ir.element
  syncCodeBlockPreview = () => {
    irElement?.querySelectorAll('[data-type="code-block"]').forEach((node) => {
      const preview = node.querySelector('.vditor-ir__preview') as HTMLElement | null
      if (!preview)
        return

      const editing = node.classList.contains('vditor-ir__node--expand')
      const complete = isCodeBlockComplete(node)
      preview.hidden = editing || !complete
    })
  }

  const events = ['input', 'keyup', 'click', 'mouseup'] as const
  for (const eventName of events)
    irElement.addEventListener(eventName, syncCodeBlockPreview)

  syncCodeBlockPreview()
}

function unbindCodeBlockPreviewSync() {
  const element = irElement
  if (!element || !syncCodeBlockPreview)
    return

  const events = ['input', 'keyup', 'click', 'mouseup'] as const
  for (const eventName of events) {
    element.removeEventListener(eventName, syncCodeBlockPreview)
    if (suppressCodeLangHint)
      element.removeEventListener(eventName, suppressCodeLangHint)
  }

  irElement = null
  syncCodeBlockPreview = null
  suppressCodeLangHint = null
}

function destroyEditor() {
  if (destroyed)
    return

  destroyed = true
  unbindCodeBlockPreviewSync()

  const instance = editorRef.value ?? pendingInstance
  pendingInstance = null

  try {
    instance?.destroy()
  }
  catch {
    // Vditor may throw if destroyed before init completes
  }

  editorRef.value = undefined
  ready.value = false

  if (containerRef.value)
    containerRef.value.innerHTML = ''
}

onMounted(() => {
  if (!containerRef.value)
    return

  destroyed = false

  const instance = new Vditor(containerRef.value, {
    cdn: VDITOR_CDN,
    mode: 'ir',
    lang: 'zh_CN',
    theme: 'classic',
    placeholder: props.placeholder,
    minHeight: props.minHeight,
    cache: { enable: false },
    toolbarConfig: { hide: false, pin: false },
    toolbar: [
      'emoji', 'headings', 'bold', 'italic', 'strike', '|',
      'line', 'quote', 'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
      'code', 'link', 'table', '|',
      'undo', 'redo', '|',
      'fullscreen',
    ],
    outline: { enable: false },
    counter: { enable: false },
    resize: { enable: false },
    value: props.modelValue || '',
    input: (value) => {
      emit('update:modelValue', value)
      syncCodeBlockPreview?.()
    },
    after: () => {
      if (destroyed) {
        try {
          instance.destroy()
        }
        catch {
          // ignore
        }
        return
      }

      editorRef.value = instance
      ready.value = true

      const initial = props.modelValue || ''
      if (initial && instance.getValue() !== initial)
        instance.setValue(initial)

      bindCodeBlockPreviewSync(instance)
      bindCodeBlockLangSuppress(instance)
    },
    hint: {
      emojiPath: `${VDITOR_CDN}/dist/images/emoji`,
    },
    preview: {
      markdown: {
        toc: true,
        mark: true,
        autoSpace: true,
        codeBlockPreview: true,
      },
      hljs: {
        enable: true,
        lineNumber: false,
        style: 'github',
        langs: [],
        defaultLang: '',
      },
    },
  })

  pendingInstance = instance
})

watch([() => props.modelValue, ready], ([value, isReady]) => {
  if (!editorRef.value || !isReady)
    return
  const current = editorRef.value.getValue()
  if (value !== current)
    editorRef.value.setValue(value)
}, { immediate: true })

onBeforeUnmount(() => {
  destroyEditor()
})

defineExpose({
  destroy: destroyEditor,
  getValue: () => editorRef.value?.getValue() ?? props.modelValue,
  focus: () => editorRef.value?.focus(),
})
</script>

<template>
  <div class="admin-md-editor">
    <div ref="containerRef" class="admin-md-editor__host" />
  </div>
</template>

<style scoped lang="scss">
.admin-md-editor {
  --admin-border: 1px solid #000;
  --admin-border-color: #000;
  color-scheme: light;
  overflow: visible;

  &__host {
    min-height: 420px;
    overflow: visible;
  }

  :deep(.vditor) {
    border: var(--admin-border);
    border-radius: 8px;
    background: #fff;
    color: #111;
    font-family: inherit;
    overflow: visible;
  }

  :deep(.vditor-toolbar),
  :deep(.vditor-toolbar.vditor-toolbar--pin) {
    position: static;
    top: auto;
    z-index: auto;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
    box-sizing: border-box;
    gap: 0.125rem;
    padding: 0.35rem 0.65rem;
    border-bottom: var(--admin-border);
    background: #fff;
    border-radius: 8px 8px 0 0;
  }

  :deep(.vditor-toolbar__item) {
    flex: 0 0 auto;

    .vditor-tooltipped {
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
    }
  }

  :deep(.vditor-toolbar__item:last-child) {
    margin-left: auto;
  }

  :deep(.vditor-toolbar__divider) {
    flex: 0 0 auto;
    align-self: center;
    width: 1px;
    height: 1.125rem;
    margin: 0 0.45rem;
    border-left: 1px solid rgb(0 0 0 / 12%);
    background: transparent;
  }

  :deep(.vditor-ir) {
    padding: 0.5rem 0.875rem;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #111;
    background: #fff;
  }

  :deep(.vditor-ir pre.vditor-reset) {
    background-color: #fff;
    color: #111;
    -webkit-text-fill-color: #111;
    margin: 0;
    white-space: pre-wrap;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    padding: 0;
  }

  :deep(.vditor-ir p),
  :deep(.vditor-ir .vditor-ir__preview p) {
    margin: 0 0 0.25rem;
  }

  :deep(.vditor-ir__preview) {
    min-height: 0;
    color: #111;
  }

  :deep(.vditor-ir__preview *:not(a):not(code)) {
    color: inherit;
    -webkit-text-fill-color: currentcolor;
  }

  :deep(.vditor-ir__preview code:not(.hljs)) {
    color: #111;
  }

  /* 隐藏语言标识，不弹出语言选择 */
  :deep([data-type="code-block-info"]) {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
  }

  /* 编辑中（光标在块内）：只显示源码，隐藏预览层 */
  :deep(.vditor-ir__node--expand .vditor-ir__preview) {
    display: none !important;
  }

  /* 未闭合的代码块不显示预览 */
  :deep(.vditor-ir__node[data-type="code-block"]:not(:has([data-type="code-block-close-marker"])) .vditor-ir__preview) {
    display: none !important;
  }

  :deep(.vditor-ir h1) {
    margin: 0.75rem 0 0.375rem;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.35;
    border-bottom: none;
  }

  :deep(.vditor-ir h2) {
    margin: 0.625rem 0 0.3125rem;
    font-size: 1.25rem;
    font-weight: 650;
    line-height: 1.35;
    border-bottom: none;
  }

  :deep(.vditor-ir h3) {
    margin: 0.5rem 0 0.25rem;
    font-size: 1.0625rem;
    font-weight: 600;
    line-height: 1.4;
  }

  :deep(.vditor-ir h4),
  :deep(.vditor-ir h5),
  :deep(.vditor-ir h6) {
    margin: 0.4375rem 0 0.1875rem;
    font-weight: 600;
  }

  :deep(.vditor-ir blockquote) {
    margin: 0.375rem 0;
    padding: 0.125rem 0 0.125rem 0.75rem;
    border-left: 3px solid #000;
    color: #444;
  }

  :deep(.vditor-ir__marker) {
    color: #555;
  }

  :deep(.vditor-ir ul),
  :deep(.vditor-ir ol) {
    margin: 0.25rem 0;
    padding-left: 1.375rem;
  }

  :deep(.vditor-ir li) {
    margin: 0.125rem 0;
  }

  :deep(.vditor-ir code:not(.hljs)) {
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    background: rgb(223 145 147 / 12%);
    font-family: ui-monospace, Consolas, monospace;
    font-size: 0.875em;
  }

  /* 代码块编辑态：清晰源码样式 */
  :deep(.vditor-ir__node--expand[data-type="code-block"]) {
    background: #fff;
    border: 1px solid #000;
    border-radius: 8px;
    padding: 0.25rem 0.375rem;
    margin: 0.25rem 0;
  }

  :deep(.vditor-ir__node--expand[data-type="code-block"] .vditor-ir__marker--pre),
  :deep(.vditor-ir__node--expand[data-type="code-block"] .vditor-ir__marker--pre code) {
    display: block;
    width: auto;
    height: auto;
    overflow: visible;
    background: transparent !important;
    background-image: none !important;
    color: #111;
    font-family: ui-monospace, Consolas, 'Cascadia Code', monospace;
    font-size: 0.875rem;
    line-height: 1.45;
    white-space: pre-wrap;
  }

  :deep(.vditor-ir__node--expand[data-type="code-block"]:before),
  :deep(.vditor-ir__node--expand[data-type="code-block"]:after) {
    color: #555;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 0.8125rem;
  }

  /* 代码块预览态：实色背景，去掉 Vditor 默认透明格 */
  :deep(.vditor-ir__preview pre),
  :deep(.vditor-ir__preview pre > code),
  :deep(.vditor-ir__preview .hljs) {
    background: #f6f8fa !important;
    background-image: none !important;
    color: #111 !important;
    border: var(--admin-border);
    border-radius: 8px;
    font-family: ui-monospace, Consolas, 'Cascadia Code', monospace;
    font-size: 0.875rem;
    line-height: 1.45;
  }

  :deep(.vditor-ir__preview pre) {
    position: relative;
    margin: 0.375rem 0;
    padding: 0;
    overflow: auto;
  }

  :deep(.vditor-ir__preview pre > code) {
    display: block;
    padding: 0.75rem 1rem;
    overflow: auto;
  }

  :deep(.vditor-ir__preview .vditor-copy) {
    display: none;
    position: absolute;
    top: 0.375rem;
    right: 0.375rem;
    z-index: 1;
  }

  :deep(.vditor-ir__preview pre:hover .vditor-copy) {
    display: block;
  }

  :deep(.vditor-ir a) {
    color: #df9193;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(.vditor-ir hr) {
    margin: 1rem 0;
    border: none;
    border-top: var(--admin-border);
  }

  :deep(.vditor-ir table) {
    margin: 0.75rem 0;
    border-collapse: collapse;
    width: 100%;
  }

  :deep(.vditor-ir th),
  :deep(.vditor-ir td) {
    border: var(--admin-border);
    padding: 0.375rem 0.625rem;
  }

  :deep(.vditor-ir .vditor-task) {
    list-style: none;
    margin-left: -1.25rem;
  }

  :deep(.vditor-ir:focus) {
    outline: none;
  }

  :deep(.vditor--focus) {
    border-color: #df9193;
    box-shadow: 0 0 0 2px rgb(223 145 147 / 12%);
  }

  @media (max-width: 768px) {
    &__host {
      min-height: 280px;
    }

    :deep(.vditor-toolbar) {
      padding: 0.25rem 0.4rem;
      gap: 0.05rem;
    }

    :deep(.vditor-toolbar__item .vditor-tooltipped) {
      width: 1.5rem;
      height: 1.5rem;
    }

    :deep(.vditor-ir) {
      padding: 0.45rem 0.6rem;
      font-size: 0.8125rem;
    }

    :deep(.vditor-ir h1) {
      font-size: 1.25rem;
    }

    :deep(.vditor-ir h2) {
      font-size: 1.0625rem;
    }
  }
}
</style>

<style lang="scss">
html.dark .admin-md-editor {
  .vditor-ir,
  .vditor-ir pre.vditor-reset,
  .vditor-ir__preview,
  .vditor-ir__preview :is(p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, strong, em) {
    color: #111 !important;
    -webkit-text-fill-color: currentcolor !important;
  }
}
</style>
