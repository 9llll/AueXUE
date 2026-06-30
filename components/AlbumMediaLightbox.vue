<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  albumMediaIndex,
  albumMediaItems,
  albumMediaVisible,
  closeAlbumMediaGallery,
  goToAlbumMedia,
  nextAlbumMedia,
  prevAlbumMedia,
} from '../utils/albumMediaGallery'
import { createLightboxSwipeHandlers } from '../utils/useLightboxSwipe'
import { useLightboxZoom } from '../utils/useLightboxZoom'
import AlbumVideoThumb from './AlbumVideoThumb.vue'

const thumbsContainerRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const thumbWidth = ref(72)
const thumbStep = ref(82)

const {
  isZoomed,
  isDragging,
  isPinching,
  imageTransformStyle,
  resetZoomState,
  onImageDblClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
} = useLightboxZoom(imageRef)

const current = computed(() => albumMediaItems.value[albumMediaIndex.value])
const hasPrev = computed(() => albumMediaIndex.value > 0)
const hasNext = computed(() => albumMediaIndex.value < albumMediaItems.value.length - 1)
const showThumbs = computed(() => albumMediaItems.value.length > 1)
const counter = computed(() => {
  if (albumMediaItems.value.length <= 1)
    return ''

  return `${albumMediaIndex.value + 1} / ${albumMediaItems.value.length}`
})

const trackOffset = computed(() => {
  const containerWidth = thumbsContainerRef.value?.clientWidth ?? 0
  if (!containerWidth)
    return 0

  return containerWidth / 2 - thumbWidth.value / 2 - albumMediaIndex.value * thumbStep.value
})

const swipeHandlers = createLightboxSwipeHandlers({
  enabled: () => albumMediaVisible.value && albumMediaItems.value.length > 1,
  shouldIgnore: () => isZoomed.value || isDragging.value || isPinching.value,
  onPrev: prevAlbumMedia,
  onNext: nextAlbumMedia,
})

function updateThumbMetrics() {
  const container = thumbsContainerRef.value
  const thumb = container?.querySelector<HTMLElement>('.album-media-lightbox__thumb')
  const track = container?.querySelector<HTMLElement>('.album-media-lightbox__thumbs-track')

  if (!container || !thumb || !track)
    return

  thumbWidth.value = thumb.offsetWidth

  const gapValue = Number.parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0')
  thumbStep.value = thumbWidth.value + (Number.isFinite(gapValue) ? gapValue : 0)
}

async function syncThumbTrack() {
  await nextTick()
  updateThumbMetrics()
}

function pauseVideo() {
  const video = videoRef.value
  if (video && !video.paused)
    video.pause()
}

function playCurrentVideo() {
  const video = videoRef.value
  if (!video || current.value?.type !== 'video')
    return

  video.currentTime = 0
  void video.play().catch(() => {})
}

function onKeydown(event: KeyboardEvent) {
  if (!albumMediaVisible.value)
    return

  if (event.key === 'Escape') {
    closeAlbumMediaGallery()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prevAlbumMedia()
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    nextAlbumMedia()
  }
}

function onMobileBackdropClose() {
  if (!window.matchMedia('(max-width: 640px)').matches)
    return

  closeAlbumMediaGallery()
}

watch(albumMediaVisible, (visible) => {
  if (visible) {
    document.documentElement.classList.add('image-gallery-open')
    syncThumbTrack()
    nextTick(() => playCurrentVideo())
  }
  else {
    document.documentElement.classList.remove('image-gallery-open')
    pauseVideo()
    resetZoomState()
  }
})

watch(albumMediaIndex, () => {
  resetZoomState()
  pauseVideo()
  if (albumMediaVisible.value) {
    syncThumbTrack()
    nextTick(() => playCurrentVideo())
  }
})

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', updateThumbMetrics)

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateThumbMetrics()
    })
  }
})

