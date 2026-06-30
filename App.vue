<script setup lang="ts">
import { useSiteConfig } from 'valaxy'
import { nextTick, watch } from 'vue'
import { loadDynamicPosts } from './composables/useDynamicPosts'
import { loadDynamicTaxonomy } from './composables/useDynamicTaxonomy'
import { useAdminAuth } from './composables/useAdminAuth'
import { useRoute, useRouter } from 'vue-router'
import ImageGalleryViewer from './components/ImageGalleryViewer.vue'
import { applyCodeBlockFold, initCodeBlockFold } from './utils/collapseCode'
import { initCodeCopy } from './utils/copyCode'
import { initImageGallery } from './utils/imageGallery'
import { isHomePaginationPath, scheduleScrollToPostList } from './utils/homePagination'
import { isAdminRoutePath, requiresAdminSession } from './utils/adminRoute'
import { useSakuraAppStore } from './node_modules/valaxy-theme-sakura/stores/app.ts'

const route = useRoute()
const router = useRouter()
const siteConfig = useSiteConfig()
const sakura = useSakuraAppStore()

watch(() => route.path, (path) => {
  if (isHomePaginationPath(path))
    void loadDynamicPosts()
}, { immediate: true })

void loadDynamicTaxonomy()

function isAdminPath(path: string) {
  return isAdminRoutePath(path)
}

router.beforeEach(async (to, from) => {
  const auth = useAdminAuth()

  if (isAdminPath(from.path) && !isAdminPath(to.path)) {
    await auth.logout()
    return
  }

  const enteringAdminFromOutside = isAdminPath(to.path)
    && from.name != null
    && !isAdminPath(from.path)

  if (enteringAdminFromOutside) {
    try {
      sessionStorage.setItem('admin-login-return-path', to.fullPath)
    }
    catch {
      // ignore
    }
    void auth.logout()

    if (requiresAdminSession(to.path)) {
      return {
        path: '/admin',
        query: { redirect: to.fullPath },
        replace: true,
      }
    }
    return
  }

  if (isAdminPath(to.path) && requiresAdminSession(to.path)) {
    if (!auth.isReady.value || !auth.isAuthenticated.value)
      await auth.refresh()

    if (!auth.isAuthenticated.value) {
      return {
        path: '/admin',
        query: { redirect: to.fullPath },
        replace: true,
      }
    }
  }
})

watch(() => route.path, (path) => {
  if (typeof document === 'undefined')
    return

  const onAdmin = isAdminPath(path)
  document.body.classList.toggle('is-admin-page', onAdmin)
  if (onAdmin)
    window.scrollTo(0, 0)
}, { immediate: true })

function setupCodeBlockFold() {
  const limit = siteConfig.value.codeFoldLineLimit
  if (typeof limit === 'number' && limit > 0)
    initCodeBlockFold(limit)
}

const CHUNK_RELOAD_KEY = 'valaxy-chunk-reload'

router.onError((error, to) => {
  const message = error instanceof Error ? error.message : String(error)
  const isChunkError = /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(message)
  if (!isChunkError)
    return

  const reloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY)
  if (reloaded === to.fullPath) {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    return
  }

  sessionStorage.setItem(CHUNK_RELOAD_KEY, to.fullPath)
  window.location.assign(to.fullPath)
})

router.afterEach((to, from) => {
  if (to.hash)
    return

  if (
    isHomePaginationPath(to.path)
    && from.path
    && isHomePaginationPath(from.path)
    && to.path !== from.path
  ) {
    nextTick(() => {
      scheduleScrollToPostList((top) => {
        sakura.setScrollPosition(to.path, top)
      })
    })
  }
})

initImageGallery()
initCodeCopy()
setupCodeBlockFold()

watch(() => route.path, () => {
  nextTick(() => applyCodeBlockFold())
})
</script>

<template>
  <ImageGalleryViewer />
  <SakuraSearch :open="sakura.search.isOpen" />
</template>
