import { ref } from 'vue'

const photoCount = ref(0)
const showPhotoCount = ref(false)

export function useAlbumDetailMeta() {
  function updatePhotoCount(count: number, visible: boolean) {
    photoCount.value = count
    showPhotoCount.value = visible
  }

  function resetPhotoCount() {
    photoCount.value = 0
    showPhotoCount.value = false
  }

  return {
    photoCount,
    showPhotoCount,
    updatePhotoCount,
    resetPhotoCount,
  }
}
