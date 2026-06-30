import type { NoticeLineInput } from '../types/notice'

export interface ResolvedNoticeLine {
  text: string
  url?: string
  external?: boolean
}

export function guessNoticeUrl(text: string): string | undefined {
  const value = text.trim()
  if (!value)
    return undefined
  if (/^https?:\/\//i.test(value))
    return value
  if (value.startsWith('/'))
    return value
  if (/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(value))
    return `https://${value}`
  return undefined
}

export function resolveNoticeLine(line: NoticeLineInput): ResolvedNoticeLine {
  if (typeof line === 'object') {
    const url = line.url || guessNoticeUrl(line.text)
    return {
      text: line.text,
      url,
      external: url ? /^https?:\/\//i.test(url) : false,
    }
  }

  const url = guessNoticeUrl(line)
  return {
    text: line,
    url,
    external: url ? /^https?:\/\//i.test(url) : false,
  }
}

export function resolveNoticeSections(sections: Array<{ label: string, lines: NoticeLineInput[] }> | undefined) {
  if (!sections?.length)
    return []

  return sections.map(section => ({
    label: section.label,
    lines: section.lines.map(line => resolveNoticeLine(line)),
  }))
}
