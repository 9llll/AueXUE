import type { AlbumPhoto } from '~/types/album'

export function sortPhotosByDate(photos: AlbumPhoto[]) {
  return [...photos].sort((a, b) => {
    const ta = a.date ? Date.parse(a.date) : 0
    const tb = b.date ? Date.parse(b.date) : 0
    return tb - ta
  })
}

export function groupPhotosByMonth(photos: AlbumPhoto[]) {
  const sorted = sortPhotosByDate(photos)
  const groups: { key: string, label: string, photos: AlbumPhoto[] }[] = []
  const map = new Map<string, AlbumPhoto[]>()

  for (const photo of sorted) {
    const key = photo.date?.slice(0, 7) || 'unknown'
    if (!map.has(key))
      map.set(key, [])
    map.get(key)!.push(photo)
  }

  for (const [key, items] of map.entries()) {
    groups.push({
      key,
      label: formatMonthLabel(key),
      photos: items,
    })
  }

  return groups
}

function formatMonthLabel(key: string) {
  if (key === 'unknown')
    return '未标注日期'
  const [year, month] = key.split('-')
  if (!year || !month)
    return key
  return `${year} 年 ${Number(month)} 月`
}

export function formatAlbumDate(date?: string) {
  if (!date)
    return ''
  const parsed = Date.parse(date)
  if (Number.isNaN(parsed))
    return date
  const d = new Date(parsed)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
