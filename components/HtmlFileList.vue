<script lang="ts" setup>
import type { HtmlFileSummary } from '../types/htmlFile'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface FireflyNode {
  slug: string
  title: string
  publicPath: string
  x: number
  y: number
  vx: number
  vy: number
  size: number
  phase: number
  paused: boolean
  color: string
  glow: string
  wave: string
  halo: string
}

const props = withDefaults(defineProps<{
  files?: HtmlFileSummary[]
}>(), {
  files: () => [],
})

let rafId = 0
let lastTime = 0
let resizeObserver: ResizeObserver | null = null
let motionQuery: MediaQueryList | null = null

const sortedFiles = computed(() => {
  return [...props.files].sort((a, b) => {
    const ta = Date.parse(a.updatedAt || '') || 0
    const tb = Date.parse(b.updatedAt || '') || 0
    return tb - ta
  })
})

const containerRef = ref<HTMLElement | null>(null)
const nodes = ref<FireflyNode[]>([])
const containerSize = ref({ width: 640, height: 420 })
const motionEnabled = ref(true)

const pointer = { x: -9999, y: -9999, active: false }
const ATTRACT_RADIUS = 132
const ATTRACT_STRENGTH = 0.052
const MAX_SPEED = 1.35

const MORANDI_BASE = [
  '#e8a8a0',
  '#e8c98a',
  '#9fd4a0',
  '#86bdd4',
  '#d4a8c8',
  '#e8a890',
  '#8fd4c4',
  '#e0c078',
  '#98b4e8',
  '#e898b0',
  '#b8d490',
  '#c4a0e0',
]

function randomMorandiPalette() {
  const base = MORANDI_BASE[Math.floor(Math.random() * MORANDI_BASE.length)]

  return {
    color: base,
    glow: `color-mix(in srgb, ${base} 94%, transparent)`,
    wave: `color-mix(in srgb, ${base} 78%, transparent)`,
    halo: `color-mix(in srgb, ${base} 72%, transparent)`,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createNode(file: HtmlFileSummary, width: number, height: number): FireflyNode {
  const size = 20 + Math.random() * 22
  const radius = size / 2 + 10
  const safeW = Math.max(radius * 2 + 8, width)
  const safeH = Math.max(radius * 2 + 8, height)
  const angle = Math.random() * Math.PI * 2
  const speed = 0.28 + Math.random() * 0.55
  const palette = randomMorandiPalette()

  return {
    slug: file.slug,
    title: file.title,
    publicPath: file.publicPath,
    x: radius + Math.random() * Math.max(1, safeW - radius * 2),
    y: radius + Math.random() * Math.max(1, safeH - radius * 2),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
    phase: Math.random() * 4,
    paused: false,
    ...palette,
  }
}

function measureContainer() {
  if (!containerRef.value)
    return

  const rect = containerRef.value.getBoundingClientRect()
  containerSize.value = {
    width: Math.max(280, rect.width),
    height: Math.max(320, rect.height),
  }
}

function initNodes(preservePositions = false) {
  const files = sortedFiles.value
  if (!files.length) {
    nodes.value = []
    return
  }

  measureContainer()
  const { width, height } = containerSize.value
  const previous = new Map(nodes.value.map(node => [node.slug, node]))

  nodes.value = files.map((file) => {
    const existing = preservePositions ? previous.get(file.slug) : undefined
    if (existing)
      return { ...existing, title: file.title, publicPath: file.publicPath }

    return createNode(file, width, height)
  })
}

function nodeRadius(node: FireflyNode) {
  return node.size / 2
}

function applyPointerAttraction(node: FireflyNode, dt: number) {
  if (!pointer.active || node.paused)
    return

  const dx = pointer.x - node.x
  const dy = pointer.y - node.y
  const dist = Math.hypot(dx, dy)
  if (dist <= 0 || dist >= ATTRACT_RADIUS)
    return

  const pull = (1 - dist / ATTRACT_RADIUS) ** 1.35 * ATTRACT_STRENGTH * dt
  node.vx += (dx / dist) * pull * 14
  node.vy += (dy / dist) * pull * 14
}

function limitSpeed(node: FireflyNode, maxSpeed = MAX_SPEED) {
  const speed = Math.hypot(node.vx, node.vy)
  if (speed > maxSpeed) {
    node.vx = (node.vx / speed) * maxSpeed
    node.vy = (node.vy / speed) * maxSpeed
  }
}

function resolveWallCollisions(node: FireflyNode, width: number, height: number) {
  const radius = nodeRadius(node) + 8
  if (node.x < radius) {
    node.x = radius
    node.vx = Math.abs(node.vx) * 0.92
  }
  if (node.x > width - radius) {
    node.x = width - radius
    node.vx = -Math.abs(node.vx) * 0.92
  }
  if (node.y < radius) {
    node.y = radius
    node.vy = Math.abs(node.vy) * 0.92
  }
  if (node.y > height - radius) {
    node.y = height - radius
    node.vy = -Math.abs(node.vy) * 0.92
  }
}

function resolveBallCollisions() {
  const list = nodes.value

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy) || 0.001
      const minDist = nodeRadius(a) + nodeRadius(b) + 2

      if (dist >= minDist)
        continue

      const nx = dx / dist
      const ny = dy / dist
      const overlap = minDist - dist
      const massA = a.size * a.size
      const massB = b.size * b.size
      const totalMass = massA + massB

      if (!a.paused && !b.paused) {
        a.x -= nx * overlap * (massB / totalMass)
        a.y -= ny * overlap * (massB / totalMass)
        b.x += nx * overlap * (massA / totalMass)
        b.y += ny * overlap * (massA / totalMass)
      }
      else if (a.paused && !b.paused) {
        b.x += nx * overlap
        b.y += ny * overlap
        b.vx += nx * 0.35
        b.vy += ny * 0.35
      }
      else if (!a.paused && b.paused) {
        a.x -= nx * overlap
        a.y -= ny * overlap
        a.vx -= nx * 0.35
        a.vy -= ny * 0.35
      }

      const rvx = b.vx - a.vx
      const rvy = b.vy - a.vy
      const velAlongNormal = rvx * nx + rvy * ny
      if (velAlongNormal >= 0)
        continue

      const restitution = 0.82
      const impulse = -(1 + restitution) * velAlongNormal / (1 / massA + 1 / massB)

      if (!a.paused) {
        a.vx -= (impulse * nx) / massA
        a.vy -= (impulse * ny) / massA
      }
      if (!b.paused) {
        b.vx += (impulse * nx) / massB
        b.vy += (impulse * ny) / massB
      }
    }
  }
}

