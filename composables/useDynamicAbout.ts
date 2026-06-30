import { ref } from 'vue'
import type { AboutDetail } from '../types/about'
import { fetchAbout } from '../utils/aboutApi'

const aboutData = ref<AboutDetail | null>(null)
const loading = ref(false)
const loaded = ref(false)
let inflight: Promise<AboutDetail | null> | null = null

export function useDynamicAbout() {
  async function loadAbout(force = false) {
    if (loaded.value && !force)
      return aboutData.value

    if (inflight && !force)
      return inflight

    loading.value = true
    inflight = fetchAbout()
      .then((data) => {
        aboutData.value = data
        loaded.value = true
        return data
      })
      .catch(() => {
        aboutData.value = null
        loaded.value = true
        return null
      })
      .finally(() => {
        loading.value = false
        inflight = null
      })

    return inflight
  }

  return {
    aboutData,
    loading,
    loaded,
    loadAbout,
  }
}
