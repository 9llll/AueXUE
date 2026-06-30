<script setup lang="ts">
import { useFrontmatter } from 'valaxy'
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { AlbumDetailFrontmatter } from '~/types/album'
import AlbumViewer from '../AlbumViewer.vue'
import { useDynamicGallery } from '../../composables/useDynamicGallery'
import { useAlbumDetailMeta } from '../../utils/useAlbumDetailMeta'

const route = useRoute()
const staticFrontmatter = useFrontmatter<AlbumDetailFrontmatter>()
const { galleryAlbums, loadGalleryAlbum } = useDynamicGallery()
const { photoCount, showPhotoCount } = useAlbumDetailMeta()

const slug = computed(() => {
  const path = route.path.replace(/\/$/, '')
  return path.split('/').pop() || ''
})

onMounted(() => {
  if (slug.value)
    void loadGalleryAlbum(slug.value)
})

watch(slug, (next) => {
  if (next)
    void loadGalleryAlbum(next)
})

const frontmatter = computed<AlbumDetailFrontmatter>(() => {
  const dynamic = galleryAlbums.value[slug.value]
  if (dynamic?.frontmatter)
    return dynamic.frontmatter
  return staticFrontmatter.value || {}
})

const coverSrc = computed(() => {
  const cover = frontmatter.value?.cover
  return typeof cover === 'string' ? cover : ''
})
</script>

<template>
  <article class="sakura-page sakura-gallery-page sakura-gallery-album-page">
    <header
      class="gallery-page-header sakura-page-header"
      :class="{ 'has-cover': coverSrc }"
    >
      <img
        v-if="coverSrc"
        class="gallery-page-header__cover"
        :src="coverSrc"
        :alt="frontmatter.title || '相册封面'"
        loading="eager"
        decoding="async"
      >

      <div class="gallery-page-header__inner sakura-safe-padding">
        <div class="sakura-header-title" flex="~">
          <SakuraTitle :fm="frontmatter" />
        </div>
        <p
          v-if="showPhotoCount"
          class="gallery-page-header__count"
        >
          相册共有 {{ photoCount }} 张照片
        </p>
      </div>
    </header>

    <div class="sakura-gallery-main">
      <div class="content sakura-page-content">
        <RouterView v-slot="{ Component }">
          <component :is="Component">
            <template #main-content>
              <div class="gallery-album-back">
                <RouterLink to="/gallery">
                  ← 返回相册列表
                </RouterLink>
              </div>
              <AlbumViewer :album="frontmatter" />
            </template>
          </component>
        </RouterView>
      </div>
    </div>
  </article>
</template>

<style lang="scss">
.sakura-gallery-album-page {
  --gallery-page-outer: max(96px, 10vw, env(safe-area-inset-left, 0px));
  --gallery-page-inner: 28px;
  --gallery-page-header-gap: 28px;
  --gallery-page-max-width: 1080px;

  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;

  .gallery-page-header {
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
      margin-bottom: var(--gallery-page-header-gap);
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

    &__count {
      margin: 10px 0 0;
      font-size: 0.88rem;
      font-weight: 500;
      line-height: 1.5;
    }

    &:not(.has-cover) &__inner {
      color: inherit;
    }

    &:not(.has-cover) &__count {
      color: var(--sakura-color-text-muted, #888);
    }

    &.has-cover &__count {
      color: rgb(255 255 255 / 90%);
      text-shadow: 1px 1px 8px rgb(0 0 0 / 45%);
    }
  }

  .sakura-gallery-main {
    width: 100%;
    max-width: calc(var(--gallery-page-max-width) + var(--gallery-page-outer) * 2);
    margin-inline: auto;
    padding-inline: var(--gallery-page-outer);
    box-sizing: border-box;
  }

  .sakura-page-content {
    width: 100%;
    max-width: var(--gallery-page-max-width);
    margin-inline: auto;
    box-sizing: border-box;
    padding-inline: var(--gallery-page-inner) !important;
    padding-top: var(--gallery-page-header-gap);
    padding-bottom: 32px;
    background: var(--sakura-color-background);
    border-radius: var(--sakura-radius);
  }

  .gallery-album-back {
    margin-bottom: 20px;

    a {
      color: var(--sakura-color-primary);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  @media (max-width: 768px) {
    --gallery-page-outer: max(16px, env(safe-area-inset-left, 0px));
    --gallery-page-inner: 12px;
    --gallery-page-header-gap: 20px;
    --gallery-page-max-width: none;

    .sakura-page-content {
      padding-inline: max(8px, env(safe-area-inset-left, 0px)) max(8px, env(safe-area-inset-right, 0px)) !important;
      border-radius: 0;
    }
  }
}

.sakura-gallery-album-page .gallery-page-header.has-cover .sakura-title {
  color: inherit;
  text-shadow: 2px 2px 10px black;
}
</style>
