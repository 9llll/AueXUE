<script setup lang="ts">
import { useFrontmatter } from 'valaxy'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDynamicHtmlFiles } from '../../composables/useDynamicHtmlFiles'
import HtmlFileList from '../HtmlFileList.vue'

const FILES_PAGE_COVER = '/files/cover.png'

const route = useRoute()
const staticFrontmatter = useFrontmatter()
const { htmlFiles, loadHtmlFiles } = useDynamicHtmlFiles()

onMounted(() => {
  void loadHtmlFiles()
})

const frontmatter = computed(() => {
  const routeFrontmatter = (route.meta.frontmatter || {}) as Record<string, unknown>
  const base = {
    ...(staticFrontmatter.value || {}),
    ...routeFrontmatter,
  }

  return {
    ...base,
    title: String(base.title || '文件'),
    icon: String(base.icon || 'i-mdi-file-code-outline'),
    cover: typeof base.cover === 'string' && base.cover.trim()
      ? base.cover
      : FILES_PAGE_COVER,
  }
})

const coverSrc = computed(() => frontmatter.value.cover)

const files = computed(() => htmlFiles.value)
</script>

<template>
  <article class="sakura-page sakura-files-page">
    <header
      class="files-page-header sakura-page-header"
      :class="{ 'has-cover': coverSrc }"
    >
      <img
        v-if="coverSrc"
        class="files-page-header__cover"
        :src="coverSrc"
        :alt="frontmatter.title || '文件页头图'"
        loading="eager"
        decoding="async"
      >

      <div class="files-page-header__inner sakura-safe-padding">
        <div class="sakura-header-title" flex="~">
          <SakuraTitle :fm="frontmatter" />
        </div>
      </div>
    </header>

    <div class="sakura-files-main">
      <div class="content sakura-page-content">
        <RouterView v-slot="{ Component }">
          <component :is="Component">
            <template #main-content>
              <HtmlFileList :files="files" />
            </template>
          </component>
        </RouterView>
      </div>
    </div>
  </article>
</template>

<style lang="scss">
.sakura-files-page {
  --files-page-outer: max(40px, 3vw, env(safe-area-inset-left, 0px));
  --files-page-inner: 24px;
  --files-page-header-gap: 28px;

  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;

  .files-page-header {
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
      margin-bottom: var(--files-page-header-gap);
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

    &.has-cover .sakura-title {
      color: inherit;
      text-shadow: 2px 2px 10px black;
    }
  }

  .sakura-files-main {
    width: 100%;
    padding-inline: var(--files-page-outer);
    box-sizing: border-box;
  }

  .sakura-page-content {
    width: 100%;
    max-width: none;
    margin-inline: auto;
    box-sizing: border-box;
    padding-inline: var(--files-page-inner) !important;
    padding-top: var(--files-page-header-gap);
    padding-bottom: 32px;
    background: transparent;
    border-radius: 0;
    overflow: visible;
  }

  @media (max-width: 768px) {
    --files-page-outer: 0px;
    --files-page-inner: 8px;
    --files-page-header-gap: 20px;

    .sakura-page-content {
      padding-inline: max(8px, env(safe-area-inset-left, 0px)) max(8px, env(safe-area-inset-right, 0px)) !important;
      border-radius: 0;
    }
  }
}
</style>
