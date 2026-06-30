<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminGalleryHubEditor from '../../../components/admin/AdminGalleryHubEditor.vue'
import { useDynamicGallery } from '../../../composables/useDynamicGallery'
import { useAdminAuth } from '../../../composables/useAdminAuth'
import {
  deleteAdminGalleryAlbum,
  fetchAdminGalleryHub,
  saveAdminGalleryAlbum,
  saveAdminGalleryHub,
} from '../../../utils/adminGalleryApi'
import type { AlbumSummary } from '../../../types/album'
import { normalizeAlbumSlugs, serializeHubMarkdown } from '../../../utils/galleryFrontmatter'

const router = useRouter()
const { isAuthenticated, refresh, loading, username, logout } = useAdminAuth()
const { loadGalleryHub } = useDynamicGallery()
const editorRef = ref<InstanceType<typeof AdminGalleryHubEditor> | null>(null)
const pageLoading = ref(true)
const error = ref<string | null>(null)
const frontmatter = ref<Record<string, unknown>>({})
const albums = ref<AlbumSummary[]>([])

onMounted(async () => {
  await refresh()
  if (!isAuthenticated.value) {
    await router.replace('/admin')
    return
  }

  try {
    const data = await fetchAdminGalleryHub()
    frontmatter.value = data.frontmatter
    albums.value = data.albums
  }
  catch (err) {
    if (err instanceof Error && /404|不存在/.test(err.message)) {
      frontmatter.value = {
        title: '相册',
        icon: 'i-ri-gallery-line',
      }
      albums.value = []
    }
    else {
      error.value = err instanceof Error ? err.message : '加载相册失败'
    }
  }
  finally {
    pageLoading.value = false
  }
})

async function persistHub(source: string) {
  const result = await saveAdminGalleryHub(source) as { albums?: AlbumSummary[] }
  if (result.albums)
    editorRef.value?.setAlbums(result.albums)
  await loadGalleryHub(true)
}

async function reloadHub() {
  const data = await fetchAdminGalleryHub()
  frontmatter.value = data.frontmatter
  editorRef.value?.setAlbums(data.albums)
  await loadGalleryHub(true)
}

async function handleSaveAlbum(payload: { slug: string, source: string, isNew: boolean }) {
  editorRef.value?.setSaving(true)
  try {
    await saveAdminGalleryAlbum(payload.slug, payload.source)

    if (payload.isNew) {
      const data = await fetchAdminGalleryHub()
      const slugs = normalizeAlbumSlugs(data.frontmatter.albums)
      if (!slugs.includes(payload.slug)) {
        slugs.push(payload.slug)
        await saveAdminGalleryHub(serializeHubMarkdown({
          ...data.frontmatter,
          layout: 'gallery',
          albums: slugs,
        }))
      }
    }

    await reloadHub()
    editorRef.value?.setSuccess(payload.isNew ? '相册已创建' : '相册信息已保存')
  }
  catch (err) {
    editorRef.value?.setError(err instanceof Error ? err.message : '保存相册失败')
  }
  finally {
    editorRef.value?.setSaving(false)
  }
}

async function handleDeleteAlbum(payload: { slug: string }) {
  editorRef.value?.setSaving(true)
  try {
    await deleteAdminGalleryAlbum(payload.slug)
    await reloadHub()
    editorRef.value?.setSuccess('相册已删除')
  }
  catch (err) {
    editorRef.value?.setError(err instanceof Error ? err.message : '删除相册失败')
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
    <AdminGalleryHubEditor
      v-else-if="isAuthenticated"
      ref="editorRef"
      :initial-frontmatter="frontmatter"
      :initial-albums="albums"
      :persist="persistHub"
      @save-album="handleSaveAlbum"
      @delete-album="handleDeleteAlbum"
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