function onPointerMove(event: PointerEvent) {
  if (!containerRef.value)
    return

  const rect = containerRef.value.getBoundingClientRect()
  pointer.x = event.clientX - rect.left
  pointer.y = event.clientY - rect.top
  pointer.active = true
}

function onPointerLeave() {
  pointer.active = false
}

function animate(time: number) {
  const dt = lastTime ? Math.min(32, time - lastTime) / 16 : 1
  lastTime = time

  if (motionEnabled.value && nodes.value.length) {
    const { width, height } = containerSize.value

    for (const node of nodes.value) {
      if (node.paused)
        continue

      node.vx += (Math.random() - 0.5) * 0.014 * dt
      node.vy += (Math.random() - 0.5) * 0.014 * dt
      applyPointerAttraction(node, dt)
      limitSpeed(node)

      node.x += node.vx * dt
      node.y += node.vy * dt
      resolveWallCollisions(node, width, height)
    }

    resolveBallCollisions()

    for (const node of nodes.value) {
      if (!node.paused)
        limitSpeed(node)
    }
  }

  rafId = requestAnimationFrame(animate)
}

function startAnimation() {
  cancelAnimationFrame(rafId)
  lastTime = 0
  rafId = requestAnimationFrame(animate)
}

function stopAnimation() {
  cancelAnimationFrame(rafId)
  rafId = 0
  lastTime = 0
}

function pauseNode(slug: string) {
  const node = nodes.value.find(item => item.slug === slug)
  if (node)
    node.paused = true
}

function resumeNode(slug: string) {
  const node = nodes.value.find(item => item.slug === slug)
  if (node)
    node.paused = false
}

function nodeStyle(node: FireflyNode) {
  return {
    width: `${node.size}px`,
    height: `${node.size}px`,
    transform: `translate3d(${node.x}px, ${node.y}px, 0) translate(-50%, -50%)`,
    '--firefly-phase': `${node.phase}s`,
    '--firefly-color': node.color,
    '--firefly-glow': node.glow,
    '--firefly-wave': node.wave,
    '--firefly-halo': node.halo,
  }
}

function updateMotionPreference() {
  motionEnabled.value = !motionQuery?.matches
}

