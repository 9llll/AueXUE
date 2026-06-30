import { ref } from 'vue'
import type { NoticeBoardDetail } from '../types/notice'
import { fetchNotice } from '../utils/noticeApi'

const noticeData = ref<NoticeBoardDetail | null>(null)
const loading = ref(false)
const loaded = ref(false)
let inflight: Promise<NoticeBoardDetail | null> | null = null

export function useDynamicNotice() {
  async function loadNotice(force = false) {
    if (loaded.value && !force)
      return noticeData.value

    if (inflight && !force)
      return inflight

    loading.value = true
    inflight = fetchNotice()
      .then((data) => {
        noticeData.value = data
        loaded.value = true
        return data
      })
      .catch(() => {
        noticeData.value = null
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
    noticeData,
    loading,
    loaded,
    loadNotice,
  }
}
