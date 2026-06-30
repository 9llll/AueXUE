<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useThemeConfig } from '../node_modules/valaxy-theme-sakura/composables'
import { useSakuraAppStore } from '../node_modules/valaxy-theme-sakura/stores'
import { isVideoUrl } from '../node_modules/valaxy-theme-sakura/utils'

const props = withDefaults(defineProps<{
  urls?: string[] | string
  /** 按 wallpaperIndex 顺序展示 */
  sequential?: boolean
  /** 进入时随机选一张并固定，不随全局 index 变化 */
  randomOnMount?: boolean
  /** 背景图不固定到视口（admin 等独立全屏页使用） */
  scrollBackground?: boolean
  /** 关闭切换动画，避免进入页面时闪烁 */
  disableTransition?: boolean
}>(), {
  sequential: false,
  randomOnMount: false,
  scrollBackground: false,
  disableTransition: false,
})

const visitedUrls = ref<number[]>([])
const allowRandomWallpaper = ref(false)

const sakura = useSakuraAppStore()
const themeConfig = useThemeConfig()

function pickInitialRandomIndex() {
  if (!props.randomOnMount)
    return null
  const list = props.urls || themeConfig.value.hero.urls || ''
  if (!Array.isArray(list) || !list.length)
    return null
  return Math.floor(Math.random() * list.length)
}

const fixedRandomIndex = ref<number | null>(pickInitialRandomIndex())

const urls = computed(() => props.urls || themeConfig.value.hero.urls || '')
const hero = computed(() => themeConfig.value.hero)

function pickStableIndex() {
  const list = urls.value
  if (!Array.isArray(list) || !list.length)
    return 0

  return sakura.wallpaperIndex % list.length
}

function pickRandomIndex() {
  const list = urls.value
  if (!Array.isArray(list) || !list.length)
    return 0

  let randomIndex = 0
  do {
    randomIndex = Math.floor(Math.random() * list.length)
  } while (list.length > 1 && visitedUrls.value.includes(randomIndex))

  return randomIndex
}

const currentWallpaperUrl = computed(() => {
  if (typeof urls.value === 'string')
    return urls.value

  if (!Array.isArray(urls.value) || !urls.value.length)
    return ''

  if (props.randomOnMount) {
    if (fixedRandomIndex.value !== null)
      return urls.value[fixedRandomIndex.value] ?? urls.value[0]
    return ''
  }

  if (!props.sequential && hero.value.randomUrls && allowRandomWallpaper.value)
    return urls.value[pickRandomIndex()]

  return urls.value[pickStableIndex()]
})

const isCurrentMediaVideo = computed(() => isVideoUrl(currentWallpaperUrl.value))

const backgroundAttachment = computed(() => {
  if (props.scrollBackground)
    return 'scroll'
  return hero.value.fixedImg ? 'fixed' : 'scroll'
})

watch(() => sakura.wallpaperIndex, (newIndex, oldIndex) => {
  const list = urls.value
  if (!Array.isArray(list))
    return

  const urlsLength = list.length
  if (visitedUrls.value.length === urlsLength)
    visitedUrls.value = []

  visitedUrls.value.push(oldIndex)
})

watch(() => sakura.wallpaperIndex, () => {
  if (!Array.isArray(urls.value))
    return

  if (sakura.wallpaperIndex >= urls.value.length)
    sakura.wallpaperIndex = 0
}, { immediate: true })

watch(() => urls.value.length, (length) => {
  sakura.wallpaperLength = length
}, { immediate: true })

onMounted(() => {
  allowRandomWallpaper.value = true
  if (props.randomOnMount) {
    const list = urls.value
    if (Array.isArray(list) && list.length)
      fixedRandomIndex.value = Math.floor(Math.random() * list.length)
  }
})
</script>

<template>
  <div class="sakura-hero-background" :class="{ 'sakura-hero-background--no-transition': disableTransition }">
    <Transition
      :name="disableTransition ? '' : (sakura.wallpaperOperation === 'nextMedia' ? 'slide-right'
        : sakura.wallpaperOperation === 'prevMedia' ? 'slide-left'
          : 'fade')"
      mode="out-in"
    >
      <template v-if="sakura.wallpaperIsPlaying || isCurrentMediaVideo">
        <video
          :key="sakura.wallpaperIsPlaying ? hero.playerUrl : currentWallpaperUrl"
          class="min-h-full min-w-full object-cover"
          preload="auto" autoplay :loop="!sakura.wallpaperIsPlaying" :muted="!sakura.wallpaperIsPlaying"
          :disablePictureInPicture="hero.disablePictureInPicture"
          @ended="sakura.wallpaperIsPlaying = false"
        >
          <source :src="sakura.wallpaperIsPlaying ? hero.playerUrl : currentWallpaperUrl" type="video/mp4">
          Your browser does not support video tags
        </video>
      </template>
      <template v-else>
        <div
          v-if="currentWallpaperUrl" :key="currentWallpaperUrl" class="sakura-hero-background-img"
          :style="{ backgroundImage: `url(${currentWallpaperUrl})`, backgroundAttachment: backgroundAttachment }"
        />
        <div v-else class="sakura-hero-background-default h-full w-full" />
      </template>
    </Transition>
  </div>
</template>

<style lang="scss">
.sakura-hero-background {
  height: 100dvh;
  width: 100%;
  overflow: hidden;

  &--no-transition {
    .fade-enter-active,
    .fade-leave-active,
    .slide-right-enter-active,
    .slide-right-leave-active,
    .slide-left-enter-active,
    .slide-left-leave-active {
      transition: none !important;
    }
  }

  &-img {
    height: 100%;
    width: 100%;
    background-size: cover;
    background-position: center;
    object-fit: cover;
  }

  &-default {
    background: linear-gradient(
      45deg,
      var(--sakura-color-primary),
      var(--sakura-color-primary)
    );
    background-size: 600% 600%;
    animation: gradient-background 10s ease infinite;
  }

  @keyframes gradient-background {
    0% {
      background-position: 0% 50%;
    }

    50% {
      background-position: 100% 50%;
    }

    100% {
      background-position: 0% 50%;
    }
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s;
  }

  .fade-enter,
  .fade-leave-to {
    opacity: 0;
  }

  .slide-right {
    &-enter-active,
    &-leave-active {
      transition: transform 1s ease;
    }

    &-enter-from,
    &-leave-to {
      transform: translateX(-100%);
    }

    &-enter-to,
    &-leave-from {
      transform: translateX(0);
    }
  }

  .slide-left-enter-active,
  .slide-left-leave-active {
    transition: transform 1s ease;
  }

  .slide-left-enter,
  .slide-left-leave-to {
    transform: translateX(100%);
  }
}
</style>
