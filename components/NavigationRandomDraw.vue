<script lang="ts" setup>
import type { NavDrawVideo, NavSiteItem } from '~/types/navigation'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSiteConfig } from 'valaxy'

type DrawPhase = 'idle' | 'video' | 'silhouette' | 'reveal'

const props = defineProps<{
  sites: NavSiteItem[]
  drawVideos: NavDrawVideo[]
}>()

const phase = ref<DrawPhase>('idle')
const selectedSite = ref<NavSiteItem | null>(null)
const currentVideoUrl = ref('')
const videoRef = ref<HTMLVideoElement | null>(null)
const videoStageRef = ref<HTMLDivElement | null>(null)
const videoCacheRef = ref<HTMLDivElement | null>(null)
const teleportReady = ref(false)
const isBusy = computed(() => phase.value !== 'idle' && phase.value !== 'reveal')

const SILHOUETTE_DROP_MS = 880
const SILHOUETTE_REVEAL_DELAY_MS = 100

let autoRevealTimer: ReturnType<typeof setTimeout> | null = null

const previewFallback = 'https://r2tc.20030327.xyz/file/博客/主题/1780643226230_wallhaven-9d1yjk.png'
const triggerLabel = '点我到处转转吧'
const siteConfig = useSiteConfig()
const triggerAvatar = computed(() => siteConfig.value.author?.avatar || previewFallback)
const MARQUEE_ROW_COUNT = 3
const MARQUEE_DURATIONS = [52, 64, 46]

function getAvatar(site: NavSiteItem) {
  return site.avatar || previewFallback
}

interface MarqueeSite extends NavSiteItem {
  avatar: string
  color: string
}

const marqueeRows = computed(() => {
  if (!props.sites.length)
    return []

  const normalized: MarqueeSite[] = props.sites.map(site => ({
    ...site,
    avatar: getAvatar(site),
    color: site.color || '#df9193',
  }))

  const rows: MarqueeSite[][] = Array.from({ length: MARQUEE_ROW_COUNT }, () => [])
  normalized.forEach((site, index) => {
    rows[index % MARQUEE_ROW_COUNT].push(site)
  })

  return rows
    .filter(row => row.length > 0)
    .map((sites, index) => ({
      id: index,
      sites,
      duration: MARQUEE_DURATIONS[index % MARQUEE_DURATIONS.length],
    }))
})

const centerRowId = computed(() => {
  if (!marqueeRows.value.length)
    return -1
  return Math.floor(marqueeRows.value.length / 2)
})

function pickRandomSite() {
  if (!props.sites.length)
    return null
  const index = Math.floor(Math.random() * props.sites.length)
  return props.sites[index]
}

function pickRandomVideo() {
  const videos = props.drawVideos.filter(video => video.url && video.weight > 0)
  if (!videos.length)
    return ''

  const total = videos.reduce((sum, video) => sum + video.weight, 0)
  let roll = Math.random() * total

  for (const video of videos) {
    roll -= video.weight
    if (roll < 0)
      return video.url
  }

  return videos[videos.length - 1].url
}

function clearSilhouetteTimers() {
  if (autoRevealTimer) {
    clearTimeout(autoRevealTimer)
    autoRevealTimer = null
  }
}

function scheduleAutoReveal() {
  clearSilhouetteTimers()
  autoRevealTimer = setTimeout(() => {
    if (phase.value === 'silhouette')
      openReveal()
    autoRevealTimer = null
  }, SILHOUETTE_REVEAL_DELAY_MS)
}

function onSilhouetteAnimationEnd(e: AnimationEvent) {
  if (e.target !== e.currentTarget)
    return
  if (e.animationName !== 'nav-silhouette-drop' || phase.value !== 'silhouette')
    return
  scheduleAutoReveal()
}

function resetDraw() {
  clearSilhouetteTimers()
  phase.value = 'idle'
  selectedSite.value = null
  document.documentElement.classList.remove('nav-random-draw-open')
  if (videoRef.value) {
    videoRef.value.pause()
    videoRef.value.currentTime = 0
  }
}

