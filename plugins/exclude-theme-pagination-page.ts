import type { Plugin } from 'vite'

/**
 * 主题 pages/page/[page].vue 需保留 layout: home，避免与项目重复注册路由。
 */
export function excludeThemePaginationPage(): Plugin {
  return {
    name: 'exclude-theme-pagination-page',
    enforce: 'pre',
    load(id) {
      const normalized = id.split('?')[0].replace(/\\/g, '/')
      if (/valaxy-theme-sakura\/pages\/page\/\[page\]\.vue$/.test(normalized)) {
        return `<template>
  <div />
</template>

<route lang="yaml">
meta:
  layout: home
</route>
`
      }
    },
  }
}
