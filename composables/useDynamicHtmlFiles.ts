import { ref } from 'vue'
import type { HtmlFileSummary } from '../types/htmlFile'
import { fetchHtmlFiles } from '../utils/htmlFilesApi'

const htmlFiles = ref<HtmlFileSummary[]>([])
const filesLoading = ref(false)
const filesLoaded = ref(false)
let filesInflight: Promise<HtmlFileSummary[]> | null = null

export function useDynamicHtmlFiles() {
  async function loadHtmlFiles(force = false) {
    if (filesLoaded.value && !force)
      return htmlFiles.value

    if (filesInflight && !force)
      return filesInflight

    filesLoading.value = true
    filesInflight = fetchHtmlFiles()
      .then((data) => {
        htmlFiles.value = data
        filesLoaded.value = true
        return data
      })
      .catch(() => {
        htmlFiles.value = []
        filesLoaded.value = true
        return []
      })
      .finally(() => {
        filesLoading.value = false
        filesInflight = null
      })

    return filesInflight
  }

  return {
    htmlFiles,
    filesLoading,
    filesLoaded,
    loadHtmlFiles,
  }
}
