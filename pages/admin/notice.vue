<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminNoticeEditor from '../../components/admin/AdminNoticeEditor.vue'
import { useDynamicNotice } from '../../composables/useDynamicNotice'
import { useAdminAuth } from '../../composables/useAdminAuth'
import { fetchAdminNotice, saveAdminNotice } from '../../utils/adminNoticeApi'
import type { NoticeBoard, NoticeSection } from '../../types/notice'

const router = useRouter()
const { isAuthenticated, refresh, loading, username, logout } = useAdminAuth()
const { loadNotice } = useDynamicNotice()
const editorRef = ref<InstanceType<typeof AdminNoticeEditor> | null>(null)
const pageLoading = ref(true)
const error = ref<string | null>(null)
const title = ref('公告栏')
const sections = ref<NoticeSection[]>([])

onMounted(async () => {
  await refresh()
  if (!isAuthenticated.value) {
    await router.replace('/admin')
    return
  }

  try {
    const data = await fetchAdminNotice()
    title.value = data.title
    sections.value = data.sections
  }
  catch (err) {
    if (err instanceof Error && /404|不存在/.test(err.message)) {
      title.value = '公告栏'
      sections.value = [{
        label: '--- 主域名 ---',
        lines: [{ text: '' }],
      }]
    }
    else {
      error.value = err instanceof Error ? err.message : '加载公告栏失败'
    }
  }
  finally {
    pageLoading.value = false
  }
})

async function handleSave(payload: NoticeBoard) {
  editorRef.value?.setSaving(true)
  try {
    await saveAdminNotice(payload)
    await loadNotice(true)
    editorRef.value?.setSuccess('公告栏已保存')
  }
  catch (err) {
    editorRef.value?.setError(err instanceof Error ? err.message : '保存失败')
  }
  finally {
    editorRef.value?.setSaving(false)
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
    <AdminNoticeEditor
      v-else-if="isAuthenticated"
      ref="editorRef"
      :initial-title="title"
      :initial-sections="sections"
      @save="handleSave"
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
