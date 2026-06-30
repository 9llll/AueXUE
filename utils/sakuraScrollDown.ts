interface ScrollPastHeroOptions {
  scrollAnimation?: boolean
}

function getNavbarOffset() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--sakura-navbar-height')
    .trim()
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : 65
}

export function scrollPastHero(options: ScrollPastHeroOptions = {}) {
  const hero = document.querySelector('.sakura-hero')
  if (!hero)
    return

  const smooth = options.scrollAnimation !== false
  const top = Math.max(0, hero.getBoundingClientRect().bottom + window.scrollY - getNavbarOffset())

  window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
}