watch(sortedFiles, () => {
  initNodes(nodes.value.length > 0)
}, { immediate: true })

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotionPreference()
  motionQuery.addEventListener('change', updateMotionPreference)

  measureContainer()
  initNodes(false)

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      measureContainer()
      const { width, height } = containerSize.value
      for (const node of nodes.value) {
        const radius = nodeRadius(node) + 8
        node.x = clamp(node.x, radius, width - radius)
        node.y = clamp(node.y, radius, height - radius)
      }
    })
    resizeObserver.observe(containerRef.value)
  }

  startAnimation()
})

onBeforeUnmount(() => {
  stopAnimation()
  resizeObserver?.disconnect()
  motionQuery?.removeEventListener('change', updateMotionPreference)
})
</script>

<template>
  <div class="html-file-fireflies">
    <p v-if="!sortedFiles.length" class="html-file-fireflies__empty">
      暂无 HTML 文件。
    </p>

    <div
      v-else
      ref="containerRef"
      class="html-file-fireflies__field"
      aria-label="HTML 文件列表"
      @pointermove="onPointerMove"
      @pointerleave="onPointerLeave"
    >
      <div class="html-file-fireflies__aurora" aria-hidden="true">
        <span class="html-file-fireflies__aurora-wash" />
        <span class="html-file-fireflies__aurora-blob html-file-fireflies__aurora-blob--1" />
        <span class="html-file-fireflies__aurora-blob html-file-fireflies__aurora-blob--2" />
        <span class="html-file-fireflies__aurora-blob html-file-fireflies__aurora-blob--3" />
      </div>

      <a
        v-for="node in nodes"
        :key="node.slug"
        class="html-file-fireflies__orb"
        :href="node.publicPath"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="node.title"
        :style="nodeStyle(node)"
        @mouseenter="pauseNode(node.slug)"
        @mouseleave="resumeNode(node.slug)"
        @focusin="pauseNode(node.slug)"
        @focusout="resumeNode(node.slug)"
      >
        <span class="html-file-fireflies__halo" aria-hidden="true" />
        <span class="html-file-fireflies__highlight" aria-hidden="true" />
        <span class="html-file-fireflies__wave html-file-fireflies__wave--1" aria-hidden="true" />
        <span class="html-file-fireflies__wave html-file-fireflies__wave--2" aria-hidden="true" />
        <span class="html-file-fireflies__wave html-file-fireflies__wave--3" aria-hidden="true" />
        <span class="html-file-fireflies__title">{{ node.title }}</span>
      </a>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.html-file-fireflies {
  width: 100%;
  min-width: 0;

  &__empty {
    margin: 0;
    padding: 3rem 1rem;
    text-align: center;
    color: var(--sakura-color-text-light, #888);
  }

  &__field {
    position: relative;
    width: 100%;
    min-height: clamp(360px, 58vh, 640px);
    overflow: hidden;
    border-radius: calc(var(--sakura-radius, 12px) - 2px);
    background: var(--sakura-color-background);
  }

  &__aurora {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  &__aurora-wash {
    position: absolute;
    inset: -24%;
    opacity: 0.72;
    animation: html-file-aurora-wash 38s ease-in-out infinite alternate;
    will-change: transform, opacity;
  }

  &__aurora-blob {
    position: absolute;
    filter: blur(58px);
    opacity: 0.62;
    will-change: transform, border-radius, opacity;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;

    &--1 {
      width: min(72%, 460px);
      height: min(58%, 340px);
      left: -8%;
      top: -6%;
      animation:
        html-file-aurora-blob-1 32s ease-in-out infinite alternate,
        html-file-aurora-fade-1 26s ease-in-out infinite alternate;
    }

    &--2 {
      width: min(64%, 400px);
      height: min(66%, 380px);
      right: -10%;
      bottom: -8%;
      animation:
        html-file-aurora-blob-2 36s ease-in-out infinite alternate,
        html-file-aurora-fade-2 30s ease-in-out infinite alternate;
    }

    &--3 {
      width: min(52%, 320px);
      height: min(48%, 280px);
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      animation:
        html-file-aurora-blob-3 28s ease-in-out infinite alternate,
        html-file-aurora-fade-3 22s ease-in-out infinite alternate;
    }
  }

  &__orb {
    position: absolute;
    left: 0;
    top: 0;
    display: block;
    border: none;
    background: transparent;
    text-decoration: none;
    cursor: pointer;
    will-change: transform;
    z-index: 1;

    &:hover,
    &:focus-visible {
      z-index: 3;
      filter:
        drop-shadow(0 0 14px var(--firefly-glow))
        drop-shadow(0 0 28px var(--firefly-halo));

      .html-file-fireflies__halo {
        transform: scale(1.14);
      }

      .html-file-fireflies__highlight {
        transform: translate(-50%, -50%) scale(1.1);
      }

      .html-file-fireflies__title {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }
  }

  &__halo {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(
      circle at 50% 50%,
      color-mix(in srgb, var(--firefly-color) 66%, transparent) 0%,
      var(--firefly-halo) 28%,
      color-mix(in srgb, var(--firefly-color) 34%, transparent) 50%,
      transparent 74%
    );
    pointer-events: none;
    opacity: 1;
    filter: blur(1px);
    transition: transform 0.25s ease, opacity 0.25s ease;
  }

  &__highlight {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 30%;
    height: 30%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(
      circle at 50% 50%,
      #fff 0%,
      #fff 14%,
      rgb(255 255 255 / 62%) 42%,
      transparent 74%
    );
    pointer-events: none;
    opacity: 0;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }

  &__wave {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid var(--firefly-wave);
    opacity: 0;
    animation: html-file-ripple 3.2s ease-out infinite;
    animation-delay: var(--firefly-phase, 0s);
    pointer-events: none;
    box-shadow: 0 0 12px color-mix(in srgb, var(--firefly-color) 50%, transparent);

    &--2 {
      animation-delay: calc(var(--firefly-phase, 0s) + 1.2s);
    }

    &--3 {
      animation-delay: calc(var(--firefly-phase, 0s) + 2.4s);
    }
  }

  &__title {
    position: absolute;
    left: 50%;
    top: calc(100% + 12px);
    transform: translate(-50%, 6px);
    min-width: max-content;
    max-width: min(16rem, 70vw);
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    background: rgb(0 0 0 / 72%);
    color: #fff;
    font-size: 0.8125rem;
    line-height: 1.35;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 0.22s ease,
      transform 0.22s ease;
    box-shadow: 0 6px 18px rgb(0 0 0 / 18%);
  }
}

@keyframes html-file-aurora-wash {
  0% {
    transform: translate(-5%, -4%) scale(1.02) rotate(-3deg);
    opacity: 0.66;
  }

  50% {
    transform: translate(6%, 5%) scale(1.16) rotate(5deg);
    opacity: 0.82;
  }

  100% {
    transform: translate(-4%, 7%) scale(1.08) rotate(-2deg);
    opacity: 0.72;
  }
}

@keyframes html-file-aurora-blob-1 {
  0% {
    border-radius: 58% 42% 54% 46% / 46% 58% 42% 54%;
    transform: translate(0, 0) scale(1) rotate(0deg);
  }

  50% {
    border-radius: 44% 56% 48% 52% / 58% 44% 56% 42%;
    transform: translate(9%, 6%) scale(1.14) rotate(14deg);
  }

  100% {
    border-radius: 52% 48% 62% 38% / 40% 54% 46% 60%;
    transform: translate(-6%, 10%) scale(0.92) rotate(-10deg);
  }
}

@keyframes html-file-aurora-blob-2 {
  0% {
    border-radius: 46% 54% 42% 58% / 52% 46% 58% 44%;
    transform: translate(0, 0) scale(1) rotate(0deg);
  }

  50% {
    border-radius: 60% 40% 50% 50% / 44% 60% 40% 56%;
    transform: translate(-8%, -7%) scale(1.1) rotate(-12deg);
  }

  100% {
    border-radius: 38% 62% 56% 44% / 58% 42% 54% 46%;
    transform: translate(7%, -5%) scale(1.18) rotate(8deg);
  }
}

@keyframes html-file-aurora-blob-3 {
  0% {
    border-radius: 50% 50% 44% 56% / 56% 44% 50% 50%;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }

  50% {
    border-radius: 62% 38% 52% 48% / 48% 62% 38% 52%;
    transform: translate(-44%, -58%) scale(1.2) rotate(18deg);
  }

  100% {
    border-radius: 42% 58% 60% 40% / 54% 46% 58% 42%;
    transform: translate(-58%, -44%) scale(0.88) rotate(-14deg);
  }
}

@keyframes html-file-aurora-fade-1 {
  0%,
  100% {
    opacity: 0.52;
  }

  50% {
    opacity: 0.72;
  }
}

@keyframes html-file-aurora-fade-2 {
  0%,
  100% {
    opacity: 0.48;
  }

  50% {
    opacity: 0.68;
  }
}

@keyframes html-file-aurora-fade-3 {
  0%,
  100% {
    opacity: 0.42;
  }

  50% {
    opacity: 0.62;
  }
}

@keyframes html-file-ripple {
  0% {
    transform: scale(0.78);
    opacity: 0.95;
  }

  70% {
    opacity: 0.32;
  }

  100% {
    transform: scale(1.42);
    opacity: 0;
  }
}

html:not(.dark) .html-file-fireflies {
  &__field {
    background: #fff;
    border: 1px solid rgb(0 0 0 / 4%);
    box-shadow:
      inset 0 0 90px rgb(255 210 230 / 6%),
      0 0 48px rgb(210 190 255 / 5%);
  }

  &__aurora-wash {
    background:
      radial-gradient(ellipse 78% 58% at 14% 18%, rgb(255 196 214 / 16%), transparent 58%),
      radial-gradient(ellipse 72% 54% at 86% 78%, rgb(186 220 255 / 14%), transparent 56%),
      radial-gradient(ellipse 64% 48% at 52% 46%, rgb(228 198 255 / 12%), transparent 62%),
      radial-gradient(ellipse 42% 36% at 74% 24%, rgb(255 224 196 / 10%), transparent 54%);
  }

  &__aurora-blob--1 {
    background: radial-gradient(circle, rgb(255 182 205 / 36%), transparent 72%);
  }

  &__aurora-blob--2 {
    background: radial-gradient(circle, rgb(176 214 255 / 32%), transparent 72%);
  }

  &__aurora-blob--3 {
    background: radial-gradient(circle, rgb(220 190 255 / 28%), transparent 72%);
  }

  &__orb {
    filter:
      drop-shadow(0 0 10px var(--firefly-glow))
      drop-shadow(0 0 22px var(--firefly-halo));
  }

  &__halo {
    opacity: 1;
  }

  &__highlight {
    opacity: 0.92;
  }

  &__orb:hover &__halo,
  &__orb:focus-visible &__halo {
    opacity: 1;
  }

  &__orb:hover &__highlight,
  &__orb:focus-visible &__highlight {
    opacity: 1;
  }
}

html.dark .html-file-fireflies {
  &__orb {
    filter:
      drop-shadow(0 0 8px var(--firefly-glow))
      drop-shadow(0 0 20px var(--firefly-halo));
  }

  &__halo {
    opacity: 0.98;
  }

  &__field {
    background: #111113;
    border: 1px solid rgb(255 255 255 / 4%);
    box-shadow:
      inset 0 0 100px rgb(140 100 200 / 4%),
      0 0 56px rgb(80 120 220 / 3%);
  }

  &__aurora-wash {
    background:
      radial-gradient(ellipse 78% 58% at 12% 20%, rgb(170 130 220 / 11%), transparent 58%),
      radial-gradient(ellipse 72% 54% at 88% 76%, rgb(90 150 230 / 9%), transparent 56%),
      radial-gradient(ellipse 64% 48% at 48% 44%, rgb(220 130 180 / 8%), transparent 62%),
      radial-gradient(ellipse 42% 36% at 70% 18%, rgb(120 200 220 / 7%), transparent 54%);
  }

  &__aurora-blob--1 {
    background: radial-gradient(circle, rgb(180 140 230 / 22%), transparent 72%);
  }

  &__aurora-blob--2 {
    background: radial-gradient(circle, rgb(90 160 240 / 19%), transparent 72%);
  }

  &__aurora-blob--3 {
    background: radial-gradient(circle, rgb(220 120 180 / 15%), transparent 72%);
  }

  &__title {
    background: rgb(20 20 20 / 88%);
  }
}

@media (max-width: 767px) {
  .html-file-fireflies__field {
    min-height: clamp(320px, 52vh, 520px);
  }

  .html-file-fireflies__title {
    max-width: min(12rem, 78vw);
    font-size: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .html-file-fireflies__aurora-wash,
  .html-file-fireflies__aurora-blob {
    animation: none !important;
    opacity: 0.65;
  }

  .html-file-fireflies__wave {
    animation: none;
    opacity: 0.35;
    transform: scale(1);
  }
}
</style>
