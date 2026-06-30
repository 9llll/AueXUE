<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminPostEditor from '../../../components/admin/AdminPostEditor.vue'
import { invalidateDynamicPostsCache } from '../../../composables/useDynamicPosts'
import { useAdminAuth } from '../../../composables/useAdminAuth'
import { deleteAdminPost, fetchAdminPost, saveAdminPost } from '../../../utils/adminPostsApi'
import { splitMarkdown } from '../../../utils/postFrontmatter'

const route = useRoute()
const router = useRouter()
const { isAuthenticated, refresh, loading: authLoading, username, logout } = useAdminAuth()
const editorRef = ref<InstanceType<typeof AdminPostEditor> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const frontmatter = ref<Record<string, unknown>>({})
const markdown = ref('')
const initialSlug = ref('')

const slug = computed(() => {
  const param = route.params.slug
  if (Array.isArray(param))
    return param.map(part => decodeURIComponent(String(part))).join('/')
  return decodeURIComponent(String(param || ''))
})

onMounted(async () => {
  await refresh()
  if (!isAuthenticated.value) {
    await router.replace('/admin')
    return
  }

  try {
    const post = await fetchAdminPost(slug.value)
    initialSlug.value = post.slug
    frontmatter.value = post.frontmatter
    markdown.value = post.markdown ?? (post.source ? splitMarkdown(post.source).content : '')
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '加载文章失败'
  }
  finally {
    loading.value = false
  }
})

async function handleSave(payload: { slug: string, source: string, previousSlug?: string }) {
  editorRef.value?.setSaving(true)
  try {
    await saveAdminPost(payload.slug, payload.source)
    if (payload.previousSlug && payload.previousSlug !== payload.slug)
      await deleteAdminPost(payload.previousSlug)

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

async function handleDelete() {
  try {
    await deleteAdminPost(slug.value)
    await router.push('/admin')
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
    <div v-if="authLoading || loading" class="admin-page-loading">加载中…</div>
    <p v-else-if="error" class="admin-page-error">{{ error }}</p>
    <AdminPostEditor
      v-else-if="isAuthenticated"
      :key="initialSlug"
      ref="editorRef"
      mode="edit"
      :initial-slug="initialSlug"
      :initial-frontmatter="frontmatter"
      :initial-markdown="markdown"
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
