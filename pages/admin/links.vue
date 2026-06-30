<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLinksEditor from '../../components/admin/AdminLinksEditor.vue'
import { useDynamicLinks } from '../../composables/useDynamicLinks'
import { useAdminAuth } from '../../composables/useAdminAuth'
import { fetchAdminLinks, saveAdminLinks } from '../../utils/adminLinksApi'
import type { FriendLinkGroup, LinksFrontmatter } from '../../types/links'

const router = useRouter()
const { isAuthenticated, refresh, loading, username, logout } = useAdminAuth()
const { loadLinks } = useDynamicLinks()
const editorRef = ref<InstanceType<typeof AdminLinksEditor> | null>(null)
const pageLoading = ref(true)
const error = ref<string | null>(null)
const frontmatter = ref<Partial<LinksFrontmatter>>({})
const linkGroups = ref<FriendLinkGroup[]>([])

onMounted(async () => {
  await refresh()
  if (!isAuthenticated.value) {
    await router.replace('/admin')
    return
  }

  try {
    const data = await fetchAdminLinks()
    frontmatter.value = data.frontmatter
    linkGroups.value = data.linkGroups
  }
  catch (err) {
    if (err instanceof Error && /404|不存在/.test(err.message)) {
      frontmatter.value = {
        title: '来加入我们叭',
        icon: 'i-ri-links-line',
        comment: true,
      }
      linkGroups.value = []
    }
    else {
      error.value = err instanceof Error ? err.message : '加载友链失败'
    }
  }
  finally {
    pageLoading.value = false
  }
})

async function handleSave(payload: { source: string }) {
  editorRef.value?.setSaving(true)
  try {
    await saveAdminLinks(payload.source)
    await loadLinks(true)
    editorRef.value?.setSuccess('友链已保存')
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
    <AdminLinksEditor
      v-else-if="isAuthenticated"
      ref="editorRef"
      :initial-frontmatter="frontmatter"
      :initial-link-groups="linkGroups"
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