function preloadVideo() {
  const video = videoRef.value
  if (!video)
    return
  video.preload = 'auto'
  video.load()
}

async function skipVideo() {
  if (phase.value !== 'video')
    return
  videoRef.value?.pause()
  clearSilhouetteTimers()
  phase.value = 'silhouette'
}

async function startDraw() {
  if (!props.sites.length || isBusy.value)
    return

  const site = pickRandomSite()
  if (!site)
    return

  selectedSite.value = site
  currentVideoUrl.value = pickRandomVideo()
  phase.value = 'video'
  document.documentElement.classList.add('nav-random-draw-open')

  await nextTick()
  const video = videoRef.value
  if (!video || !currentVideoUrl.value)
    return

  video.load()
  video.currentTime = 0

  try {
    await video.play()
  }
  catch {
    await skipVideo()
  }
}

async function onVideoEnded() {
  await skipVideo()
}

async function onVideoError() {
  await skipVideo()
}

function openReveal() {
  if (phase.value === 'silhouette')
    phase.value = 'reveal'
}

function confirmJump() {
  if (!selectedSite.value?.url)
    return
  window.open(selectedSite.value.url, '_blank', 'noopener,noreferrer')
  resetDraw()
}

function getMarqueeSiteKey(rowId: number, setIndex: number, siteIndex: number, url: string) {
  return `${rowId}-${setIndex}-${siteIndex}-${url}`
}

function onVideoKeydown(e: KeyboardEvent) {
  if (phase.value !== 'video')
    return
  if (e.key === 'Escape') {
    skipVideo()
    return
  }
  e.preventDefault()
}

function preloadAllVideos() {
  if (props.drawVideos.length)
    currentVideoUrl.value = props.drawVideos[0].url
  nextTick(() => {
    preloadVideo()
    videoCacheRef.value?.querySelectorAll('video').forEach((el) => {
      const video = el as HTMLVideoElement
      video.preload = 'auto'
      video.load()
    })
  })
}

onMounted(() => {
  teleportReady.value = true
  preloadAllVideos()
  document.addEventListener('keydown', onVideoKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onVideoKeydown)
  resetDraw()
})

watch(phase, (value) => {
  if (value !== 'silhouette')
    return
  clearSilhouetteTimers()
  autoRevealTimer = setTimeout(() => {
    if (phase.value === 'silhouette')
      openReveal()
    autoRevealTimer = null
  }, SILHOUETTE_DROP_MS + SILHOUETTE_REVEAL_DELAY_MS + 120)
})

watch(() => props.drawVideos, () => {
  preloadAllVideos()
}, { deep: true })
</script>

