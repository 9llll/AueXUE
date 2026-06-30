export interface LightboxSwipeHandlers {
  onTouchStart: (event: TouchEvent) => void
  onTouchEnd: (event: TouchEvent) => void
  onTouchCancel: () => void
}

export function createLightboxSwipeHandlers(options: {
  enabled: () => boolean
  onPrev: () => void
  onNext: () => void
  shouldIgnore?: () => boolean
  threshold?: number
}): LightboxSwipeHandlers {
  const threshold = options.threshold ?? 48

  let touchStartX = 0
  let touchStartY = 0
  let tracking = false

  function reset() {
    tracking = false
  }

  function onTouchStart(event: TouchEvent) {
    if (!options.enabled() || options.shouldIgnore?.())
      return

    if (event.touches.length !== 1)
      return

    touchStartX = event.touches[0].clientX
    touchStartY = event.touches[0].clientY
    tracking = true
  }

  function onTouchEnd(event: TouchEvent) {
    if (!tracking)
      return

    tracking = false

    if (!options.enabled() || options.shouldIgnore?.())
      return

    const touch = event.changedTouches[0]
    if (!touch)
      return

    const deltaX = touch.clientX - touchStartX
    const deltaY = touch.clientY - touchStartY

    if (Math.abs(deltaX) < threshold)
      return

    if (Math.abs(deltaY) > Math.abs(deltaX))
      return

    if (deltaX > 0)
      options.onPrev()
    else
      options.onNext()
  }

  return {
    onTouchStart,
    onTouchEnd,
    onTouchCancel: reset,
  }
}
