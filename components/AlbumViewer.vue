<script lang="ts" setup>
import type { AlbumDetailFrontmatter, AlbumPhoto } from '~/types/album'
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { isAlbumVideo, resolveAlbumMediaType } from '../utils/albumMedia'
import { toAlbumAccessParams } from '../utils/albumAuth'
import { openAlbumMediaGallery } from '../utils/albumMediaGallery'
import { groupPhotosByMonth } from '../utils/albumPhotos'
import { fetchWebDavPhotos } from '../utils/webdavAlbum'
import { useAlbumDetailMeta } from '../utils/useAlbumDetailMeta'
import AlbumMediaLightbox from './AlbumMediaLightbox.vue'
import AlbumPasswordGate from './AlbumPasswordGate.vue'
import AlbumVideoThumb from './AlbumVideoThumb.vue'

const props = defineProps<{
  album?: AlbumDetailFrontmatter
}>()

const route = useRoute()

const slug = computed(() => {
  const path = route.path.replace(/\/$/, '')
  const parts = path.split('/')
  return parts[parts.length - 1] || ''
})

const unlocked = ref(false)
const accessPassword = ref('')
const unlockedPhotos = ref<AlbumPhoto[]>([])
const loading = ref(false)
const loadError = ref('')
const remotePhotos = ref<AlbumPhoto[]>([])

const source = computed(() => props.album?.source || 'local')
const isEncrypted = computed(() => !!props.album?.encrypted)
const canView = computed(() => !isEncrypted.value || unlocked.value)

const photos = computed(() => {
  if (source.value === 'webdav')
    return remotePhotos.value
  if (isEncrypted.value && unlocked.value)
    return unlockedPhotos.value
  return props.album?.photos || []
})

const groupedPhotos = computed(() => groupPhotosByMonth(photos.value))
const photoCount = computed(() => photos.value.length)
const { updatePhotoCount, resetPhotoCount } = useAlbumDetailMeta()

watch([photoCount, loading, loadError, canView], () => {
  const visible = canView.value && !loading.value && !loadError.value && photoCount.value > 0
  updatePhotoCount(photoCount.value, visible)
}, { immediate: true })

async function loadWebDavPhotos() {
  if (source.value !== 'webdav' || !canView.value)
    return

  if (!slug.value) {
    loadError.value = '未找到相册标识'
    loading.value = false
    return
  }

  if (!props.album?.webdav?.url) {
    loadError.value = '未配置 WebDAV 地址，请在相册 index.md 中设置 webdav.url'
    loading.value = false
    return
  }

  loading.value = true
  loadError.value = ''

  try {
    remotePhotos.value = await fetchWebDavPhotos(
      slug.value,
      toAlbumAccessParams(props.album, accessPassword.value || undefined),
    )
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : 'WebDAV 相册加载失败'
    remotePhotos.value = []
  }
  finally {
    loading.value = false
  }
}

function openMedia(index: number) {
  const items = photos.value.map(photo => ({
    src: photo.url,
    alt: '',
    type: resolveAlbumMediaType(photo),
    poster: photo.poster,
  }))
  openAlbumMediaGallery(items, index)
}

function flatIndex(groupIndex: number, photoIndex: number) {
  let index = 0
  for (let i = 0; i < groupIndex; i++)
    index += groupedPhotos.value[i]?.photos.length || 0
  return index + photoIndex
}

function onUnlocked(payload: { password: string, photos: AlbumPhoto[] }) {
  unlocked.value = true
  accessPassword.value = payload.password
  unlockedPhotos.value = payload.photos
  loadWebDavPhotos()
}

onMounted(() => {
  if (typeof sessionStorage !== 'undefined') {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('album-unlock:'))
        sessionStorage.removeItem(key)
    }
  }

  if (canView.value)
    loadWebDavPhotos()
})

watch(canView, (value) => {
  if (value)
    loadWebDavPhotos()
})

watch(slug, () => {
  resetPhotoCount()
  unlocked.value = false
  accessPassword.value = ''
  unlockedPhotos.value = []
  remotePhotos.value = []
  loadError.value = ''
})

