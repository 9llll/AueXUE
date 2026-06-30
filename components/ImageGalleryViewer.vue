<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  closeGallery,
  galleryImages,
  galleryIndex,
  galleryVisible,
  goToImage,
  nextImage,
  prevImage,
} from '../utils/imageGallery'
import { createLightboxSwipeHandlers } from '../utils/useLightboxSwipe'
import { useLightboxZoom } from '../utils/useLightboxZoom'

const thumbsContainerRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
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

const current = computed(() => galleryImages.value[galleryIndex.value])
const hasPrev = computed(() => galleryIndex.value > 0)
const hasNext = computed(() => galleryIndex.value < galleryImages.value.length - 1)
const showThumbs = computed(() => galleryImages.value.length > 1)
const counter = computed(() => {
  if (galleryImages.value.length <= 1)
    return ''

  return `${galleryIndex.value + 1} / ${galleryImages.value.length}`
})

const trackOffset = computed(() => {
  const containerWidth = thumbsContainerRef.value?.clientWidth ?? 0
  if (!containerWidth)
    return 0

  return containerWidth / 2 - thumbWidth.value / 2 - galleryIndex.value * thumbStep.value
})

const swipeHandlers = createLightboxSwipeHandlers({
  enabled: () => galleryVisible.value && galleryImages.value.length > 1,
  shouldIgnore: () => isZoomed.value || isDragging.value || isPinching.value,
  onPrev: prevImage,
  onNext: nextImage,
})

function updateThumbMetrics() {
  const container = thumbsContainerRef.value
  const thumb = container?.querySelector<HTMLElement>('.image-gallery__thumb')
  const track = container?.querySelector<HTMLElement>('.image-gallery__thumbs-track')

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

function onKeydown(event: KeyboardEvent) {
  if (!galleryVisible.value)
    return

  if (event.key === 'Escape') {
    closeGallery()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prevImage()
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    nextImage()
  }
}

function onMobileBackdropClose() {
  if (!window.matchMedia('(max-width: 640px)').matches)
    return

  closeGallery()
}

watch(galleryVisible, (visible) => {
  if (visible) {
    document.documentElement.classList.add('image-gallery-open')
    syncThumbTrack()
  }
  else {
    document.documentElement.classList.remove('image-gallery-open')
    resetZoomState()
  }
})

watch(galleryIndex, () => {
  resetZoomState()
  if (galleryVisible.value)
    syncThumbTrack()
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
    <Transition name="image-gallery-fade">
      <div
        v-if="galleryVisible && current"
        class="image-gallery"
        role="dialog"
        aria-modal="true"
        :aria-label="current.alt || '图片预览'"
        @click.self="closeGallery"
      >
        <div
          class="image-gallery__main"
          @click.self="onMobileBackdropClose"
        >
          <button
            type="button"
            class="image-gallery__close"
            aria-label="关闭预览"
            @click="closeGallery"
          >
            ×
          </button>

          <button
            v-if="hasPrev"
            type="button"
            class="image-gallery__nav image-gallery__nav--prev"
            aria-label="上一张"
            @click.stop="prevImage"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14.5 6.5 9 12l5.5 5.5" />
            </svg>
          </button>

          <button
            v-if="hasNext"
            type="button"
            class="image-gallery__nav image-gallery__nav--next"
            aria-label="下一张"
            @click.stop="nextImage"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.5 6.5 15 12l-5.5 5.5" />
            </svg>
          </button>

          <div
            class="image-gallery__stage"
            :class="{ 'is-zoomed': isZoomed || isPinching }"
            @click.self="onMobileBackdropClose"
            @touchstart.passive="swipeHandlers.onTouchStart"
            @touchend.passive="swipeHandlers.onTouchEnd"
            @touchcancel="swipeHandlers.onTouchCancel"
          >
            <div
              class="image-gallery__viewport"
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
                class="image-gallery__img"
                :class="{ 'is-zoomed': isZoomed }"
                :style="imageTransformStyle"
                :src="current.src"
                :alt="current.alt"
                draggable="false"
                @dblclick.stop="onImageDblClick"
              >
            </div>

            <p v-if="current.alt" class="image-gallery__caption">
              {{ current.alt }}
            </p>

            <span v-if="counter" class="image-gallery__counter">
              {{ counter }}
            </span>
          </div>
        </div>

        <div
          v-if="showThumbs"
          ref="thumbsContainerRef"
          class="image-gallery__thumbs"
          @click.stop
        >
          <div class="image-gallery__thumbs-indicator" aria-hidden="true" />

          <div
            class="image-gallery__thumbs-track"
            :style="{ transform: `translateX(${trackOffset}px)` }"
          >
            <button
              v-for="(image, index) in galleryImages"
              :key="`${image.src}-${index}`"
              type="button"
              class="image-gallery__thumb"
              :aria-label="`查看第 ${index + 1} 张图片`"
              :aria-current="index === galleryIndex ? 'true' : undefined"
              @click="goToImage(index)"
            >
              <img
                class="image-gallery__thumb-img"
                :src="image.src"
                :alt="image.alt || `缩略图 ${index + 1}`"
                loading="lazy"
                decoding="async"
              >
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.image-gallery {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: rgb(0 0 0 / 82%);
  backdrop-filter: blur(4px);
}

.image-gallery__main {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 56px 72px 20px;
  box-sizing: border-box;
}

.image-gallery__stage {
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

.image-gallery__viewport {
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

.image-gallery__img {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 220px);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 35%);
  user-select: none;
  cursor: zoom-in;
  -webkit-user-drag: none;

  &.is-zoomed {
    cursor: zoom-out;
  }
}

.image-gallery__caption {
  margin: 14px 0 0;
  max-width: 100%;
  font-size: 0.9rem;
  line-height: 1.5;
  text-align: center;
  color: rgb(255 255 255 / 88%);
}

.image-gallery__counter {
  position: absolute;
  top: -36px;
  right: 0;
  font-size: 0.82rem;
  color: rgb(255 255 255 / 72%);
  font-variant-numeric: tabular-nums;
}

.image-gallery__thumbs {
  position: relative;
  width: 100%;
  padding: 12px 0 calc(14px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  overflow: hidden;
  background: linear-gradient(to top, rgb(0 0 0 / 55%), rgb(0 0 0 / 18%));
  border-top: 1px solid rgb(255 255 255 / 10%);
}

.image-gallery__thumbs-indicator {
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

.image-gallery__thumbs-track {
  display: flex;
  gap: 10px;
  align-items: center;
  width: max-content;
  transition: transform 0.28s ease;
  will-change: transform;
}

.image-gallery__thumb {
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

.image-gallery__thumb-img {
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

.image-gallery__close,
.image-gallery__nav {
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

.image-gallery__close {
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.5rem;
  line-height: 1;
  font-family: system-ui, sans-serif;
}

.image-gallery__nav {
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

.image-gallery-fade-enter-active,
.image-gallery-fade-leave-active {
  transition: opacity 0.2s ease;
}

.image-gallery-fade-enter-from,
.image-gallery-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .image-gallery__main {
    padding: 48px 12px 12px;
  }

  .image-gallery__nav {
    display: none;
  }

  .image-gallery__img {
    max-height: calc(100vh - 200px);
  }

  .image-gallery__thumb,
  .image-gallery__thumbs-indicator {
    width: 60px;
    height: 45px;
  }

  .image-gallery__thumbs {
    padding-inline: 0;
  }
}
</style>
