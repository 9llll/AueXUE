<script setup lang="ts">
import { useConfig } from 'valaxy'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAllMergedPosts } from '../composables/useMergedPostList'
import { useDynamicNotice } from '../composables/useDynamicNotice'
import { resolveNoticeSections } from '../utils/noticeLines'

const DOT_COUNT = 5
const CENTER_DOT = 2

const props = defineProps<{
  rotateInterval?: number
}>()

const config = useConfig()
const posts = useAllMergedPosts()
const { noticeData, loadNotice } = useDynamicNotice()

const themeConfig = computed(() => config.value.themeConfig as {
  notice?: {
    rotateInterval?: number
    title?: string
    sections?: Array<{
      label: string
      lines: Array<string | { text: string, url?: string }>
    }>
  }
  postList?: { defaultImage?: string | string[] }
})

const intervalMs = computed(() => props.rotateInterval || themeConfig.value.notice?.rotateInterval || 5000)

const noticeTitle = computed(() => {
  if (noticeData.value?.title)
    return noticeData.value.title
  return themeConfig.value.notice?.title || '公告栏'
})

const noticeSections = computed(() => {
  if (noticeData.value?.sections?.length)
    return resolveNoticeSections(noticeData.value.sections)

  const sections = themeConfig.value.notice?.sections
  return resolveNoticeSections(sections)
})
const hasPosts = computed(() => posts.value.length > 0)

const currentIndex = ref(0)
const isArticleHovered = ref(false)

let timer: ReturnType<typeof setInterval> | undefined
let wheelLocked = false

const currentPost = computed(() => {
  const list = posts.value
  if (!list.length)
    return null
  return list[currentIndex.value]
})

const currentCategoryText = computed(() => {
  const categories = currentPost.value?.categories
  if (!categories)
    return ''
  return Array.isArray(categories) ? categories.join(' / ') : categories
})

const currentTagText = computed(() => {
  const tags = currentPost.value?.tags
  if (!tags)
    return ''
  if (typeof tags === 'string')
    return tags
  return tags.join(' · ')
})

const currentCover = computed(() => {
  const post = currentPost.value
  if (!post)
    return ''

  const fallback = themeConfig.value.postList?.defaultImage
  const defaultImage = Array.isArray(fallback) ? fallback[0] : fallback
  return post.cover || defaultImage || ''
})

const visibleDots = computed(() => {
  return Array.from({ length: DOT_COUNT }, (_, dotIndex) => ({
    key: `dot-${dotIndex}`,
    dotIndex,
    offset: dotIndex - CENTER_DOT,
  }))
})

function normalizeIndex(index: number) {
  const len = posts.value.length
  if (!len)
    return 0
  return ((index % len) + len) % len
}

function switchBy(delta: number) {
  if (!hasPosts.value || delta === 0)
    return

  currentIndex.value = normalizeIndex(currentIndex.value + delta)
}

function goToDot(offset: number) {
  switchBy(offset)
}

function onArticleMouseEnter() {
  isArticleHovered.value = true
  stopAutoRotate()
}

function onArticleMouseLeave() {
  isArticleHovered.value = false
  startAutoRotate()
}

function onWheel(event: WheelEvent) {
  if (!hasPosts.value || wheelLocked)
    return

  event.preventDefault()

  if (Math.abs(event.deltaY) < 8)
    return

  wheelLocked = true
  switchBy(event.deltaY > 0 ? 1 : -1)
  window.setTimeout(() => {
    wheelLocked = false
  }, 320)
}

function startAutoRotate() {
  stopAutoRotate()
  if (!hasPosts.value || posts.value.length <= 1 || isArticleHovered.value)
    return

  timer = setInterval(() => {
    if (!isArticleHovered.value)
      switchBy(1)
  }, intervalMs.value)
}

function stopAutoRotate() {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
}

watch(hasPosts, (available) => {
  if (!available) {
    stopAutoRotate()
    currentIndex.value = 0
  }
}, { immediate: true })

onMounted(() => {
  void loadNotice()

  if (!hasPosts.value || posts.value.length <= 1)
    return

  window.setTimeout(() => {
    if (!isArticleHovered.value)
      startAutoRotate()
  }, 3000)
})

onUnmounted(() => {
  stopAutoRotate()
})
</script>

