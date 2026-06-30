<script lang="ts" setup>
import type { AlbumSummary } from '~/types/album'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = withDefaults(defineProps<{
  albums?: AlbumSummary[]
  admin?: boolean
  basePath?: string
}>(), {
  basePath: '/gallery',
})

const emit = defineEmits<{
  editAlbum: [slug: string]
  createAlbum: []
}>()

const router = useRouter()

const sortedAlbums = computed(() => {
  if (!Array.isArray(props.albums))
    return []

  return [...props.albums].sort((a, b) => {
    const ta = Date.parse(a.date || '') || 0
    const tb = Date.parse(b.date || '') || 0
    return tb - ta
  })
})

function albumLink(slug: string) {
  return `${props.basePath.replace(/\/$/, '')}/${slug}`
}

function countLabel(count?: number) {
  if (!count || count <= 0)
    return ''
  return `${count} 张照片`
}

function openAlbum(slug: string) {
  void router.push(albumLink(slug))
}

function onEditClick(event: Event, slug: string) {
  event.preventDefault()
  event.stopPropagation()
  emit('editAlbum', slug)
}
</script>

<template>
  <div class="album-grid">
    <p
      v-if="!sortedAlbums.length && !admin"
      class="album-grid__empty"
    >
      暂无相册。
    </p>

    <p
      v-else-if="!sortedAlbums.length && admin"
      class="album-grid__empty"
    >
      暂无相册，点击「新建相册」开始创建。
    </p>

    <ul
      v-if="sortedAlbums.length || admin"
      class="album-grid__list"
    >
      <li
        v-for="album in sortedAlbums"
        :key="album.slug"
        class="album-grid__item"
      >
        <component
          :is="admin ? 'button' : 'RouterLink'"
          class="album-grid__card"
          :class="{ 'album-grid__card--admin': admin }"
          :to="admin ? undefined : albumLink(album.slug)"
          type="button"
          @click="admin ? openAlbum(album.slug) : undefined"
        >
          <img
            v-if="album.cover"
            class="album-grid__cover"
            :src="album.cover"
            :alt="album.title"
            loading="lazy"
          >
          <div
            v-else
            class="album-grid__cover album-grid__cover--placeholder"
          >
            <span aria-hidden="true">📷</span>
          </div>

          <div class="album-grid__shade" aria-hidden="true" />

          <button
            v-if="admin"
            type="button"
            class="album-grid__edit"
            aria-label="编辑相册"
            @click="onEditClick($event, album.slug)"
          >
            ✎
          </button>

          <span
            v-if="album.source !== 'webdav' && countLabel(album.count)"
            class="album-grid__count"
          >
            {{ countLabel(album.count) }}
          </span>

          <span
            v-if="album.encrypted"
            class="album-grid__lock"
            title="加密相册"
          >
            🔒
          </span>

          <div class="album-grid__content">
            <h2 class="album-grid__title">
              {{ album.title }}
            </h2>

            <p
              v-if="album.desc"
              class="album-grid__desc"
            >
              {{ album.desc }}
            </p>

            <div
              v-if="album.location"
              class="album-grid__meta"
            >
              <span class="album-grid__location">
                <svg
                  class="album-grid__pin"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                {{ album.location }}
              </span>
            </div>

            <div
              v-if="album.tags?.length"
              class="album-grid__tags"
            >
              <span
                v-for="tag in album.tags"
                :key="`${album.slug}-${tag}`"
                class="album-grid__tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </component>
      </li>

      <li
        v-if="admin"
        class="album-grid__item album-grid__item--add"
      >
        <button
          type="button"
          class="album-grid__card album-grid__card--add"
          @click="emit('createAlbum')"
        >
          <span class="album-grid__add-icon">+</span>
          <span class="album-grid__add-label">新建相册</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.album-grid {
  width: 100%;

  &__empty {
    margin: 0;
    padding: 24px;
    text-align: center;
    color: var(--sakura-color-text-muted, #888);
    font-size: 0.92rem;
  }

  &__list {
    list-style: none;
    margin: 0 auto;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 200px));
    justify-content: center;
    gap: 16px;
    max-width: 920px;
  }

  &__item {
    min-width: 0;
  }

  &__card {
    position: relative;
    display: block;
    width: 100%;
    max-width: 200px;
    margin-inline: auto;
    aspect-ratio: 1 / 1;
    border-radius: 14px;
    overflow: hidden;
    text-decoration: none;
    color: #fff;
    background: #1a1a1a;
    box-shadow: 0 8px 24px rgb(0 0 0 / 28%);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: inherit;
    font: inherit;

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 14px 32px rgb(0 0 0 / 36%);
    }

    &--admin:focus-visible {
      outline: 2px solid var(--sakura-color-primary, #fe9500);
      outline-offset: 2px;
    }

    &--add {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(145deg, #2a2a2a, #121212);
      border: 2px dashed rgb(255 255 255 / 24%);
      box-shadow: none;

      &:hover {
        transform: none;
        border-color: var(--sakura-color-primary, #fe9500);
      }
    }
  }

  &__edit {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 3;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background: rgb(0 0 0 / 58%);
    color: #fff;
    font-size: 0.82rem;
    cursor: pointer;
    backdrop-filter: blur(4px);

    &:hover {
      background: rgb(0 0 0 / 78%);
    }
  }

  &__add-icon {
    font-size: 2rem;
    line-height: 1;
    color: rgb(255 255 255 / 88%);
  }

  &__add-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: rgb(255 255 255 / 82%);
  }

  &__cover {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, #2a2a2a, #121212);
      font-size: 2.4rem;
    }
  }

  &__shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgb(0 0 0 / 88%) 0%,
      rgb(0 0 0 / 52%) 38%,
      rgb(0 0 0 / 12%) 68%,
      transparent 100%
    );
    pointer-events: none;
  }

  &__count {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 2;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.4;
    color: #fff;
    background: rgb(0 0 0 / 58%);
    backdrop-filter: blur(4px);
  }

  &__lock {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 2;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgb(0 0 0 / 58%);
    font-size: 0.82rem;
    backdrop-filter: blur(4px);
  }

  &__content {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    z-index: 2;
    padding: 12px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__title {
    margin: 0;
    font-size: 0.96rem;
    font-weight: 700;
    line-height: 1.35;
    color: #fff;
    text-shadow: 0 1px 6px rgb(0 0 0 / 45%);
  }

  &__desc {
    margin: 0;
    font-size: 0.74rem;
    line-height: 1.45;
    color: rgb(255 255 255 / 92%);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    font-size: 0.68rem;
    color: rgb(255 255 255 / 82%);
  }

  &__location {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  &__pin {
    flex-shrink: 0;
    width: 13px;
    height: 13px;
    fill: none;
    stroke: currentcolor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
  }

  &__tag {
    padding: 2px 7px;
    border-radius: 5px;
    font-size: 0.66rem;
    line-height: 1.5;
    color: rgb(255 255 255 / 92%);
    background: rgb(255 255 255 / 18%);
    backdrop-filter: blur(2px);
  }

  @media (max-width: 768px) {
    &__list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      max-width: none;
    }

    &__card {
      max-width: none;
      width: 100%;
      border-radius: 10px;
      aspect-ratio: 1 / 1;
    }

    &__content {
      padding: 8px 7px 7px;
      gap: 2px;
    }

    &__title {
      font-size: 0.8rem;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__desc {
      font-size: 0.64rem;
      -webkit-line-clamp: 1;
    }

    &__meta {
      font-size: 0.58rem;
      gap: 4px;
    }

    &__location {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__pin {
      width: 10px;
      height: 10px;
    }

    &__tags {
      gap: 4px;
      margin-top: 0;
    }

    &__tag {
      padding: 1px 5px;
      font-size: 0.56rem;
    }

    &__count {
      top: 6px;
      right: 6px;
      padding: 2px 6px;
      font-size: 0.56rem;
    }

    &__lock {
      top: 6px;
      left: 6px;
      width: 24px;
      height: 24px;
      font-size: 0.72rem;
    }
  }
}
</style>