watch(thumbsContainerRef, (container, _, onCleanup) => {
  if (resizeObserver && container)
    resizeObserver.observe(container)

  onCleanup(() => {
    if (resizeObserver && container)
      resizeObserver.unobserve(container)
  })
}, { flush: 'post' })

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateThumbMetrics)
  resizeObserver?.disconnect()
  document.documentElement.classList.remove('image-gallery-open')
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="album-media-fade">
      <div
        v-if="albumMediaVisible && current"
        class="album-media-lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="current.alt || '媒体预览'"
        @click.self="closeAlbumMediaGallery"
      >
        <div
          class="album-media-lightbox__main"
          @click.self="onMobileBackdropClose"
        >
          <button
            type="button"
            class="album-media-lightbox__close"
            aria-label="关闭预览"
            @click="closeAlbumMediaGallery"
          >
            ×
          </button>

          <button
            v-if="hasPrev"
            type="button"
            class="album-media-lightbox__nav album-media-lightbox__nav--prev"
            aria-label="上一项"
            @click.stop="prevAlbumMedia"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14.5 6.5 9 12l5.5 5.5" />
            </svg>
          </button>

          <button
            v-if="hasNext"
            type="button"
            class="album-media-lightbox__nav album-media-lightbox__nav--next"
            aria-label="下一项"
            @click.stop="nextAlbumMedia"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.5 6.5 15 12l-5.5 5.5" />
            </svg>
          </button>

          <div
            class="album-media-lightbox__stage"
            :class="{ 'is-zoomed': isZoomed || isPinching }"
            @click.self="onMobileBackdropClose"
            @touchstart.passive="swipeHandlers.onTouchStart"
            @touchend.passive="swipeHandlers.onTouchEnd"
            @touchcancel="swipeHandlers.onTouchCancel"
          >
            <video
              v-if="current.type === 'video'"
              ref="videoRef"
              :key="current.src"
              class="album-media-lightbox__video"
              :src="current.src"
              :poster="current.poster"
              controls
              playsinline
              preload="metadata"
              @click.stop
            />
            <div
              v-else
              class="album-media-lightbox__viewport"
              :class="{
                'is-zoomed': isZoomed || isPinching,
                'is-dragging': isDragging,
                'is-pinching': isPinching,
              }"
              @click.self="onMobileBackdropClose"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              @wheel.prevent="onWheel"
              @touchstart="onTouchStart"
              @touchmove.prevent="onTouchMove"
              @touchend="onTouchEnd"
              @touchcancel="onTouchCancel"
            >
              <img
                ref="imageRef"
                :key="current.src"
                class="album-media-lightbox__img"
                :class="{ 'is-zoomed': isZoomed }"
                :style="imageTransformStyle"
                :src="current.src"
                :alt="current.alt"
                draggable="false"
                @dblclick.stop="onImageDblClick"
              >
            </div>

            <p v-if="current.alt" class="album-media-lightbox__caption">
              {{ current.alt }}
            </p>

            <span v-if="counter" class="album-media-lightbox__counter">
              {{ counter }}
            </span>
          </div>
        </div>

        <div
          v-if="showThumbs"
          ref="thumbsContainerRef"
          class="album-media-lightbox__thumbs"
          @click.stop
        >
          <div class="album-media-lightbox__thumbs-indicator" aria-hidden="true" />

          <div
            class="album-media-lightbox__thumbs-track"
            :style="{ transform: `translateX(${trackOffset}px)` }"
          >
            <button
              v-for="(item, index) in albumMediaItems"
              :key="`${item.src}-${index}`"
              type="button"
              class="album-media-lightbox__thumb"
              :aria-label="`查看第 ${index + 1} 项`"
              :aria-current="index === albumMediaIndex ? 'true' : undefined"
              @click="goToAlbumMedia(index)"
            >
              <AlbumVideoThumb
                v-if="item.type === 'video'"
                class="album-media-lightbox__thumb-media"
                :src="item.src"
                :poster="item.poster"
                :alt="item.alt || `缩略图 ${index + 1}`"
              />
              <img
                v-else
                class="album-media-lightbox__thumb-media"
                :src="item.src"
                :alt="item.alt || `缩略图 ${index + 1}`"
                loading="lazy"
                decoding="async"
              >
              <span
                v-if="item.type === 'video'"
                class="album-media-lightbox__thumb-play"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.album-media-lightbox {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: rgb(0 0 0 / 82%);
  backdrop-filter: blur(4px);
}

.album-media-lightbox__main {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 56px 72px 20px;
  box-sizing: border-box;
}

