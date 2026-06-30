<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminAboutEditor from '../../components/admin/AdminAboutEditor.vue'
import { useDynamicAbout } from '../../composables/useDynamicAbout'
import { useAdminAuth } from '../../composables/useAdminAuth'
import { fetchAdminAbout, saveAdminAbout } from '../../utils/adminAboutApi'
import type { AboutFrontmatter } from '../../types/about'

const router = useRouter()
const { isAuthenticated, refresh, loading, username, logout } = useAdminAuth()
const { loadAbout } = useDynamicAbout()
const editorRef = ref<InstanceType<typeof AdminAboutEditor> | null>(null)
const pageLoading = ref(true)
const error = ref<string | null>(null)
const frontmatter = ref<Partial<AboutFrontmatter>>({})
const markdown = ref('')

onMounted(async () => {
  await refresh()
  if (!isAuthenticated.value) {
    await router.replace('/admin')
    return
  }

  try {
    const data = await fetchAdminAbout()
    frontmatter.value = data.frontmatter
    markdown.value = data.markdown || ''
  }
  catch (err) {
    if (err instanceof Error && /404|不存在/.test(err.message)) {
      frontmatter.value = { title: '关于我' }
      markdown.value = '\n# 关于本站\n\n'
    }
    else {
      error.value = err instanceof Error ? err.message : '加载关于页失败'
    }
  }
  finally {
    pageLoading.value = false
  }
})

async function handleSave(payload: { source: string }) {
  editorRef.value?.setSaving(true)
  try {
    await saveAdminAbout(payload.source)
    await loadAbout(true)
    editorRef.value?.setSuccess('关于页已保存')
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
    <AdminAboutEditor
      v-else-if="isAuthenticated"
      ref="editorRef"
      :initial-frontmatter="frontmatter"
      :initial-markdown="markdown"
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