onBeforeRouteLeave(() => {
  resetPhotoCount()
  unlocked.value = false
  accessPassword.value = ''
  unlockedPhotos.value = []
  remotePhotos.value = []
})
</script>

<template>
  <div class="album-viewer">
    <AlbumPasswordGate
      v-if="isEncrypted && !canView"
      :slug="slug"
      :title="album?.title"
      @unlocked="onUnlocked"
    />

    <template v-else>
      <div
        v-if="loading"
        class="album-viewer__status"
      >
        正在从 WebDAV 加载照片和视频…
      </div>

      <div
        v-else-if="loadError"
        class="album-viewer__status album-viewer__status--error"
      >
        {{ loadError }}
        <small>WebDAV 地址与账号在相册 index.md 中配置；密码需设置环境变量 <code>WEBDAV_PASSWORD</code>（所有 WebDAV 相册共用）。本地开发请创建 <code>.env.local</code> 并重启 <code>pnpm dev</code>；线上请在 Netlify / Vercel / Cloudflare Pages 后台设置该变量并重新部署。</small>
      </div>

      <div
        v-else-if="!groupedPhotos.length"
        class="album-viewer__status"
      >
        此相册暂无照片或视频。
      </div>

      <section
        v-for="(group, groupIndex) in groupedPhotos"
        :key="group.key"
        class="album-viewer__group"
      >
        <h3 class="album-viewer__month">
          {{ group.label }}
        </h3>

        <div class="album-viewer__grid">
          <button
            v-for="(photo, photoIndex) in group.photos"
            :key="`${photo.url}-${photoIndex}`"
            type="button"
            class="album-viewer__photo"
            :class="{ 'is-video': isAlbumVideo(photo) }"
            @click="openMedia(flatIndex(groupIndex, photoIndex))"
          >
            <AlbumVideoThumb
              v-if="isAlbumVideo(photo)"
              :src="photo.url"
              :poster="photo.poster"
              :alt="'相册视频'"
            />
            <img
              v-else
              :src="photo.url"
              :alt="'相册照片'"
              loading="lazy"
            >
            <span
              v-if="isAlbumVideo(photo)"
              class="album-viewer__play"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        </div>
      </section>
    </template>

    <AlbumMediaLightbox />
  </div>
</template>

<style lang="scss" scoped>
.album-viewer {
  width: 100%;

  &__status {
    padding: 32px 16px;
    text-align: center;
    color: var(--sakura-color-text-muted, #888);

    small {
      display: block;
      margin-top: 8px;
      font-size: 0.82rem;
    }

    &--error {
      color: #dc2626;
    }
  }

  &__group + &__group {
    margin-top: 32px;
  }

  &__month {
    margin: 0 0 16px;
    padding-left: 12px;
    border-left: 3px solid var(--sakura-color-primary);
    font-size: 1rem;
    font-weight: 700;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 14px;
  }

  &__photo {
    position: relative;
    padding: 0;
    border: none;
    border-radius: 12px;
    overflow: hidden;
    background: var(--sakura-card-bg);
    cursor: zoom-in;
    aspect-ratio: 1;
    box-shadow: 0 4px 14px rgb(0 0 0 / 8%);
    transition: box-shadow 0.16s ease, transform 0.16s ease;

    img,
    :deep(.album-video-thumb__img),
    :deep(.album-video-thumb__video) {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
    }

    &.is-video {
      cursor: pointer;
    }

    &:hover {
      box-shadow: 0 10px 22px rgb(0 0 0 / 14%);
    }
  }

  &__play {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 22%);
    pointer-events: none;

    svg {
      width: 42px;
      height: 42px;
      fill: rgb(255 255 255 / 92%);
      filter: drop-shadow(0 2px 8px rgb(0 0 0 / 35%));
    }
  }

  @media (max-width: 768px) {
    &__group + &__group {
      margin-top: 24px;
    }

    &__month {
      margin-bottom: 12px;
      padding-left: 10px;
      font-size: 0.88rem;
    }

    &__grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    &__photo {
      border-radius: 8px;
      box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
    }

    &__play svg {
      width: 28px;
      height: 28px;
    }
  }

}
</style>