<template>
  <div m="b-5 t-10" class="notice-board-wrap">
    <div class="notice-board-wrap__notice sakura-card">
      <h3 class="notice-board-wrap__title">
        {{ noticeTitle }}
      </h3>

      <template
        v-for="(section, sectionIndex) in noticeSections"
        :key="`${section.label}-${sectionIndex}`"
      >
        <div class="notice-board-wrap__section">
          {{ section.label }}
        </div>
        <p
          v-for="(line, lineIndex) in section.lines"
          :key="`${sectionIndex}-${lineIndex}`"
          class="notice-board-wrap__line"
        >
          <a
            v-if="line.url"
            :href="line.url"
            class="notice-board-wrap__link"
            :target="line.external ? '_blank' : undefined"
            :rel="line.external ? 'noopener noreferrer' : undefined"
          >
            {{ line.text }}
          </a>
          <template v-else>
            {{ line.text }}
          </template>
        </p>
      </template>
    </div>

    <div
      v-if="hasPosts && currentPost"
      class="notice-board-wrap__article sakura-card"
      @mouseenter="onArticleMouseEnter"
      @mouseleave="onArticleMouseLeave"
      @wheel="onWheel"
    >
      <RouterLink
        class="notice-board-wrap__article-link"
        :to="currentPost.path"
        :aria-label="`查看文章：${currentPost.title}`"
      />

      <div
        class="notice-board-wrap__cover-col"
      >
        <div
          class="notice-board-wrap__dots"
          role="tablist"
          aria-label="文章切换"
        >
          <div
            class="notice-board-wrap__dot-center"
            aria-hidden="true"
          />
          <div class="notice-board-wrap__dots-track">
            <button
              v-for="dot in visibleDots"
              :key="dot.key"
              type="button"
              class="notice-board-wrap__dot"
              :class="{ 'is-active': dot.offset === 0 }"
              :aria-label="dot.offset === 0 ? '当前文章' : `切换${dot.offset > 0 ? '后' : '前'}${Math.abs(dot.offset)}篇`"
              :aria-selected="dot.offset === 0"
              role="tab"
              @click.stop="goToDot(dot.offset)"
            />
          </div>
        </div>

        <div class="notice-board-wrap__cover-frame">
          <div class="notice-board-wrap__fade-slot notice-board-wrap__fade-slot--cover">
            <div
              :key="currentPost.path"
              class="notice-board-wrap__cover"
            >
              <img
                v-if="currentCover"
                :src="currentCover"
                :alt="currentPost.title"
                loading="eager"
                fetchpriority="high"
                decoding="async"
                width="640"
                height="360"
              >
              <span v-else class="notice-board-wrap__cover-placeholder" />
            </div>
          </div>
        </div>
      </div>

      <div
        class="notice-board-wrap__meta-col"
      >
        <div class="notice-board-wrap__fade-slot notice-board-wrap__fade-slot--meta">
          <div
            :key="currentPost.path"
            class="notice-board-wrap__meta sakura-post-card-info"
          >
            <SakuraPostDate
              :date="currentPost.updated || currentPost.date"
              class="post-date order-1"
            />
            <h2 class="order-2 sakura-post-title notice-board-wrap__post-heading">
              {{ currentPost.title }}
            </h2>
            <p
              v-if="currentCategoryText || currentTagText"
              class="order-3 notice-board-wrap__meta-line"
            >
              <span v-if="currentCategoryText" class="notice-board-wrap__meta-item">{{ currentCategoryText }}</span>
              <span v-if="currentCategoryText && currentTagText" class="notice-board-wrap__meta-sep">·</span>
              <span v-if="currentTagText" class="notice-board-wrap__meta-item">{{ currentTagText }}</span>
            </p>
            <div class="order-4 notice-board-wrap__excerpt-slot">
              <p v-if="currentPost.excerpt" class="notice-board-wrap__excerpt">
                {{ currentPost.excerpt }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="notice-board-wrap__article notice-board-wrap__article--empty sakura-card"
    >
      <p class="notice-board-wrap__empty">
        暂无文章
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.notice-board-wrap {
  --notice-board-height: 250px;
  --notice-cover-height: 226px;
  --notice-meta-height: 218px;

  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 7fr);
  grid-template-rows: var(--notice-board-height);
  gap: 12px;
  width: 100%;

  &__notice,
  &__article {
    box-sizing: border-box;
    min-height: var(--notice-board-height);
    height: var(--notice-board-height);
    max-height: var(--notice-board-height);
    color: var(--sakura-color-text);
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.85);
    border-radius: var(--sakura-post-card-rd, 12px);
    background: var(--sakura-card-bg, var(--sakura-post-card-bg));
  }

  @at-root html.dark & {
    &__notice,
    &__article {
      border-color: var(--sakura-color-divider, rgb(255 255 255 / 20%));
    }
  }

  &__notice {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 16px 14px;
    text-align: center;
  }

  &__article {
    position: relative;
    display: grid;
    grid-template-columns: 58% 42%;
    grid-template-rows: var(--notice-board-height);
    flex-shrink: 0;
    contain: layout size style;
    isolation: isolate;
    overflow: hidden;
    transition: border-color 0.2s ease;

    &:hover {
      border-color: var(--sakura-color-primary);
    }

    &:has(.notice-board-wrap__article-link:active) {
      transform: none;
    }

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      grid-template-columns: none;
    }
  }

  &__article-link {
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: inherit;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:active {
      background-color: color-mix(in srgb, var(--sakura-color-primary) 12%, transparent);
    }
  }

  &__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--sakura-color-text-deep, inherit);
    letter-spacing: 0.06em;
    text-align: center;
  }

  &__section {
    margin-top: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--sakura-color-primary);
    letter-spacing: 0.04em;
    text-align: center;

    &:first-of-type {
      margin-top: 0;
    }
  }

  &__line {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 700;
    line-height: 1.55;
    color: var(--sakura-color-text);
    word-break: break-all;
    text-align: center;
  }

  &__link {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: var(--sakura-color-primary);
      text-decoration: underline;
    }
  }

  &__cover-col {
    --cover-height: var(--notice-cover-height);
    position: relative;
    display: flex;
    align-items: stretch;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    height: var(--notice-board-height);
    min-height: var(--notice-board-height);
    max-height: var(--notice-board-height);
    padding: 12px 10px 12px 34px;
    overflow: hidden;
  }

  &__cover-frame {
    display: block;
    flex: 1;
    min-width: 0;
    width: 100%;
    height: var(--cover-height);
    min-height: var(--cover-height);
    max-height: var(--cover-height);
    overflow: hidden;
  }

  &__fade-slot {
    position: relative;
    width: 100%;
    overflow: hidden;

    &--cover {
      width: 100%;
      height: var(--cover-height);
      min-height: var(--cover-height);
      max-height: var(--cover-height);
    }

    &--meta {
      height: var(--notice-meta-height);
      min-height: var(--notice-meta-height);
      max-height: var(--notice-meta-height);
    }
  }

  &__meta-col {
    display: flex;
    align-items: stretch;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    height: var(--notice-board-height);
    min-height: var(--notice-board-height);
    max-height: var(--notice-board-height);
    padding: 16px 14px 16px 10px;
    overflow: hidden;
  }

  &__dots {
    --dot-size: 8px;
    --dot-gap: 14px;
    --dot-step: calc(var(--dot-size) + var(--dot-gap));
    --dots-viewport-height: calc(var(--dot-size) * 5 + var(--dot-gap) * 4);
    position: absolute;
    top: 50%;
    left: 0;
    z-index: 3;
    width: 30px;
    height: var(--dots-viewport-height);
    margin-top: calc(var(--dots-viewport-height) / -2);
    overflow: hidden;
    pointer-events: none;
  }

  &__dot-center {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 2;
    width: 10px;
    height: 10px;
    margin-top: -5px;
    margin-left: -5px;
    border-radius: 50%;
    background: var(--sakura-color-primary);
    pointer-events: none;
  }

  &__dots-track {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--dot-gap);
    pointer-events: auto;
  }

  &__dot {
    flex-shrink: 0;
    width: var(--dot-size);
    height: var(--dot-size);
    padding: 0;
    border: none;
    border-radius: 50%;
    background: color-mix(in srgb, var(--sakura-color-primary) 28%, transparent);
    cursor: pointer;
    transition: transform 0.2s ease, background-color 0.2s ease;

    &.is-active {
      background: var(--sakura-color-primary);
    }

    &:hover {
      background: color-mix(in srgb, var(--sakura-color-primary) 55%, transparent);
      transform: scale(1.15);
    }
  }

  &__cover-col,
  &__meta-col {
    position: relative;
    z-index: 0;
  }

  &__cover {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 10px;
    overflow: hidden;
    background: color-mix(in srgb, var(--sakura-color-primary) 10%, var(--sakura-card-bg));

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
  }

  &__cover-placeholder {
    display: block;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--sakura-color-primary) 18%, transparent),
      color-mix(in srgb, var(--sakura-color-primary) 6%, transparent)
    );
  }

  &__meta {
    width: 100%;
    height: var(--notice-meta-height);
    min-height: var(--notice-meta-height);
    max-height: var(--notice-meta-height);
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow: hidden;

    &.sakura-post-card-info {
      .post-date {
        flex-shrink: 0;
        min-height: 1.25rem;
        font-size: 12px;
        color: var(--sakura-color-text);
      }

      .notice-board-wrap__meta-line {
        flex-shrink: 0;
        min-height: 1.25rem;
        max-height: 1.25rem;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
        line-height: 1.25rem;
        color: var(--sakura-color-text);
      }

      .notice-board-wrap__meta-item {
        display: inline;
      }

      .notice-board-wrap__meta-sep {
        margin-inline: 0.35rem;
        opacity: 0.65;
      }

      .notice-board-wrap__excerpt-slot {
        flex: 1;
        min-height: 3.5rem;
        max-height: 3.5rem;
        overflow: hidden;
      }

      .notice-board-wrap__post-heading {
        margin: 0 0 0.25rem;
        flex-shrink: 0;
        min-height: 3.65rem;
        max-height: none;
        display: -webkit-box;
        overflow: hidden;
        font-size: 1.125rem;
        font-weight: 700;
        line-height: 1.45;
        color: var(--sakura-color-text-deep, inherit);
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        word-break: break-word;
      }

      .notice-board-wrap__excerpt {
        margin: 0;
        display: -webkit-box;
        overflow: hidden;
        font-size: 0.875rem;
        line-height: 1.55;
        color: var(--sakura-color-text);
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    }
  }

  &__empty {
    margin: 0;
    color: var(--sakura-color-text-muted, #888);
    font-size: 0.9rem;
  }
}

@media (max-width: 768px) {
  .notice-board-wrap {
    --notice-mobile-cover-block: 190px;
    --notice-mobile-meta-block: 180px;
    --notice-mobile-article-height: calc(var(--notice-mobile-cover-block) + var(--notice-mobile-meta-block));
    --notice-cover-height: 160px;
    --notice-meta-height: var(--notice-mobile-meta-block);

    grid-template-columns: 1fr;
    grid-template-rows: auto;
    gap: 10px;

    &__notice {
      height: auto;
      min-height: 160px;
      max-height: none;
      padding: 16px 18px;
    }

    &__article {
      grid-template-columns: 1fr;
      grid-template-rows: var(--notice-mobile-cover-block) var(--notice-mobile-meta-block);
      height: var(--notice-mobile-article-height);
      min-height: var(--notice-mobile-article-height);
      max-height: var(--notice-mobile-article-height);
    }

    &__cover-col {
      --cover-height: 160px;
      height: var(--notice-mobile-cover-block);
      min-height: var(--notice-mobile-cover-block);
      max-height: var(--notice-mobile-cover-block);
      padding: 12px 12px 12px 34px;
    }

    &__cover-frame {
      height: var(--cover-height);
    }

    &__fade-slot--cover {
      height: var(--cover-height);
      min-height: var(--cover-height);
      max-height: var(--cover-height);
    }

    &__meta-col {
      align-items: stretch;
      height: var(--notice-mobile-meta-block);
      min-height: var(--notice-mobile-meta-block);
      max-height: var(--notice-mobile-meta-block);
      padding: 10px 16px 12px;
      overflow: hidden;
    }

    &__fade-slot--meta {
      height: 100%;
      min-height: 100%;
      max-height: 100%;
    }

    &__meta {
      height: var(--notice-mobile-meta-block);
      min-height: var(--notice-mobile-meta-block);
      max-height: var(--notice-mobile-meta-block);
      justify-content: flex-start;

      &.sakura-post-card-info {
        .notice-board-wrap__excerpt-slot {
          min-height: 3rem;
          max-height: 3rem;
        }

        .notice-board-wrap__post-heading {
          min-height: 3.2rem;
          font-size: 1rem;
          line-height: 1.4;
          -webkit-line-clamp: 2;
        }

        .notice-board-wrap__excerpt {
          font-size: 0.875rem;
          line-height: 1.5;
          -webkit-line-clamp: 2;
        }
      }
    }
  }
}
</style>
