import { lenisRef } from '../node_modules/valaxy-theme-sakura/plugins/lenis'

export function getHeadingScrollOffset(extra = 16) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--sakura-navbar-height')
    .trim()
  const navbar = Number.parseInt(raw, 10) || 56
  return navbar + extra
}

function normalizeHashId(raw: string) {
  return raw.startsWith('#') ? raw.slice(1) : raw
}

export function resolveHeadingElement(id: string): HTMLElement | null {
  const raw = normalizeHashId(id)
  if (!raw)
    return null

  const candidates = new Set<string>([raw])
  try {
    const decoded = decodeURIComponent(raw)
    candidates.add(decoded)
    candidates.add(encodeURIComponent(decoded))
  }
  catch {
    // ignore malformed URI sequences
  }

  for (const candidate of candidates) {
    const byId = document.getElementById(candidate)
    if (byId instanceof HTMLElement)
      return byId
  }

  for (const candidate of candidates) {
    const escaped = typeof CSS !== 'undefined' && CSS.escape
      ? CSS.escape(candidate)
      : candidate.replace(/"/g, '\\"')
    const found = document.querySelector(`.markdown-body [id="${escaped}"]`)
    if (found instanceof HTMLElement)
      return found
  }

  return null
}

export function scrollToHeadingById(id: string, behavior: ScrollBehavior = 'smooth') {
  const heading = resolveHeadingElement(id)
  if (!heading)
    return false

  scrollToHeadingElement(heading, behavior)
  return true
}

export function scrollToHeadingElement(heading: HTMLElement, behavior: ScrollBehavior = 'smooth') {
  const offset = -getHeadingScrollOffset()

  if (lenisRef.value) {
    lenisRef.value.scrollTo(heading, {
      offset,
      immediate: behavior === 'auto',
    })
    return
  }

  const top = heading.getBoundingClientRect().top + window.scrollY + offset
  window.scrollTo({ top, behavior })
}

export function updateLocationHash(id: string) {
  const raw = normalizeHashId(id)
  const hash = `#${raw}`
  if (window.location.hash === hash)
    return
  history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`)
}
