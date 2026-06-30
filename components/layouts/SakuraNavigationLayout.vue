<script setup lang="ts">
import type { NavDrawVideo, NavSiteGroup, NavSiteItem } from '~/types/navigation'
import { parseNavDrawVideos } from '../../utils/parseNavDrawVideos'
import { useConfig, useFrontmatter } from 'valaxy'
import { computed } from 'vue'

const config = useConfig()
const frontmatter = useFrontmatter()

const coverSrc = computed(() => {
  const cover = frontmatter.value?.cover
  return typeof cover === 'string' ? cover : ''
})

const navGroups = computed(() => {
  const groups = frontmatter.value?.navGroups as NavSiteGroup[] | undefined
  return Array.isArray(groups) ? groups : []
})

const allSites = computed(() => {
  const list: NavSiteItem[] = []
  for (const group of navGroups.value) {
    if (Array.isArray(group.sites))
      list.push(...group.sites)
  }
  return list
})

const themeNavigation = computed(() => {
  return (config.value?.themeConfig as { navigation?: { randomDrawVideos?: unknown } } | undefined)?.navigation
})

const randomDrawVideos = computed<NavDrawVideo[]>(() => {
  const fromPage = parseNavDrawVideos(frontmatter.value?.randomDrawVideos)
  if (fromPage.length)
    return fromPage

  const single = frontmatter.value?.randomDrawVideo
  if (typeof single === 'string' && single.length > 0)
    return parseNavDrawVideos([single])

  return parseNavDrawVideos(themeNavigation.value?.randomDrawVideos)
})
</script>

<template>
  <article class="sakura-page sakura-navigation-page">
    <header
      class="navigation-page-header sakura-page-header"
      :class="{ 'has-cover': coverSrc }"
    >
      <img
        v-if="coverSrc"
        class="navigation-page-header__cover"
        :src="coverSrc"
        :alt="frontmatter.title || '导航页头图'"
        loading="eager"
        decoding="async"
      >

      <div class="navigation-page-header__inner sakura-safe-padding">
        <div class="sakura-header-title" flex="~">
          <SakuraTitle :fm="frontmatter" />
        </div>
      </div>
    </header>

    <div class="sakura-navigation-main">
      <div class="content sakura-page-content">
        <RouterView v-slot="{ Component }">
          <component :is="Component">
            <template #main-content>
              <NavigationRandomDraw
                :sites="allSites"
                :draw-videos="randomDrawVideos"
              />

              <NavigationSiteList :nav-groups="navGroups" />
            </template>
          </component>
        </RouterView>
      </div>
    </div>
  </article>
</template>

<style lang="scss">
.sakura-navigation-page {
  --navigation-page-outer: max(40px, 3vw, env(safe-area-inset-left, 0px));
  --navigation-page-inner: 24px;
  --navigation-page-header-gap: 28px;

  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;

  .navigation-page-header {
    margin-top: var(--sakura-navbar-height);
    width: 100%;
    position: relative;

    .sakura-header-title {
      justify-content: center;
    }

    &:not(.has-cover) {
      margin-top: var(--sakura-navbar-spacing);
    }

    &.has-cover {
      height: 320px;
      margin-bottom: var(--navigation-page-header-gap);
      overflow: hidden;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    &__cover {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      z-index: 0;
      pointer-events: none;
    }

    &__inner {
      position: relative;
      z-index: 1;
      width: 100%;
      padding-bottom: 25px;
      color: #fff;
      text-align: center;
    }
  }

  .sakura-navigation-main {
    width: 100%;
    padding-inline: var(--navigation-page-outer);
    box-sizing: border-box;
  }

  .sakura-page-content {
    width: 100%;
    max-width: none;
    box-sizing: border-box;
    padding-inline: var(--navigation-page-inner) !important;
    padding-top: var(--navigation-page-header-gap);
    padding-bottom: 32px;
    background: var(--sakura-color-background);
    border-radius: var(--sakura-radius);
  }

  @media (max-width: 768px) {
    --navigation-page-outer: 0px;
    --navigation-page-inner: 8px;
    --navigation-page-header-gap: 20px;

    .sakura-page-content {
      padding-inline: max(8px, env(safe-area-inset-left, 0px)) max(8px, env(safe-area-inset-right, 0px)) !important;
      border-radius: 0;
    }
  }
}
</style>

<style lang="scss">
.sakura-navigation-page .navigation-page-header.has-cover .sakura-title {
  color: inherit;
  text-shadow: 2px 2px 10px black;
}
</style>
