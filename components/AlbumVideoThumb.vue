<script lang="ts" setup>
import { ref, watch } from 'vue'

const props = defineProps<{
  src: string
  poster?: string
  alt?: string
}>()

const thumb = ref(props.poster || '')
const videoRef = ref<HTMLVideoElement | null>(null)
let capturing = false

function captureThumb() {
  const video = videoRef.value
  if (!video || thumb.value || capturing)
    return
  if (!video.videoWidth || !video.videoHeight)
    return

  capturing = true
  try {
    const canvas = document.createElement('canvas')
    const maxSide = 480
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    thumb.value = canvas.toDataURL('image/jpeg', 0.72)
  }
  catch {
    // 跨域或解码失败时保留视频占位
  }
  finally {
    capturing = false
  }
}

function seekPreviewFrame() {
  const video = videoRef.value
  if (!video || thumb.value || props.poster)
    return

  const duration = Number.isFinite(video.duration) ? video.duration : 0
  const target = duration > 0 ? Math.min(1, duration * 0.05) : 0.1
  if (video.currentTime === target) {
    captureThumb()
    return
  }
  video.currentTime = target
}

function onLoadedMetadata() {
  seekPreviewFrame()
}

function onLoadedData() {
  if (!thumb.value)
    captureThumb()
}

function onSeeked() {
  captureThumb()
}

watch(() => props.src, () => {
  thumb.value = props.poster || ''
})
</script>

<template>
  <img
    v-if="thumb"
    class="album-video-thumb__img"
    :src="thumb"
    :alt="alt || '视频缩略图'"
    loading="lazy"
  >
  <video
    v-else
    ref="videoRef"
    class="album-video-thumb__video"
    :src="src"
    muted
    playsinline
    preload="auto"
    disable-picture-in-picture
    @loadedmetadata="onLoadedMetadata"
    @loadeddata="onLoadedData"
    @seeked="onSeeked"
  />
</template>

<style lang="scss" scoped>
.album-video-thumb__img,
.album-video-thumb__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}

.album-video-thumb__video {
  background: #1a1a1a;
}
</style>