<template>
  <section class="nav-random-draw">
    <div
      v-if="marqueeRows.length"
      class="nav-random-draw__marquee"
    >
      <div
        v-for="row in marqueeRows"
        :key="row.id"
        class="nav-random-draw__marquee-row"
        :class="{ 'is-center-row': row.id === centerRowId }"
      >
        <div class="nav-random-draw__marquee-viewport">
          <div
            class="nav-random-draw__marquee-track"
            :class="{ 'is-paused': isBusy }"
            :style="{ '--marquee-duration': `${row.duration}s` }"
          >
            <div
              v-for="setIndex in 2"
              :key="setIndex"
              class="nav-random-draw__marquee-set"
            >
              <a
                v-for="(site, siteIndex) in row.sites"
                :key="getMarqueeSiteKey(row.id, setIndex, siteIndex, site.url)"
                class="nav-random-draw__marquee-card"
                :href="site.url"
                target="_blank"
                rel="noopener noreferrer"
                :title="site.name"
                :style="{ '--site-color': site.color }"
              >
                <img
                  class="nav-random-draw__marquee-avatar"
                  :src="site.avatar"
                  :alt="site.name"
                  loading="lazy"
                >
                <span class="nav-random-draw__marquee-name">{{ site.name }}</span>
              </a>
            </div>
          </div>
        </div>

        <button
          v-if="row.id === centerRowId"
          type="button"
          class="nav-random-draw__trigger"
          :disabled="!sites.length || !drawVideos.length || isBusy"
          :aria-label="triggerLabel"
          @click="startDraw"
        >
          <img
            class="nav-random-draw__marquee-avatar"
            :src="triggerAvatar"
            alt=""
            loading="lazy"
            aria-hidden="true"
          >
          <span class="nav-random-draw__marquee-name">{{ triggerLabel }}</span>
        </button>
      </div>
    </div>

    <button
      v-else
      type="button"
      class="nav-random-draw__trigger nav-random-draw__trigger--standalone"
      :disabled="!sites.length || !drawVideos.length || isBusy"
      :aria-label="triggerLabel"
      @click="startDraw"
    >
      <img
        class="nav-random-draw__marquee-avatar"
        :src="triggerAvatar"
        alt=""
        loading="lazy"
        aria-hidden="true"
      >
      <span class="nav-random-draw__marquee-name">{{ triggerLabel }}</span>
      <span class="nav-random-draw__hint">从本页全部导航中随机抽取</span>
    </button>

    <Teleport v-if="teleportReady" to="body">
      <div
        v-if="drawVideos.length"
        ref="videoCacheRef"
        class="nav-random-draw__video-cache"
        aria-hidden="true"
      >
        <video
          v-for="item in drawVideos"
          :key="`cache-${item.url}`"
          :src="item.url"
          preload="auto"
          muted
          playsinline
        />
      </div>

      <div
        ref="videoStageRef"
        class="nav-random-draw__video-stage"
        :class="{ 'is-active': phase === 'video' }"
      >
        <video
          ref="videoRef"
          class="nav-random-draw__video"
          :src="currentVideoUrl"
          preload="auto"
          playsinline
          disablepictureinpicture
          disableremoteplayback
          controlslist="nodownload nofullscreen noplaybackrate"
          @ended="onVideoEnded"
          @error="onVideoError"
          @contextmenu.prevent
        />
        <button
          v-if="phase === 'video'"
          type="button"
          class="nav-random-draw__video-skip"
          aria-label="跳过视频"
          @click="skipVideo"
        />
      </div>

      <div
        v-if="phase === 'silhouette' || phase === 'reveal'"
        class="nav-random-draw__overlay"
        :class="{ 'is-silhouette': phase === 'silhouette' }"
        role="dialog"
        aria-modal="true"
        :aria-label="phase === 'reveal' ? '网站信息确认' : '随机抽取动画'"
      >
        <div
          v-if="selectedSite"
          class="nav-random-draw__silhouette-stage"
        >
          <div
            v-if="phase === 'silhouette'"
            class="nav-random-draw__silhouette-burst"
            aria-hidden="true"
          />
          <div
            v-if="phase === 'silhouette'"
            class="nav-random-draw__silhouette-particles"
            aria-hidden="true"
          >
            <span
              v-for="i in 14"
              :key="i"
              :style="{ '--i': i }"
            />
          </div>

          <div
            class="nav-random-draw__draw-card"
            :class="{
              'is-entering': phase === 'silhouette' || phase === 'reveal',
              'is-revealed': phase === 'reveal',
            }"
            @animationend="onSilhouetteAnimationEnd"
          >
            <div class="nav-random-draw__draw-card-inner">
              <div class="nav-random-draw__draw-media">
                <div
                  v-if="phase === 'silhouette'"
                  class="nav-random-draw__silhouette-ring nav-random-draw__silhouette-ring--outer"
                />
                <div
                  v-if="phase === 'silhouette'"
                  class="nav-random-draw__silhouette-ring nav-random-draw__silhouette-ring--inner"
                />
                <img
                  class="nav-random-draw__draw-cover"
                  :src="getAvatar(selectedSite)"
                  :alt="selectedSite.name"
                >
                <div
                  v-if="phase === 'silhouette'"
                  class="nav-random-draw__silhouette-shine"
                />
              </div>

              <div class="nav-random-draw__draw-body">
                <img
                  class="nav-random-draw__draw-avatar"
                  :src="getAvatar(selectedSite)"
                  :alt="selectedSite.name"
                >
                <h3 class="nav-random-draw__draw-name">
                  {{ selectedSite.name }}
                </h3>
                <p class="nav-random-draw__draw-desc">
                  {{ selectedSite.desc || '暂无描述' }}
                </p>
                <p class="nav-random-draw__draw-url">
                  {{ selectedSite.url }}
                </p>

                <div class="nav-random-draw__actions">
                  <button
                    type="button"
                    class="nav-random-draw__btn nav-random-draw__btn--primary"
                    @click="confirmJump"
                  >
                    前往访问
                  </button>
                  <button
                    type="button"
                    class="nav-random-draw__btn nav-random-draw__btn--ghost"
                    @click="resetDraw"
                  >
                    暂不跳转
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style lang="scss" scoped>
.nav-random-draw {
  --nav-card-size: 84px;
  --nav-card-gap: 12px;
  --nav-trigger-width: calc(var(--nav-card-size) * 2 + var(--nav-card-gap));
  --nav-trigger-half: calc(var(--nav-trigger-width) / 2);
  --nav-fade-range: 152px;
  --nav-row-gap: 12px;
  --nav-card-hover-lift: 2px;
  --nav-card-hover-pad: calc(var(--nav-card-hover-lift) * 2 + 4px);

  width: 100%;
  margin: 8px 0 32px;

  &__marquee {
    display: flex;
    flex-direction: column;
    gap: var(--nav-row-gap);
    width: 100%;
  }

  &__marquee-row {
    position: relative;
    width: 100%;
    min-height: calc(var(--nav-card-size) + var(--nav-card-hover-pad));
  }

  &__marquee-viewport {
    width: 100%;
    padding-block: calc(var(--nav-card-hover-pad) / 2);
    overflow: hidden;
    box-sizing: border-box;
    -webkit-mask-image: linear-gradient(
      90deg,
      transparent 0%,
      #000 7%,
      #000 93%,
      transparent 100%
    );
    mask-image: linear-gradient(
      90deg,
      transparent 0%,
      #000 7%,
      #000 93%,
      transparent 100%
    );
  }

  &__marquee-row.is-center-row &__marquee-viewport {
    $edge-fade: linear-gradient(
      90deg,
      transparent 0%,
      #000 7%,
      #000 93%,
      transparent 100%
    );
    $horizontal-button-fade: linear-gradient(
      90deg,
      transparent 0%,
      #000 4%,
      #000 calc(50% - var(--nav-trigger-half) - var(--nav-fade-range)),
      rgb(0 0 0 / 82%) calc(50% - var(--nav-trigger-half) - 108px),
      rgb(0 0 0 / 58%) calc(50% - var(--nav-trigger-half) - 72px),
      rgb(0 0 0 / 32%) calc(50% - var(--nav-trigger-half) - 36px),
      transparent calc(50% - var(--nav-trigger-half)),
      transparent calc(50% + var(--nav-trigger-half)),
      rgb(0 0 0 / 32%) calc(50% + var(--nav-trigger-half) + 36px),
      rgb(0 0 0 / 58%) calc(50% + var(--nav-trigger-half) + 72px),
      rgb(0 0 0 / 82%) calc(50% + var(--nav-trigger-half) + 108px),
      #000 calc(50% + var(--nav-trigger-half) + var(--nav-fade-range)),
      #000 96%,
      transparent 100%
    );

    -webkit-mask-image: $edge-fade, $horizontal-button-fade;
    -webkit-mask-composite: source-in;
    mask-image: $edge-fade, $horizontal-button-fade;
    mask-composite: intersect;
  }

  &__marquee-track {
    display: flex;
    width: max-content;
    animation: nav-marquee-ltr var(--marquee-duration, 48s) linear infinite;

    &.is-paused {
      animation-play-state: paused;
    }
  }

  &__marquee-set {
    display: flex;
    flex-shrink: 0;
    gap: var(--nav-card-gap);
    padding-inline: 6px;
  }

  &__marquee-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: var(--nav-card-size);
    height: var(--nav-card-size);
    padding: 8px 6px 6px;
    border-radius: 12px;
    border: 1.5px solid color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 42%, var(--sakura-color-divider, rgb(0 0 0 / 12%)));
    background: color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 7%, var(--sakura-card-bg));
    box-shadow: 0 4px 14px color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 10%, transparent);
    box-sizing: border-box;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;

    &:hover {
      transform: translateY(calc(var(--nav-card-hover-lift) * -1));
      border-color: color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 65%, transparent);
      box-shadow: 0 8px 18px color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 18%, transparent);
    }
  }

  &__marquee-avatar {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    object-fit: cover;
    border: 2px solid color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 45%, transparent);
  }

  &__marquee-name {
    max-width: 100%;
    font-size: 0.68rem;
    line-height: 1.2;
    font-weight: 600;
    color: var(--sakura-color-text-deep, inherit);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__trigger {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: var(--nav-trigger-width);
    height: var(--nav-card-size);
    padding: 8px 10px 6px;
    border: 1.5px solid color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 42%, var(--sakura-color-divider, rgb(0 0 0 / 12%)));
    border-radius: 12px;
    background: color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 7%, var(--sakura-card-bg, #fff));
    color: var(--sakura-color-text-deep, inherit);
    cursor: pointer;
    box-shadow: 0 4px 14px color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 10%, transparent);
    box-sizing: border-box;
    transition: box-shadow 0.16s ease, border-color 0.16s ease, opacity 0.16s ease, filter 0.16s ease;
    transform: translate(-50%, -50%);

    &:hover:not(:disabled) {
      border-color: color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 65%, transparent);
      box-shadow: 0 8px 18px color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 18%, transparent);
    }

    &:active:not(:disabled) {
      opacity: 0.88;
      filter: brightness(0.96);
    }

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    &--standalone {
      position: relative;
      left: auto;
      top: auto;
      transform: none;
      width: auto;
      min-width: 220px;
      height: auto;
      margin: 0 auto;
      padding: 20px 28px 16px;
      gap: 10px;

      &:hover:not(:disabled) {
        border-color: color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 65%, transparent);
        box-shadow: 0 8px 18px color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 18%, transparent);
      }

      &:active:not(:disabled) {
        opacity: 0.88;
        filter: brightness(0.96);
      }

      .nav-random-draw__marquee-name {
        font-size: 0.92rem;
      }
    }
  }

  &__hint {
    font-size: 0.82rem;
    color: var(--sakura-color-text-muted, #888);
  }

  &__overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 72%);
    backdrop-filter: blur(4px);
    animation: nav-overlay-in 0.35s ease;

    &.is-silhouette {
      background: rgb(0 0 0 / 88%);
      backdrop-filter: blur(8px);
    }
  }

  &__silhouette-stage {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 280px;
  }

  &__silhouette-burst {
    position: absolute;
    width: min(520px, 92vw);
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--sakura-color-primary) 55%, transparent) 0%,
      color-mix(in srgb, var(--sakura-color-primary) 18%, transparent) 38%,
      transparent 72%
    );
    opacity: 0;
    transform: scale(0.35);
    filter: blur(8px);
    pointer-events: none;
    animation: nav-silhouette-burst 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  &__silhouette-particles {
    position: absolute;
    inset: 0;
    pointer-events: none;

    span {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--sakura-color-primary) 85%, #fff);
      box-shadow: 0 0 10px color-mix(in srgb, var(--sakura-color-primary) 70%, transparent);
      opacity: 0;
      transform: translate(-50%, -50%) rotate(calc(var(--i) * 25.7deg)) translateY(0);
      animation: nav-silhouette-spark 1.1s ease-out calc(var(--i) * 0.03s) forwards;
    }
  }

  &__video-stage {
    position: fixed;
    inset: auto;
    z-index: 10000;
    width: 0;
    height: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    background: #000;

    &.is-active {
      inset: 0;
      width: 100%;
      height: 100%;
      min-height: 100dvh;
      opacity: 1;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  &__video {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    object-fit: cover;
    pointer-events: none;
    background: #000;

    &::-webkit-media-controls,
    &::-webkit-media-controls-enclosure,
    &::-webkit-media-controls-panel,
    &::-webkit-media-controls-play-button,
    &::-webkit-media-controls-start-playback-button,
    &::-webkit-media-controls-timeline,
    &::-webkit-media-controls-current-time-display,
    &::-webkit-media-controls-time-remaining-display,
    &::-webkit-media-controls-mute-button,
    &::-webkit-media-controls-volume-slider,
    &::-webkit-media-controls-fullscreen-button {
      display: none !important;
      appearance: none;
    }
  }

  &__video-skip {
    position: absolute;
    inset: 0;
    z-index: 1;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  &__silhouette {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  &__draw-card {
    --draw-card-width: min(360px, 82vw);

    position: relative;
    z-index: 2;
    width: var(--draw-card-width);
    aspect-ratio: 16 / 10;
    border-radius: 14px;
    overflow: visible;

    &.is-entering {
      animation: nav-silhouette-drop 0.88s cubic-bezier(0.22, 0.95, 0.28, 1) forwards;
    }
  }

  &__draw-card-inner {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    overflow: hidden;
    background: linear-gradient(
      145deg,
      rgb(12 12 12 / 98%),
      rgb(38 38 38 / 92%)
    );
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--sakura-color-primary) 55%, rgb(255 255 255 / 20%)),
      0 0 28px color-mix(in srgb, var(--sakura-color-primary) 42%, transparent),
      0 0 56px color-mix(in srgb, var(--sakura-color-primary) 22%, transparent),
      0 22px 48px rgb(0 0 0 / 55%);
    transition: background-color 0.45s ease, box-shadow 0.45s ease;

    .is-revealed & {
      background: var(--sakura-card-bg, #fff);
      box-shadow:
        0 0 0 2px color-mix(in srgb, var(--sakura-color-primary) 35%, transparent),
        0 0 32px color-mix(in srgb, var(--sakura-color-primary) 28%, transparent),
        0 20px 50px rgb(0 0 0 / 35%);
      animation: nav-draw-inner-unveil 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
  }

  &__draw-card.is-entering:not(.is-revealed) &__draw-card-inner {
    animation: nav-silhouette-card-glow 2.2s ease-in-out infinite;
  }

  &__draw-media {
    position: absolute;
    inset: 0;
    overflow: hidden;
    transition: opacity 0.42s ease;

    .is-revealed & {
      opacity: 0;
      pointer-events: none;
    }
  }

  &__draw-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0) contrast(1.15) saturate(0);
    transform: scale(1.08);
    opacity: 0.92;
    transition: filter 0.5s ease, opacity 0.35s ease, transform 0.5s ease;

    .is-revealed & {
      filter: none;
      opacity: 0;
      transform: scale(1);
    }
  }

  &__draw-body {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    opacity: 0;
    overflow: hidden;
    padding: 14px 18px 12px;
    text-align: center;
    pointer-events: none;
    transition: opacity 0.42s ease;

    .is-revealed & {
      opacity: 1;
      pointer-events: auto;
    }
  }

  &__draw-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid var(--sakura-color-primary);
    opacity: 0;
    transform: scale(0.82);
    transition: opacity 0.4s ease 0.08s, transform 0.4s ease 0.08s;

    .is-revealed & {
      opacity: 1;
      transform: scale(1);
    }
  }

  &__draw-name {
    margin: 4px 0 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--sakura-color-text-deep, inherit);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.4s ease 0.12s, transform 0.4s ease 0.12s;

    .is-revealed & {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &__draw-desc {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    color: var(--sakura-color-text);
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.4s ease 0.16s, transform 0.4s ease 0.16s;

    .is-revealed & {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &__draw-url {
    margin: 0;
    font-size: 0.68rem;
    color: var(--sakura-color-text-muted, #888);
    word-break: break-all;
    opacity: 0;
    transition: opacity 0.4s ease 0.2s;

    .is-revealed & {
      opacity: 1;
    }
  }

  &__draw-card.is-revealed &__actions {
    opacity: 1;
    transform: translateY(0);
  }

  &__draw-card &__actions {
    display: flex;
    gap: 8px;
    justify-content: center;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.4s ease 0.18s, transform 0.4s ease 0.18s;
    margin-top: 4px;
  }

  &__silhouette-ring {
    position: absolute;
    inset: -10px;
    border-radius: 18px;
    border: 2px solid transparent;
    pointer-events: none;

    &--outer {
      border-color: color-mix(in srgb, var(--sakura-color-primary) 35%, transparent);
      animation: nav-silhouette-ring-spin 4.5s linear infinite;
    }

    &--inner {
      inset: -4px;
      border-color: color-mix(in srgb, var(--sakura-color-primary) 55%, transparent);
      animation: nav-silhouette-ring-spin 3s linear infinite reverse;
    }
  }

  &__silhouette-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0) contrast(1.15) saturate(0);
    transform: scale(1.08);
    opacity: 0.92;
  }

  &__silhouette-shine {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      115deg,
      transparent 30%,
      rgb(255 255 255 / 18%) 48%,
      transparent 66%
    );
    transform: translateX(-120%);
    animation: nav-silhouette-shine 2.8s ease-in-out infinite;
  }

  &__video-cache {
    position: fixed;
    width: 0;
    height: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;

    video {
      width: 0;
      height: 0;
    }
  }

  &__actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 22px;
  }

  &__btn {
    min-width: 112px;
    padding: 10px 18px;
    border-radius: 999px;
    font-size: 0.92rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.15s ease;

    &:active {
      transform: scale(0.97);
    }

    &--primary {
      border: none;
      background: var(--sakura-color-primary);
      color: #fff;
    }

    &--ghost {
      border: 1px solid var(--sakura-color-divider, rgb(0 0 0 / 15%));
      background: transparent;
      color: var(--sakura-color-text);
    }
  }

  &__draw-card &__btn {
    min-width: 88px;
    padding: 7px 12px;
    font-size: 0.78rem;
  }
}

