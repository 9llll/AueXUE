import { ref, shallowRef } from 'vue'

export interface GalleryImage {
  src: string
  alt: string
}

export const galleryVisible = ref(false)
export const galleryImages = shallowRef<GalleryImage[]>([])
export const galleryIndex = ref(0)

function getImageSrc(img: HTMLImageElement) {
  return img.currentSrc || img.src || img.getAttribute('data-src') || ''
}

function isGalleryImage(img: HTMLImageElement) {
  if (!img.closest('.markdown-body'))
    return false

  if (img.closest('pre, code, .sakura-comment, .twikoo, nav, header, footer, .sakura-navbar, .sakura-post-nav'))
    return false

  const src = getImageSrc(img)
  if (!src || src.startsWith('data:'))
    return false

  return true
}

function collectImages(container: Element) {
  return Array.from(container.querySelectorAll<HTMLImageElement>('img'))
    .filter(isGalleryImage)
    .map(el => ({
      el,
      src: getImageSrc(el),
      alt: el.alt || '',
    }))
}

export function openGallery(images: GalleryImage[], index: number) {
  if (!images.length)
    return

  galleryImages.value = images
  galleryIndex.value = Math.min(Math.max(index, 0), images.length - 1)
  galleryVisible.value = true
  document.body.style.overflow = 'hidden'
}

export function closeGallery() {
  galleryVisible.value = false
  document.body.style.overflow = ''
}

export function prevImage() {
  if (galleryIndex.value > 0)
    galleryIndex.value -= 1
}

export function nextImage() {
  if (galleryIndex.value < galleryImages.value.length - 1)
    galleryIndex.value += 1
}

export function goToImage(index: number) {
  if (index < 0 || index >= galleryImages.value.length)
    return

  galleryIndex.value = index
}

function handleImageClick(event: Event) {
  if (!(event.target instanceof Element))
    return

  const img = event.target.closest('img')
  if (!(img instanceof HTMLImageElement))
    return

  if (!isGalleryImage(img))
    return

  const article = img.closest('.markdown-body')
  if (!article)
    return

  const list = collectImages(article)
  const index = list.findIndex(item => item.el === img)
  if (index === -1)
    return

  event.preventDefault()
  event.stopPropagation()

  openGallery(
    list.map(item => ({ src: item.src, alt: item.alt })),
    index,
  )
}

let initialized = false

export function initImageGallery() {
  if (initialized || typeof document === 'undefined')
    return

  initialized = true
  document.addEventListener('click', handleImageClick, true)
}
