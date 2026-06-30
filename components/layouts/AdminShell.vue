<script setup lang="ts">
import { computed, nextTick, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminTopbarTargetKey } from '../../utils/adminShellContext'
import AdminToastHost from '../admin/AdminToastHost.vue'

const props = defineProps<{
  username?: string | null
}>()

const emit = defineEmits<{
  logout: []
}>()

const router = useRouter()
const sidebarOpen = ref(false)
const userMenuOpen = ref(false)
const topbarTargetRef = ref<HTMLElement | null>(null)

provide(adminTopbarTargetKey, topbarTargetRef)

const navItems = [
  { key: 'posts', label: '文章管理', icon: 'i-mdi-file-document-outline', to: '/admin' },
  { key: 'links', label: '友链管理', icon: 'i-mdi-link-variant', to: '/admin/links' },
  { key: 'files', label: 'HTML 文件', icon: 'i-mdi-file-code-outline', to: '/admin/files' },
  { key: 'gallery', label: '相册管理', icon: 'i-mdi-image-multiple-outline', to: '/admin/gallery' },
  { key: 'notice', label: '公告栏管理', icon: 'i-mdi-bullhorn-outline', to: '/admin/notice' },
  { key: 'about', label: '关于页', icon: 'i-mdi-information-outline', to: '/admin/about' },
]

const isPostsActive = computed(() => {
  const path = router.currentRoute.value.path.replace(/\/$/, '') || '/'
  return path === '/admin' || path === '/admin/new' || path.startsWith('/admin/edit/')
})

const isLinksActive = computed(() => {
  const path = router.currentRoute.value.path.replace(/\/$/, '') || '/'
  return path === '/admin/links'
})

const isFilesActive = computed(() => {
  const path = router.currentRoute.value.path.replace(/\/$/, '') || '/'
  return path === '/admin/files'
})

const isAboutActive = computed(() => {
  const path = router.currentRoute.value.path.replace(/\/$/, '') || '/'
  return path === '/admin/about'
})

const isGalleryActive = computed(() => {
  const path = router.currentRoute.value.path.replace(/\/$/, '') || '/'
  return path === '/admin/gallery' || path.startsWith('/admin/gallery/')
})

const isNoticeActive = computed(() => {
  const path = router.currentRoute.value.path.replace(/\/$/, '') || '/'
  return path === '/admin/notice'
})

function isNavActive(key: string) {
  if (key === 'posts')
    return isPostsActive.value
  if (key === 'links')
    return isLinksActive.value
  if (key === 'files')
    return isFilesActive.value
  if (key === 'about')
    return isAboutActive.value
  if (key === 'gallery')
    return isGalleryActive.value
  if (key === 'notice')
    return isNoticeActive.value
  return false
}

const backLink = computed(() => {
  const path = router.currentRoute.value.path.replace(/\/$/, '') || '/'
  if (path === '/admin/new' || path.startsWith('/admin/edit/') || path === '/admin/edit') {
    return {
      to: '/admin',
      label: '返回文章列表',
      icon: 'i-mdi-arrow-left',
    }
  }
  if (path === '/admin/links') {
    return {
      to: '/admin',
      label: '返回管理后台',
      icon: 'i-mdi-arrow-left',
    }
  }
  if (path === '/admin/files') {
    return {
      to: '/admin',
      label: '返回管理后台',
      icon: 'i-mdi-arrow-left',
    }
  }
  if (path === '/admin/about') {
    return {
      to: '/admin',
      label: '返回管理后台',
      icon: 'i-mdi-arrow-left',
    }
  }
  if (path === '/admin/gallery' || path.startsWith('/admin/gallery/')) {
    if (path.startsWith('/admin/gallery/') && path !== '/admin/gallery') {
      return {
        to: '/admin/gallery',
        label: '返回相册列表',
        icon: 'i-mdi-arrow-left',
      }
    }
    return {
      to: '/admin',
      label: '返回管理后台',
      icon: 'i-mdi-arrow-left',
    }
  }
  if (path === '/admin/notice') {
    return {
      to: '/admin',
      label: '返回管理后台',
      icon: 'i-mdi-arrow-left',
    }
  }
  return {
    to: '/',
    label: '返回站点',
    icon: 'i-mdi-home-export-outline',
  }
})

function closeSidebar() {
  sidebarOpen.value = false
  closeUserMenu()
}

function onBackdropClick() {
  closeSidebar()
}

