import type { RouteLocationNormalized } from 'vue-router'

export function isHomePaginationPath(path: string) {
  return path === '/' || /^\/page\/\d+\/?$/.test(path)
}

export function resolveHomePageIndex(route: Pick<RouteLocationNormalized, 'params'>) {
  const page = route.params.page as string | undefined
  if (page)
    return Number.parseInt(page, 10) || 1
  return 1
}

function getNavbarOffset() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--sakura-navbar-height')
    .trim()
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : 65
}

export function getPostListScrollTop() {
  const target = document.getElementById('home-post-list')
    || document.querySelector('.sakura-post-list')

  if (!target)
    return 0

  return Math.max(0, window.scrollY + target.getBoundingClientRect().top - getNavbarOffset() - 8)
}

export async function scrollToPostList() {
  const top = getPostListScrollTop()

  try {
    const { lenisRef } = await import('../node_modules/valaxy-theme-sakura/plugins/lenis.ts')
    if (lenisRef.value) {
      lenisRef.value.scrollTo(top, { immediate: true })
      return top
    }
  }
  catch {
    // Lenis 未启用时回退到原生滚动
  }

  window.scrollTo({ top, left: 0, behavior: 'auto' })
  return top
}

export function scheduleScrollToPostList(onDone?: (top: number) => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(async () => {
      const top = await scrollToPostList()
      onDone?.(top)
    })
  })
}
