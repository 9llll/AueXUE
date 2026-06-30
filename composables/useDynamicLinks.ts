import { ref } from 'vue'
import type { LinksDetail } from '../types/links'
import { fetchLinks } from '../utils/linksApi'

const linksData = ref<LinksDetail | null>(null)
const loading = ref(false)
const loaded = ref(false)
let inflight: Promise<LinksDetail | null> | null = null

export function useDynamicLinks() {
  async function loadLinks(force = false) {
    if (loaded.value && !force)
      return linksData.value

    if (inflight && !force)
      return inflight

    loading.value = true
    inflight = fetchLinks()
      .then((data) => {
        linksData.value = data
        loaded.value = true
        return data
      })
      .catch(() => {
        linksData.value = null
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
    linksData,
    loading,
    loaded,
    loadLinks,
  }
}