@keyframes nav-marquee-ltr {
  from {
    transform: translateX(-50%);
  }

  to {
    transform: translateX(0);
  }
}

@keyframes nav-overlay-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes nav-silhouette-drop {
  0% {
    opacity: 0.28;
    transform: scale(4.2) translateY(-56vh);
    filter: blur(4px);
  }

  55% {
    opacity: 1;
    transform: scale(1.06) translateY(0);
    filter: blur(0);
  }

  72% {
    transform: scale(0.95) translateY(0);
  }

  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0);
  }
}

@keyframes nav-silhouette-burst {
  0% {
    opacity: 0;
    transform: scale(0.35);
  }

  35% {
    opacity: 1;
    transform: scale(1.15);
  }

  100% {
    opacity: 0.55;
    transform: scale(1.45);
  }
}

@keyframes nav-silhouette-card-glow {
  0%,
  100% {
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--sakura-color-primary) 45%, rgb(255 255 255 / 18%)),
      0 0 24px color-mix(in srgb, var(--sakura-color-primary) 38%, transparent),
      0 0 48px color-mix(in srgb, var(--sakura-color-primary) 18%, transparent),
      0 22px 48px rgb(0 0 0 / 55%);
  }

  50% {
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--sakura-color-primary) 72%, rgb(255 255 255 / 28%)),
      0 0 36px color-mix(in srgb, var(--sakura-color-primary) 58%, transparent),
      0 0 72px color-mix(in srgb, var(--sakura-color-primary) 32%, transparent),
      0 26px 56px rgb(0 0 0 / 62%);
  }
}

@keyframes nav-silhouette-ring-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes nav-silhouette-shine {
  0%,
  72% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(120%);
  }
}

@keyframes nav-silhouette-spark {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(calc(var(--i) * 25.7deg)) translateY(0) scale(0.4);
  }

  18% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(calc(var(--i) * 25.7deg)) translateY(calc(-80px - var(--i) * 3px)) scale(0.2);
  }
}

@keyframes nav-draw-inner-unveil {
  0% {
    filter: brightness(0.72);
  }

  40% {
    filter: brightness(1.18);
  }

  100% {
    filter: brightness(1);
  }
}
</style>

<style lang="scss">
html.nav-random-draw-open {
  overflow: hidden;
}
</style>
