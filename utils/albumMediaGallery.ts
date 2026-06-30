import type { AlbumMediaType } from '~/types/album'
import { ref, shallowRef } from 'vue'

export interface AlbumMediaItem {
  src: string
  alt: string
  type: AlbumMediaType
  poster?: string
}

export const albumMediaVisible = ref(false)
export const albumMediaItems = shallowRef<AlbumMediaItem[]>([])
export const albumMediaIndex = ref(0)

export function openAlbumMediaGallery(items: AlbumMediaItem[], index: number) {
  if (!items.length)
    return

  albumMediaItems.value = items
  albumMediaIndex.value = Math.min(Math.max(index, 0), items.length - 1)
  albumMediaVisible.value = true
  document.body.style.overflow = 'hidden'
}

export function closeAlbumMediaGallery() {
  albumMediaVisible.value = false
  document.body.style.overflow = ''
}

export function prevAlbumMedia() {
  if (albumMediaIndex.value > 0)
    albumMediaIndex.value -= 1
}

export function nextAlbumMedia() {
  if (albumMediaIndex.value < albumMediaItems.value.length - 1)
    albumMediaIndex.value += 1
}

export function goToAlbumMedia(index: number) {
  if (index < 0 || index >= albumMediaItems.value.length)
    return

  albumMediaIndex.value = index
}
