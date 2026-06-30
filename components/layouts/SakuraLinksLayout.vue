<script setup lang="ts">
import { useFrontmatter } from 'valaxy'
import { computed, onMounted } from 'vue'
import { useDynamicLinks } from '../../composables/useDynamicLinks'

const staticFrontmatter = useFrontmatter()
const { linksData, loadLinks } = useDynamicLinks()

onMounted(() => {
  void loadLinks()
})

const frontmatter = computed(() => {
  const base = { ...(staticFrontmatter.value || {}) }
  const dynamic = linksData.value

  if (!dynamic) {
    return {
      ...base,
      linkGroups: [],
      links: [],
    }
  }

  return {
    ...base,
    ...dynamic.frontmatter,
    linkGroups: dynamic.linkGroups,
    links: undefined,
  }
})

const coverSrc = computed(() => {
  const cover = frontmatter.value?.cover
  return typeof cover === 'string' ? cover : ''
})
</script>

<template>
  <article class="sakura-page sakura-links-page">
    <header
      class="links-page-header sakura-page-header"
      :class="{ 'has-cover': coverSrc }"
    >
      <img
        v-if="coverSrc"
        class="links-page-header__cover"
        :src="coverSrc"
        :alt="frontmatter.title || '友链页头图'"
        loading="eager"
        decoding="async"
      >

      <div class="links-page-header__inner sakura-safe-padding">
        <div class="sakura-header-title" flex="~">
          <SakuraTitle :fm="frontmatter" />
        </div>
      </div>
    </header>

    <div class="sakura-links-main">
      <div class="content sakura-page-content">
        <RouterView v-slot="{ Component }">
          <component :is="Component">
            <template #main-content>
              <SakuraLinks
                :links="frontmatter.links"
                :link-groups="frontmatter.linkGroups"
                :random="frontmatter.random"
                :error-img="frontmatter.errorImg"
              />

              <div class="friend-notice-bottom">
                <FriendLinkNotice :siteshot="frontmatter.cover" />
              </div>
            </template>
          </component>
        </RouterView>
      </div>
    </div>
  </article>
</template>

<style lang="scss">
.sakura-links-page {
  --links-page-outer: max(40px, 3vw, env(safe-area-inset-left, 0px));
  --links-page-inner: 24px;
  --links-page-header-gap: 28px;

  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;

  .links-page-header {
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
      margin-bottom: var(--links-page-header-gap);
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

  .sakura-links-main {
    width: 100%;
    padding-inline: var(--links-page-outer);
    box-sizing: border-box;
  }

  .sakura-page-content {
    width: 100%;
    max-width: none;
    box-sizing: border-box;
    padding-inline: var(--links-page-inner) !important;
    padding-top: var(--links-page-header-gap);
    padding-bottom: 32px;
    background: var(--sakura-color-background);
    border-radius: var(--sakura-radius);
  }

  .friend-notice-bottom {
    width: 100%;
    margin: 36px auto 8px;
    box-sizing: border-box;
  }

  .sakura-comment {
    width: 100%;
    box-sizing: border-box;
  }

  @media (max-width: 768px) {
    --links-page-outer: 0px;
    --links-page-inner: 8px;
    --links-page-header-gap: 20px;

    .sakura-page-content {
      padding-inline: max(8px, env(safe-area-inset-left, 0px)) max(8px, env(safe-area-inset-right, 0px)) !important;
      border-radius: 0;
    }
  }
}
</style>

<style lang="scss">
.sakura-links-page .links-page-header.has-cover .sakura-title {
  color: inherit;
  text-shadow: 2px 2px 10px black;
}
</style>
