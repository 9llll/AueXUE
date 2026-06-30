import { computed, ref, type Ref } from 'vue'

const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2
const DBLCLICK_TOUCH_GUARD_MS = 700
const DRAG_START_THRESHOLD = 6
const WHEEL_ZOOM_INTENSITY = 0.002

function getTouchDistance(touches: TouchList) {
  if (touches.length < 2)
    return 0

  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

function getTouchMidpoint(touches: TouchList) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  }
}

export function useLightboxZoom(imageRef: Ref<HTMLImageElement | null>) {
  const currentScale = ref(MIN_SCALE)
  const isDragging = ref(false)
  const isPinching = ref(false)
  const isWheelZooming = ref(false)
  const panOffset = ref({ x: 0, y: 0 })

  const isZoomed = computed(() => currentScale.value > MIN_SCALE + 0.01)

  let dragStartX = 0
  let dragStartY = 0
  let startPanX = 0
  let startPanY = 0
  let pendingDrag = false
  let activePointerId: number | null = null
  let dragCaptureTarget: HTMLElement | null = null

  let pinchStartDistance = 0
  let pinchStartScale = MIN_SCALE
  let pinchStartPan = { x: 0, y: 0 }
  let pinchStartFocal = { x: 0, y: 0 }
  let pinchLayoutCenter = { x: 0, y: 0 }
  let suppressDblClickUntil = 0
  let wheelZoomEndTimer: ReturnType<typeof setTimeout> | undefined

  function markTouchGesture() {
    suppressDblClickUntil = Date.now() + DBLCLICK_TOUCH_GUARD_MS
  }

  const imageTransformStyle = computed(() => {
    if (currentScale.value <= MIN_SCALE && panOffset.value.x === 0 && panOffset.value.y === 0)
      return {}

    const interacting = isDragging.value || isPinching.value || isWheelZooming.value

    return {
      transform: `translate(${panOffset.value.x}px, ${panOffset.value.y}px) scale(${currentScale.value})`,
      transformOrigin: 'center center',
      transition: interacting ? 'none' : 'transform 0.25s ease',
    }
  })

  function getLayoutCenter() {
    const img = imageRef.value
    if (!img)
      return null

    const rect = img.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0)
      return null

    return {
      x: rect.left + rect.width / 2 - panOffset.value.x,
      y: rect.top + rect.height / 2 - panOffset.value.y,
    }
  }

  function adjustPanForScaleChange(
    focalX: number,
    focalY: number,
    oldScale: number,
    newScale: number,
  ) {
    const center = getLayoutCenter()
    if (!center)
      return

    panOffset.value = {
      x: focalX - center.x - (focalX - center.x - panOffset.value.x) * (newScale / oldScale),
      y: focalY - center.y - (focalY - center.y - panOffset.value.y) * (newScale / oldScale),
    }
  }

  function setScaleAt(focalX: number, focalY: number, newScale: number) {
    const oldScale = currentScale.value
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale))

    if (Math.abs(clamped - oldScale) < 0.001)
      return

    adjustPanForScaleChange(focalX, focalY, oldScale, clamped)
    currentScale.value = clamped
  }

  function resetZoomState() {
    currentScale.value = MIN_SCALE
    isDragging.value = false
    isPinching.value = false
    isWheelZooming.value = false
    pendingDrag = false
    activePointerId = null
    dragCaptureTarget = null
    panOffset.value = { x: 0, y: 0 }
    pinchStartDistance = 0
  }

  function releasePointerCapture() {
    if (dragCaptureTarget && activePointerId !== null) {
      try {
        dragCaptureTarget.releasePointerCapture(activePointerId)
      }
      catch {
        // pointer may already be released
      }
    }

    activePointerId = null
    dragCaptureTarget = null
  }

  function zoomImageAt(clientX: number, clientY: number) {
    if (isZoomed.value) {
      resetZoomState()
      return
    }

    const img = imageRef.value
    if (!img)
      return

    const rect = img.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0)
      return

    setScaleAt(clientX, clientY, DOUBLE_TAP_SCALE)
  }

  function onImageDblClick(event: MouseEvent) {
    if (Date.now() < suppressDblClickUntil) {
      event.preventDefault()
      return
    }

    pendingDrag = false
    isDragging.value = false
    releasePointerCapture()

    zoomImageAt(event.clientX, event.clientY)
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch')
      markTouchGesture()

    if (!isZoomed.value || isPinching.value || event.button !== 0)
      return

    pendingDrag = true
    activePointerId = event.pointerId
    dragCaptureTarget = event.currentTarget as HTMLElement
    dragStartX = event.clientX
    dragStartY = event.clientY
    startPanX = panOffset.value.x
    startPanY = panOffset.value.y
  }

  function onPointerMove(event: PointerEvent) {
    if (!pendingDrag && !isDragging.value)
      return

    if (activePointerId !== null && event.pointerId !== activePointerId)
      return

    if (pendingDrag && !isDragging.value) {
      const dx = event.clientX - dragStartX
      const dy = event.clientY - dragStartY

      if (Math.hypot(dx, dy) < DRAG_START_THRESHOLD)
        return

      isDragging.value = true
      pendingDrag = false

      if (dragCaptureTarget)
        dragCaptureTarget.setPointerCapture(event.pointerId)
    }

    panOffset.value = {
      x: startPanX + event.clientX - dragStartX,
      y: startPanY + event.clientY - dragStartY,
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (activePointerId !== null && event.pointerId !== activePointerId)
      return

    pendingDrag = false
    isDragging.value = false
    releasePointerCapture()
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault()

    isWheelZooming.value = true
    clearTimeout(wheelZoomEndTimer)
    wheelZoomEndTimer = setTimeout(() => {
      isWheelZooming.value = false
    }, 120)

    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, currentScale.value * Math.exp(-event.deltaY * WHEEL_ZOOM_INTENSITY)),
    )

    if (newScale <= MIN_SCALE + 0.02) {
      resetZoomState()
      return
    }

    setScaleAt(event.clientX, event.clientY, newScale)
  }

  function onTouchStart(event: TouchEvent) {
    markTouchGesture()

    if (event.touches.length !== 2)
      return

    isPinching.value = true
    isDragging.value = false
    pendingDrag = false
    releasePointerCapture()

    pinchStartDistance = getTouchDistance(event.touches)
    pinchStartScale = currentScale.value
    pinchStartPan = { ...panOffset.value }
    pinchStartFocal = getTouchMidpoint(event.touches)

    const center = getLayoutCenter()
    if (center)
      pinchLayoutCenter = { ...center }

    event.preventDefault()
  }

  function onTouchMove(event: TouchEvent) {
    if (event.touches.length === 2 && isPinching.value) {
      const distance = getTouchDistance(event.touches)
      if (pinchStartDistance <= 0)
        return

      const focal = getTouchMidpoint(event.touches)
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, pinchStartScale * (distance / pinchStartDistance)),
      )

      const ratio = newScale / pinchStartScale
      panOffset.value = {
        x: focal.x - pinchLayoutCenter.x
          - (pinchStartFocal.x - pinchLayoutCenter.x - pinchStartPan.x) * ratio
          + (focal.x - pinchStartFocal.x),
        y: focal.y - pinchLayoutCenter.y
          - (pinchStartFocal.y - pinchLayoutCenter.y - pinchStartPan.y) * ratio
          + (focal.y - pinchStartFocal.y),
      }

      currentScale.value = newScale
      event.preventDefault()
    }
  }

  function onTouchEnd(event: TouchEvent) {
    markTouchGesture()

    if (!isPinching.value || event.touches.length >= 2)
      return

    isPinching.value = false
    pinchStartDistance = 0

    if (currentScale.value <= MIN_SCALE + 0.02)
      resetZoomState()
  }

  function onTouchCancel() {
    markTouchGesture()

    if (isPinching.value) {
      isPinching.value = false
      pinchStartDistance = 0

      if (currentScale.value <= MIN_SCALE + 0.02)
        resetZoomState()
    }
  }

  return {
    isZoomed,
    isDragging,
    isPinching,
    imageTransformStyle,
    resetZoomState,
    onImageDblClick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  }
}
