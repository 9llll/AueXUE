<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminPostEditor from '../../components/admin/AdminPostEditor.vue'
import { invalidateDynamicPostsCache } from '../../composables/useDynamicPosts'
import { useAdminAuth } from '../../composables/useAdminAuth'
import { saveAdminPost } from '../../utils/adminPostsApi'

const router = useRouter()
const { isAuthenticated, refresh, loading, username, logout } = useAdminAuth()
const editorRef = ref<InstanceType<typeof AdminPostEditor> | null>(null)

onMounted(async () => {
  await refresh()
  if (!isAuthenticated.value)
    await router.replace('/admin')
})

async function handleSave(payload: { slug: string, source: string, previousSlug?: string }) {
  editorRef.value?.setSaving(true)
  try {
    await saveAdminPost(payload.slug, payload.source)
    invalidateDynamicPostsCache()
    await router.replace('/admin')
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
    <div v-if="loading">加载中…</div>
    <AdminPostEditor
      v-else-if="isAuthenticated"
      ref="editorRef"
      mode="create"
      @save="handleSave"
    />
  </AdminShell>
</template>

<route lang="yaml">
meta:
  layout: false
</route>
