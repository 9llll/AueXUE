import { ref } from 'vue'
import type { GalleryAlbumDetail, GalleryHubDetail } from '../types/gallery'
import { fetchGalleryAlbum, fetchGalleryHub } from '../utils/galleryApi'

const galleryHub = ref<GalleryHubDetail | null>(null)
const galleryAlbums = ref<Record<string, GalleryAlbumDetail | null>>({})
const hubLoading = ref(false)
const hubLoaded = ref(false)
let hubInflight: Promise<GalleryHubDetail | null> | null = null

export function useDynamicGallery() {
  async function loadGalleryHub(force = false) {
    if (hubLoaded.value && !force)
      return galleryHub.value

    if (hubInflight && !force)
      return hubInflight

    hubLoading.value = true
    hubInflight = fetchGalleryHub()
      .then((data) => {
        galleryHub.value = data
        hubLoaded.value = true
        return data
      })
      .catch(() => {
        galleryHub.value = null
        hubLoaded.value = true
        return null
      })
      .finally(() => {
        hubLoading.value = false
        hubInflight = null
      })

    return hubInflight
  }

  async function loadGalleryAlbum(slug: string, force = false) {
    if (!slug)
      return null

    if (galleryAlbums.value[slug] && !force)
      return galleryAlbums.value[slug]

    try {
      const data = await fetchGalleryAlbum(slug)
      galleryAlbums.value[slug] = data
      return data
    }
    catch {
      galleryAlbums.value[slug] = null
      return null
    }
  }

  function clearGalleryAlbum(slug: string) {
    delete galleryAlbums.value[slug]
  }

  return {
    galleryHub,
    galleryAlbums,
    hubLoading,
    hubLoaded,
    loadGalleryHub,
    loadGalleryAlbum,
    clearGalleryAlbum,
  }
}
