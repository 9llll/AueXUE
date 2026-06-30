import type { HtmlFileDetail, HtmlFileSummary } from '../types/htmlFile'

export async function fetchHtmlFiles() {
  const response = await fetch('/api/html-files', {
    cache: 'no-store',
  })

  const text = await response.text()
  let data: { files?: HtmlFileSummary[], message?: string } = {}
  if (text) {
    try {
      data = JSON.parse(text)
    }
    catch {
      data = { message: text }
    }
  }

  if (!response.ok)
    throw new Error(data.message || `请求失败 (${response.status})`)

  return data.files || []
}

export async function fetchHtmlFile(slug: string) {
  const response = await fetch(`/api/html-files/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  })

  const text = await response.text()
  let data: HtmlFileDetail & { message?: string } = {} as HtmlFileDetail
  if (text) {
    try {
      data = JSON.parse(text)
    }
    catch {
      data = { message: text } as HtmlFileDetail & { message?: string }
    }
  }

  if (!response.ok)
    throw new Error(data.message || `请求失败 (${response.status})`)

  return data
}
