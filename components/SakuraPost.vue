<script lang="ts" setup>
import type { Article } from '@unhead/schema-org'
import { defineArticle, useSchemaOrg } from '@unhead/schema-org/vue'
import { formatDate, useFrontmatter, useFullUrl, useSiteConfig } from 'valaxy'
import { computed, onUnmounted } from 'vue'
import { useThemeConfig } from '../node_modules/valaxy-theme-sakura/composables'
import { resolveImage } from '../node_modules/valaxy-theme-sakura/utils'
import { useDynamicPostFrontmatter, setDynamicPostFrontmatter } from '../composables/useDynamicPostFrontmatter'

const siteConfig = useSiteConfig()
const themeConfig = useThemeConfig()
const staticFrontmatter = useFrontmatter()
const dynamicFrontmatter = useDynamicPostFrontmatter()
const frontmatter = computed(() => ({
  ...staticFrontmatter.value,
  ...(dynamicFrontmatter.value || {}),
}))
const displayFrontmatter = computed(() => {
  const fm = frontmatter.value
  const defaultCover = themeConfig.value.postList?.defaultImage
    ? resolveImage(themeConfig.value.postList.defaultImage)
    : undefined

  return {
    ...fm,
    cover: fm.cover || defaultCover,
  }
})
const url = useFullUrl()

onUnmounted(() => {
  setDynamicPostFrontmatter(null)
})

const showSponsor = computed(() => {
  if (typeof frontmatter.value.sponsor === 'boolean')
    return frontmatter.value.sponsor

  return siteConfig.value.sponsor.enable
})

const article = computed<Article>(() => ({
  '@type': 'BlogPosting',
  'headline': displayFrontmatter.value.title,
  'description': displayFrontmatter.value.description,
  'author': [
    {
      name: siteConfig.value.author.name,
      url: siteConfig.value.author.link,
    },
  ],
  'datePublished': formatDate(displayFrontmatter.value.date || 0),
  'dateModified': formatDate(displayFrontmatter.value.updated || 0),
  'image': displayFrontmatter.value.cover || displayFrontmatter.value.image,
}))

useSchemaOrg(
  defineArticle(article),
)
</script>

<template>
  <SakuraPage class="sakura-post">
    <template #header>
      <SakuraPostHeader
        :key="`${displayFrontmatter.cover || ''}-${displayFrontmatter.title || ''}`"
        :fm="displayFrontmatter"
      />
    </template>

    <template v-if="$slots.left" #left>
      <slot name="left" />
    </template>
    <template #content>
      <slot name="content">
        <RouterView v-slot="{ Component }">
          <component :is="Component">
            <template #main-content-after>
              <SakuraSponsor v-if="showSponsor" />
              <ValaxyCopyright v-if="displayFrontmatter.copyright || siteConfig.license.enabled" :url="url" />
            </template>

            <template #main-nav-after>
              <div class="sakura-post-nav-before-comment">
                <SakuraPostNav />
              </div>
            </template>

            <template #footer>
              <SakuraPostFooter />
            </template>
          </component>
        </RouterView>
      </slot>
    </template>
    <template #right>
      <slot name="right">
        <SakuraAside>
          <SakuraToc />
        </SakuraAside>
      </slot>
    </template>
  </SakuraPage>
</template>

<style lang="scss">
.sakura-post {
  .sakura-page-content {
    box-sizing: border-box;
    width: 100%;
    max-width: 800px;
    margin-inline: auto;
    padding-block: 24px;
  }

  /* 流体布局：以正文为基准居中，TOC 置于右侧 */
  .sakura-triple-columns {
    --post-content-max: 800px;
    --post-toc-width: clamp(140px, 16vw, 220px);
    --post-toc-gap: clamp(20px, 2.8vw, 44px);
    --post-toc-edge: clamp(12px, 2vw, 32px);

    box-sizing: border-box;
    width: fit-content;
    max-width: calc(100% - 32px);
    margin-inline-start: max(16px, calc(50% - var(--post-content-max) / 2));
    margin-inline-end: auto;
    grid-template-columns:
      minmax(0, min(var(--post-content-max), calc(100vw - var(--post-toc-width) - var(--post-toc-gap) - var(--post-toc-edge) - 80px)))
      minmax(0, var(--post-toc-width)) !important;
    gap: 0 var(--post-toc-gap);

    > aside:first-child {
      display: none;
    }

    > div {
      grid-column: 1;
      min-width: 0;
    }

    > aside:last-child {
      grid-column: 2;
      min-width: 0;
      margin-inline-end: var(--post-toc-edge);
    }

    @media (max-width: 767px) {
      --post-toc-width: 0px;
      --post-toc-gap: 0px;
      --post-toc-edge: 0px;

      width: 100%;
      max-width: none;
      margin-inline: auto;
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 0;

      > aside:last-child {
        display: none;
        margin-inline-end: 0;
      }
    }
  }

  @media (max-width: 767px) {
    overflow-x: clip;
  }

  .sakura-post-nav-before-comment {
    width: 100%;
    margin-bottom: 24px;
  }

  .sakura-post-nav-before-comment .sakura-post-nav .card-prev {
    margin-top: 0;
  }

  .sakura-post .sakura-comment {
    margin-top: 0 !important;
  }

  /* 文章头图遮罩：仅文章页，提升标题与元信息可读性 */
  .sakura-post-header.sakura-page-header.has-cover {
    overflow: hidden;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: linear-gradient(
        180deg,
        rgb(0 0 0 / 25%) 0%,
        rgb(0 0 0 / 12%) 38%,
        rgb(0 0 0 / 50%) 72%,
        rgb(0 0 0 / 80%) 100%
      );
    }

    .sakura-header-container {
      position: relative;
      z-index: 1;
    }

    .sakura-post-header-meta {
      justify-content: center;
      text-align: center;
    }

    .sakura-post-header-meta .sakura-post-tags,
    .sakura-post-header-meta__tags {
      justify-content: center;
    }

    .sakura-header-title,
    .sakura-post-header-meta {
      text-shadow: 0 1px 10px rgb(0 0 0 / 60%);
    }

    .sakura-post-header-meta__tags a {
      text-shadow: none;
    }
  }
}
</style>
