<script lang="ts" setup>
import type { Post } from 'valaxy'
import { computed } from 'vue'
import { useThemeConfig } from '../node_modules/valaxy-theme-sakura/composables'
import { resolveImage } from '../node_modules/valaxy-theme-sakura/utils'

const props = defineProps<{
  post: Post
  position: 'left' | 'right'
  cols?: number
}>()

const themeConfig = useThemeConfig()

const defaultImage = computed(() => themeConfig.value.postList && resolveImage(themeConfig.value.postList?.defaultImage))
const cover = computed(() => props.post.cover || defaultImage.value)
const imageCard = computed(() => themeConfig.value.ui.postList?.image)

const isGroup = computed(() => (props.cols ?? 1) > 1)
</script>

<template>
  <article
    hover="scale-101 z-10" class="sakura-card sakura-post-card transition-all duration-500"
    :class="[position, { group: isGroup }]"
  >
    <SakuraImageCard v-if="cover" class="aspect-video" :to="post.path" :src="cover || defaultImage" v-bind="imageCard" />

    <div flex="~ col" class="post-card-content" :class="cover && 'has-cover'">
      <slot>
        <SakuraPostCardInfo :post />
      </slot>
    </div>
  </article>
</template>

<style lang="scss" scoped>
@use 'valaxy/client/styles/mixins/index.scss' as *;

.sakura-post-card {
  position: relative;
  display: flex;
  overflow: hidden;
  justify-content: space-between;
  color: var(--sakura-color-text);
  background: var(--sakura-post-card-bg);
  min-height: var(--sakura-post-card-height);
  border-radius: var(--sakura-post-card-rd);
  border-width: 1px;
  border-style: solid;

  .post-card-content {
    padding: 20px 39px;
  }

  @at-root html.dark & {
    border-color: var(--sakura-color-divider);

    &:hover {
      border-color: var(--sakura-color-primary);
    }
  }

  &.group {
    flex-direction: column;

    .post-card-content {
      padding-inline: 20px;

      &.has-cover {
        width: 100%;
      }
    }

    .sakura-image-card {
      width: 100%;
    }
  }

  &:not(.group) {
    height: var(--sakura-post-card-height);

    .post-card-content {
      padding: 20px 39px;

      &.has-cover {
        width: calc(100% - var(--sakura-post-card-img-width));
      }
    }

    &.left {
      flex-direction: row-reverse;
    }

    &.right {
      text-align: right;
    }

    @media (max-width: 767px) {
      height: auto;
      flex-direction: column;

      &.left,
      &.right {
        flex-direction: column;
        text-align: inherit;
      }

      .post-card-content {
        padding-inline: 20px;

        &.has-cover {
          width: 100%;
        }
      }

      .sakura-image-card {
        width: 100%;
      }
    }
  }

  @media (max-width: 767px) {
    --sakura-post-card-height: 200px;
  }
}
</style>
