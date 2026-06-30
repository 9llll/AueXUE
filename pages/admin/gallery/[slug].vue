<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminGalleryAlbumEditor from '../../../components/admin/AdminGalleryAlbumEditor.vue'
import { useDynamicGallery } from '../../../composables/useDynamicGallery'
import { useAdminAuth } from '../../../composables/useAdminAuth'
import { fetchAdminGalleryAlbum, saveAdminGalleryAlbum } from '../../../utils/adminGalleryApi'
import type { AlbumDetailFrontmatter } from '../../../types/album'

const route = useRoute()
const router = useRouter()
const { isAuthenticated, refresh, loading, username, logout } = useAdminAuth()
const { loadGalleryAlbum, clearGalleryAlbum } = useDynamicGallery()
const editorRef = ref<InstanceType<typeof AdminGalleryAlbumEditor> | null>(null)
const pageLoading = ref(true)
const error = ref<string | null>(null)
const frontmatter = ref<AlbumDetailFrontmatter>({})

const slug = computed(() => String(route.params.slug || ''))

onMounted(async () => {
  await refresh()
  if (!isAuthenticated.value) {
    await router.replace('/admin')
    return
  }

  if (!slug.value) {
    await router.replace('/admin/gallery')
    return
  }

  try {
    const data = await fetchAdminGalleryAlbum(slug.value)
    frontmatter.value = data.frontmatter
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '加载相册失败'
  }
  finally {
    pageLoading.value = false
  }
})

async function persistAlbum(source: string) {
  const result = await saveAdminGalleryAlbum(slug.value, source) as {
    frontmatter?: AlbumDetailFrontmatter
  }

  if (result.frontmatter) {
    const { photos: _photos, ...meta } = result.frontmatter
    frontmatter.value = {
      ...frontmatter.value,
      ...meta,
    }
  }

  clearGalleryAlbum(slug.value)
  void loadGalleryAlbum(slug.value, true)
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
    <AdminGalleryAlbumEditor
      v-else-if="isAuthenticated"
      ref="editorRef"
      :slug="slug"
      :initial-frontmatter="frontmatter"
      :persist="persistAlbum"
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