async function navigateNav(to: string) {
  closeSidebar()
  const normalizedTo = to.replace(/\/$/, '') || '/'
  const currentPath = router.currentRoute.value.path.replace(/\/$/, '') || '/'
  if (currentPath === normalizedTo)
    return

  try {
    await router.push(to)
    await nextTick()
    const afterPath = router.currentRoute.value.path.replace(/\/$/, '') || '/'
    if (afterPath !== normalizedTo)
      return

    const expectedSelector = normalizedTo === '/admin/links'
      ? '.admin-links'
      : normalizedTo === '/admin/files'
        ? '.admin-html-files'
      : normalizedTo === '/admin/about'
        ? '.admin-about'
        : normalizedTo === '/admin/notice'
          ? '.admin-notice'
        : normalizedTo === '/admin/gallery'
          ? '.admin-gallery'
          : normalizedTo === '/admin'
            ? '.admin-posts'
            : null
    if (expectedSelector && !document.querySelector(expectedSelector))
      window.location.assign(to)
  }
  catch {
    window.location.assign(to)
  }
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
  if (sidebarOpen.value)
    closeUserMenu()
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

function closeUserMenu() {
  userMenuOpen.value = false
}

function isEditorPath(path: string) {
  const normalized = path.replace(/\/$/, '') || '/'
  return normalized === '/admin/new'
    || normalized.startsWith('/admin/edit/')
    || normalized === '/admin/about'
    || normalized === '/admin/notice'
    || normalized === '/admin/files'
    || normalized === '/admin/gallery'
    || normalized.startsWith('/admin/gallery/')
}

async function handleBack() {
  const to = backLink.value.to
  const from = router.currentRoute.value.path
  const leavingEditor = isEditorPath(from)

  try {
    await router.push(to)
    if (leavingEditor) {
      await nextTick()
      const normalizedTo = to.replace(/\/$/, '') || '/'
      const currentPath = router.currentRoute.value.path.replace(/\/$/, '') || '/'
      const editorStillVisible = Boolean(document.querySelector('.admin-editor') || document.querySelector('.admin-about') || document.querySelector('.admin-gallery') || document.querySelector('.admin-gallery-album'))
      if (currentPath === normalizedTo && editorStillVisible)
        window.location.assign(to)
    }
  }
  catch {
    if (leavingEditor)
      window.location.assign(to)
  }
}

function handleLogout() {
  closeUserMenu()
  emit('logout')
}
</script>

<template>
  <div class="admin-layout" :class="{ 'admin-layout--sidebar-open': sidebarOpen }">
    <aside class="admin-layout__sidebar">
      <div class="admin-layout__sidebar-user">
        <button
          type="button"
          class="admin-layout__user"
          :aria-expanded="userMenuOpen"
          @click="toggleUserMenu"
        >
          <span class="admin-layout__avatar">{{ (username || '管')[0] }}</span>
          <span class="admin-layout__user-name">{{ username || '管理员' }}</span>
          <span class="i-mdi-chevron-down admin-layout__user-chevron" aria-hidden="true" />
        </button>
        <div v-if="userMenuOpen" class="admin-layout__user-menu">
          <button type="button" @click="handleLogout">
            退出登录
          </button>
        </div>
      </div>

      <nav class="admin-layout__nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.key"
          :to="item.to"
          class="admin-layout__nav-item"
          :class="{ 'is-active': isNavActive(item.key) }"
          @click.prevent="navigateNav(item.to)"
        >
          <span :class="item.icon" class="admin-layout__nav-icon" aria-hidden="true" />
          <span class="admin-layout__nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="admin-layout__main-wrap">
      <header class="admin-layout__topbar">
        <button type="button" class="admin-layout__menu-btn" aria-label="切换侧栏" @click="toggleSidebar">
          <span class="i-mdi-menu" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="admin-layout__back-site"
          :aria-label="backLink.label"
          @click="handleBack"
        >
          <span :class="backLink.icon" aria-hidden="true" />
        </button>
        <div ref="topbarTargetRef" class="admin-layout__topbar-content">
          <slot name="topbar" />
        </div>
      </header>

      <main class="admin-layout__main">
        <slot />
      </main>
    </div>

    <div v-if="sidebarOpen || userMenuOpen" class="admin-layout__backdrop" @click="onBackdropClick" />
    <AdminToastHost />
  </div>
</template>

<style lang="scss">
.admin-layout {
  --admin-sidebar-width: 220px;
  --admin-content-inline: 1.75rem;
  --admin-pink: #e93d6d;
  --admin-border: 1px solid #000;
  --admin-border-color: #000;
  --admin-sidebar-bg: #fff;
  --admin-topbar-bg: #fff;
  --admin-page-bg: #f4f5f7;
  --admin-field-bg: #fff;
  --admin-field-text: #111;
  --admin-field-border-color: #000;
  --admin-field-placeholder: #666;
  --admin-label-color: #333;
  --admin-muted-color: #555;

  color-scheme: light;
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  min-height: 100dvh;
  background: var(--admin-page-bg);
  color: #333;

  &--sidebar-open {
    .admin-layout__sidebar {
      position: relative;
      z-index: 1002;
      width: var(--admin-sidebar-width);
    }
  }

  &__sidebar {
    flex-shrink: 0;
    width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--admin-sidebar-bg);
    color: #333;
    border-right: var(--admin-border);
    transition: width 0.25s ease;
  }

  &__sidebar-user {
    position: relative;
    z-index: 6;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-height: 56px;
    padding: 0.65rem 0.75rem;
    border-bottom: var(--admin-border);
  }

  &__nav {
    flex: 1;
    padding: 0.5rem 0.75rem;
  }

  &__nav-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 0.25rem;
    padding: 0.7rem 0.85rem;
    border-radius: 8px;
    color: #555;
    text-decoration: none;
    font-size: 0.9375rem;
    transition:
      background 0.2s ease,
      color 0.2s ease;
    white-space: nowrap;

    &:hover {
      background: #f5f5f7;
      color: #222;
    }

    &.is-active {
      background: rgb(233 61 109 / 10%);
      color: var(--admin-pink);
      box-shadow: inset 3px 0 0 var(--admin-pink);
    }

    &--ghost {
      opacity: 0.85;
    }
  }

  &__nav-icon {
    width: 1.15rem;
    height: 1.15rem;
    flex-shrink: 0;
  }

  &__nav-label {
    transition: opacity 0.2s ease;
  }

  &__main-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__topbar {
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    min-height: 60px;
    padding: 0.65rem var(--admin-content-inline) 0.65rem 1.25rem;
    background: var(--admin-topbar-bg);
  }

  &__topbar-content {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    min-height: 2.25rem;
    overflow: visible;

    > .admin-layout__page-head,
    > [class$='__header'] {
      display: flex;
      align-items: center;
      width: 100%;
      min-width: 0;
      gap: 0.75rem;
      min-height: inherit;
    }

    .admin-layout__page-head > div:first-child,
    [class$='__heading'] {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
      max-width: min(420px, calc(100% - 1rem));
      z-index: 0;
    }

    [class$='__actions'] {
      margin-left: auto;
      position: relative;
      z-index: 1;
      flex-shrink: 0;
    }

    .admin-layout__page-title,
    .admin-layout__page-subtitle,
    [class$='__heading'] h1,
    [class$='__heading'] p {
      text-align: center;
    }
  }

  &__back-site {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 10;
    flex-shrink: 0;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--admin-pink);
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease;

    span {
      width: 1.35rem;
      height: 1.35rem;
      flex-shrink: 0;
    }

    &:hover {
      background: #f0f0f3;
      color: #d73563;
    }

    &:active {
      transform: scale(0.96);
    }
  }

  &__page-head {
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
    min-height: inherit;
  }

  &__page-title {
    margin: 0 0 0.1rem;
    font-size: 1.0625rem;
    font-weight: 700;
    color: #222;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__page-subtitle {
    margin: 0;
    font-size: 0.75rem;
    color: #888;
    line-height: 1.3;
  }

  &__page-action {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
    padding: 0.6rem 1.1rem;
    border-radius: 8px;
    background: var(--admin-pink);
    color: #fff;
    font-size: 0.9375rem;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s ease, transform 0.15s ease;

    span {
      width: 1.1rem;
      height: 1.1rem;
    }

    &:hover {
      background: #d73563;
    }

    &:active {
      transform: scale(0.98);
    }
  }

  &__menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #555;
    cursor: pointer;

    span {
      width: 1.35rem;
      height: 1.35rem;
    }

    &:hover {
      background: #f0f0f3;
    }
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.45rem 0.5rem;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition: background 0.2s ease;
    white-space: nowrap;

    &:hover {
      background: #f5f5f7;
    }
  }

  &__avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--admin-pink);
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
  }

  &__user-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.875rem;
    font-weight: 600;
    color: #333;
    text-align: left;
    transition: opacity 0.2s ease;
  }

  &__user-chevron {
    width: 1rem;
    height: 1rem;
    color: #888;
    transition: opacity 0.2s ease;
  }

  &__user-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0.75rem;
    right: 0.75rem;
    min-width: 0;
    padding: 0.35rem;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
    border: var(--admin-border);

    button {
      width: 100%;
      padding: 0.55rem 0.75rem;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #444;
      font-size: 0.875rem;
      text-align: left;
      cursor: pointer;

      &:hover {
        background: #f5f5f7;
        color: var(--admin-pink);
      }
    }
  }

  &__backdrop {
    position: fixed;
    inset: 0;
    z-index: 4;
  }

  &__main {
    flex: 1;
    overflow: auto;
    padding: 1.5rem var(--admin-content-inline) 2rem;

    input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']):not([type='hidden']),
    textarea,
    select {
      background-color: var(--admin-field-bg);
      color: var(--admin-field-text);
      caret-color: var(--admin-field-text);
      -webkit-text-fill-color: var(--admin-field-text);

      &::placeholder {
        color: var(--admin-field-placeholder);
        opacity: 1;
        -webkit-text-fill-color: var(--admin-field-placeholder);
      }

      &:disabled {
        background-color: #f0f0f2;
        color: #555;
        -webkit-text-fill-color: #555;
      }
    }

    [class*='__field'] label,
    [class*='__field'] > span:first-child {
      color: var(--admin-label-color);
    }
  }

  @media (max-width: 768px) {
    --admin-content-inline: 0.75rem;
    --admin-topbar-control: 2rem;

    &--sidebar-open {
      .admin-layout__sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        z-index: 1002;
        width: min(var(--admin-sidebar-width), 82vw);
        box-shadow: 4px 0 24px rgb(0 0 0 / 22%);
      }
    }

    &__topbar {
      flex-wrap: nowrap;
      align-items: center;
      gap: 0.4rem;
      min-height: calc(var(--admin-topbar-control) + 0.9rem);
      padding:
        max(0.45rem, env(safe-area-inset-top, 0px))
        max(var(--admin-content-inline), env(safe-area-inset-right, 0px))
        0.45rem
        max(0.85rem, env(safe-area-inset-left, 0px));
    }

    &__menu-btn,
    &__back-site {
      align-self: center;
      width: var(--admin-topbar-control);
      height: var(--admin-topbar-control);
      flex-shrink: 0;

      span {
        width: 1.25rem;
        height: 1.25rem;
      }
    }

    &__topbar-content {
      flex: 1 1 auto;
      min-width: 0;
      min-height: var(--admin-topbar-control);
      display: flex;
      align-items: center;

      > .admin-layout__page-head,
      > [class$='__header'] {
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
        width: 100%;
        min-width: 0;
        min-height: var(--admin-topbar-control);
        gap: 0.35rem;
      }

      .admin-layout__page-head > div:first-child,
      [class$='__heading'] {
        display: none;
      }

      [class$='__actions'] {
        display: flex;
        align-items: center;
        flex: 1 1 auto;
        min-width: 0;
        width: auto;
        max-width: none;
        margin-left: 0;
        padding: 0;
        justify-content: flex-end;
        flex-wrap: nowrap;
        overflow-x: auto;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        gap: 0.35rem;
        z-index: 1;

        &::-webkit-scrollbar {
          display: none;
        }

        [class$='__btn'],
        .admin-layout__page-action,
        a[class$='__btn'],
        button[class$='__btn'] {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          height: var(--admin-topbar-control);
          min-height: var(--admin-topbar-control);
          padding: 0 0.55rem;
          font-size: 0.75rem;
          line-height: 1;
          flex-shrink: 0;
        }
      }
    }

    &__page-subtitle {
      display: none;
    }

    &__main {
      padding:
        0.75rem
        max(var(--admin-content-inline), env(safe-area-inset-right, 0px))
        max(1rem, env(safe-area-inset-bottom, 0px))
        max(var(--admin-content-inline), env(safe-area-inset-left, 0px));
    }
  }

  @media (max-width: 480px) {
    --admin-topbar-control: 1.875rem;

    &__topbar-content {
      [class$='__actions'] {
        gap: 0.3rem;

        [class$='__btn'],
        .admin-layout__page-action,
        a[class$='__btn'],
        button[class$='__btn'] {
          padding: 0 0.45rem;
          font-size: 0.6875rem;
        }
      }
    }
  }
}

/* 后台固定浅色表单，不受站点暗色模式影响 */
html.dark .admin-layout {
  color-scheme: light;
  color: #333;

  &__main {
    input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']):not([type='hidden']),
    textarea,
    select {
      background-color: var(--admin-field-bg);
      color: var(--admin-field-text);
      -webkit-text-fill-color: var(--admin-field-text);
    }
  }
}
</style>
