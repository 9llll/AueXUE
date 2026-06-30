<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminHtmlFilesEditor from '../../components/admin/AdminHtmlFilesEditor.vue'
import { useDynamicHtmlFiles } from '../../composables/useDynamicHtmlFiles'
import { useAdminAuth } from '../../composables/useAdminAuth'
import {
  deleteAdminHtmlFile,
  fetchAdminHtmlFile,
  fetchAdminHtmlFiles,
  saveAdminHtmlFile,
} from '../../utils/adminHtmlFilesApi'
import type { HtmlFileSummary, HtmlFileUpsertPayload } from '../../types/htmlFile'

const router = useRouter()
const { isAuthenticated, refresh, loading, username, logout } = useAdminAuth()
const { loadHtmlFiles } = useDynamicHtmlFiles()
const editorRef = ref<InstanceType<typeof AdminHtmlFilesEditor> | null>(null)
const pageLoading = ref(true)
const error = ref<string | null>(null)
const files = ref<HtmlFileSummary[]>([])

onMounted(async () => {
  await refresh()
  if (!isAuthenticated.value) {
    await router.replace('/admin')
    return
  }

  try {
    const data = await fetchAdminHtmlFiles()
    files.value = data.files
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '加载 HTML 文件失败'
  }
  finally {
    pageLoading.value = false
  }
})

async function reloadFiles() {
  const data = await fetchAdminHtmlFiles()
  files.value = data.files
  editorRef.value?.setFiles(data.files)
  await loadHtmlFiles(true)
}

async function handleLoad(slug: string) {
  try {
    const detail = await fetchAdminHtmlFile(slug)
    editorRef.value?.setDraftContent(detail.content)
  }
  catch (err) {
    editorRef.value?.setError(err instanceof Error ? err.message : '加载文件内容失败')
  }
}

async function handleSave(payload: HtmlFileUpsertPayload) {
  editorRef.value?.setSaving(true)
  try {
    await saveAdminHtmlFile(payload)
    await reloadFiles()
    editorRef.value?.closeDialog()
    editorRef.value?.setSuccess('HTML 文件已保存')
  }
  catch (err) {
    editorRef.value?.setError(err instanceof Error ? err.message : '保存失败')
  }
}

async function handleDelete(payload: { slug: string }) {
  editorRef.value?.setSaving(true)
  try {
    await deleteAdminHtmlFile(payload.slug)
    await reloadFiles()
    editorRef.value?.closeDialog()
    editorRef.value?.setSuccess('HTML 文件已删除')
  }
  catch (err) {
    editorRef.value?.setError(err instanceof Error ? err.message : '删除失败')
  }
}

async function handleLogout() {
  await logout({ clearRemembered: true })
  await router.replace('/admin')
}
</script>

<template>
  <AdminShell :username="username" @logout="handleLogout">
    <div v-if="loading || pageLoading" class="admin-page-loading">
      加载中…
    </div>
    <p v-else-if="error" class="admin-page-error">
      {{ error }}
    </p>
    <AdminHtmlFilesEditor
      v-else-if="isAuthenticated"
      ref="editorRef"
      :initial-files="files"
      @load="handleLoad"
      @save="handleSave"
      @delete="handleDelete"
    />
  </AdminShell>
</template>

<style scoped lang="scss">
.admin-page-loading,
.admin-page-error {
  text-align: center;
  padding: 2rem 0;
}

.admin-page-error {
  color: #c0392b;
}
</style>

<route lang="yaml">
meta:
  layout: false
</route>