.album-media-lightbox__stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: min(96vw, 1200px);
  max-height: 100%;
  overflow: hidden;
  touch-action: pan-y pinch-zoom;

  &.is-zoomed {
    touch-action: none;
  }
}

.album-media-lightbox__viewport {
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: 100%;
  max-height: calc(100vh - 220px);
  overflow: hidden;

  &.is-zoomed,
  &.is-pinching {
    touch-action: none;
  }

  &.is-zoomed {
    cursor: grab;
    width: 100%;
    height: calc(100vh - 220px);

    &.is-dragging {
      cursor: grabbing;
    }
  }
}

.album-media-lightbox__img,
.album-media-lightbox__video {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 220px);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 35%);
}

.album-media-lightbox__img {
  object-fit: contain;
  user-select: none;
  cursor: zoom-in;
  -webkit-user-drag: none;

  &.is-zoomed {
    cursor: zoom-out;
  }
}

.album-media-lightbox__video {
  width: 100%;
  background: #000;
}

.album-media-lightbox__caption {
  margin: 14px 0 0;
  max-width: 100%;
  font-size: 0.9rem;
  line-height: 1.5;
  text-align: center;
  color: rgb(255 255 255 / 88%);
}

.album-media-lightbox__counter {
  position: absolute;
  top: -36px;
  right: 0;
  font-size: 0.82rem;
  color: rgb(255 255 255 / 72%);
  font-variant-numeric: tabular-nums;
}

.album-media-lightbox__thumbs {
  position: relative;
  width: 100%;
  padding: 12px 0 calc(14px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  overflow: hidden;
  background: linear-gradient(to top, rgb(0 0 0 / 55%), rgb(0 0 0 / 18%));
  border-top: 1px solid rgb(255 255 255 / 10%);
}

.album-media-lightbox__thumbs-indicator {
  position: absolute;
  top: 12px;
  left: 50%;
  z-index: 2;
  width: 72px;
  height: 54px;
  border: 2px solid var(--sakura-color-primary, #fe9500);
  border-radius: 8px;
  pointer-events: none;
  transform: translateX(-50%);
  box-shadow: 0 0 0 1px rgb(254 149 0 / 35%);
}

.album-media-lightbox__thumbs-track {
  display: flex;
  gap: 10px;
  align-items: center;
  width: max-content;
  transition: transform 0.28s ease;
  will-change: transform;
}

.album-media-lightbox__thumb {
  position: relative;
  flex: 0 0 auto;
  width: 72px;
  height: 54px;
  padding: 0;
  border: none;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: rgb(255 255 255 / 8%);
  transition: opacity 0.2s ease, transform 0.2s ease;
  opacity: 0.72;

  &:hover {
    opacity: 0.95;
    transform: translateY(-2px);
  }

  &[aria-current='true'] {
    opacity: 1;
  }
}

.album-media-lightbox__thumb-media {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  user-select: none;
  pointer-events: none;
}

.album-media-lightbox__thumb-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 28%);
  pointer-events: none;

  svg {
    width: 18px;
    height: 18px;
    fill: #fff;
  }
}

.album-media-lightbox__close,
.album-media-lightbox__nav {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  cursor: pointer;
  color: #fff;
  background: rgb(0 0 0 / 42%);
  transition: background 0.2s ease;

  &:hover {
    background: rgb(0 0 0 / 62%);
  }
}

.album-media-lightbox__close {
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.5rem;
  line-height: 1;
  font-family: system-ui, sans-serif;
}

.album-media-lightbox__nav {
  top: 50%;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  transform: translateY(-50%);

  svg {
    display: block;
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentcolor;
    stroke-width: 2.25;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &--prev {
    left: 16px;
  }

  &--next {
    right: 16px;
  }
}

.album-media-fade-enter-active,
.album-media-fade-leave-active {
  transition: opacity 0.2s ease;
}

.album-media-fade-enter-from,
.album-media-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .album-media-lightbox__main {
    padding: 48px 12px 12px;
  }

  .album-media-lightbox__nav {
    display: none;
  }

  .album-media-lightbox__img,
  .album-media-lightbox__video {
    max-height: calc(100vh - 200px);
  }

  .album-media-lightbox__thumb,
  .album-media-lightbox__thumbs-indicator {
    width: 60px;
    height: 45px;
  }
}
</style>
