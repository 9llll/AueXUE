import type { AlbumDetailFrontmatter, AlbumSummary } from '~/types/album'
import { usePageList } from 'valaxy'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

type GalleryHubAlbumRef = string | { slug: string }

function normalizeSlugs(albums?: GalleryHubAlbumRef[]) {
  if (!Array.isArray(albums))
    return []

  return albums
    .map((item) => {
      if (typeof item === 'string')
        return item
      return item?.slug || ''
    })
    .filter(Boolean)
}

function isAlbumDetailPath(path?: string) {
  if (!path)
    return false
  const normalized = path.replace(/\/$/, '')
  return /^\/gallery\/[^/]+$/.test(normalized) && normalized !== '/gallery'
}

function slugFromPath(path?: string) {
  if (!path)
    return ''
  return path.replace(/\/$/, '').split('/').pop() || ''
}

function toSummary(path: string, fm: AlbumDetailFrontmatter): AlbumSummary {
  const slug = slugFromPath(path)
  const photos = Array.isArray(fm.photos) ? fm.photos : []
  const isWebDav = fm.source === 'webdav'
  const count = isWebDav ? undefined : (photos.length || undefined)

  return {
    slug,
    title: fm.title || slug,
    date: fm.date || '',
    cover: fm.cover,
    desc: fm.desc,
    count,
    location: fm.location,
    tags: Array.isArray(fm.tags) ? fm.tags : undefined,
    encrypted: !!fm.encrypted,
    source: fm.source,
  }
}

export function useAlbumSummaries(albumsRef: MaybeRefOrGetter<GalleryHubAlbumRef[] | undefined>) {
  const pages = usePageList()

  return computed(() => {
    const listedSlugs = normalizeSlugs(toValue(albumsRef))
    const all = pages.value
      .filter(page => isAlbumDetailPath(page.path))
      .map(page => toSummary(page.path!, page as AlbumDetailFrontmatter))

    const filtered = listedSlugs.length
      ? listedSlugs
          .map(slug => all.find(item => item.slug === slug))
          .filter((item): item is AlbumSummary => !!item)
      : all

    return filtered.sort((a, b) => {
      const ta = Date.parse(a.date || '') || 0
      const tb = Date.parse(b.date || '') || 0
      return tb - ta
    })
  })
}
