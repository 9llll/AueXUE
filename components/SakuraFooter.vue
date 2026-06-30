<script lang="ts" setup>
import type { Pkg } from 'valaxy'
import { useConfig } from 'valaxy'
import { isClient } from '@vueuse/core'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

interface FooterConfig {
  icp?: string
  powered?: boolean
  runtimeSince?: string
}

interface RuntimeParts {
  days: number
  hours: number
  minutes: number
  seconds: number
}

const props = defineProps<{
  footer?: FooterConfig
  pkg?: Pkg
}>()

const config = useConfig()

const footer = computed(() => {
  if (props.footer)
    return props.footer

  return (config.value?.themeConfig as { footer?: FooterConfig } | undefined)?.footer ?? {}
})

const runtime = ref<RuntimeParts | null>(null)

let timer: ReturnType<typeof setInterval> | undefined

function parseStartTime(since: string) {
  const trimmed = since.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number)
    return new Date(year, month - 1, day, 0, 0, 0, 0)
  }

  const start = new Date(trimmed)
  if (Number.isNaN(start.getTime()))
    return null

  return start
}

function updateRuntime() {
  const since = footer.value.runtimeSince
  if (!since) {
    runtime.value = null
    return
  }

  const start = parseStartTime(since)
  if (!start) {
    runtime.value = null
    return
  }

  let diffMs = Date.now() - start.getTime()
  if (diffMs < 0) {
    runtime.value = null
    return
  }

  const days = Math.floor(diffMs / 86_400_000)
  diffMs -= days * 86_400_000

  const hours = Math.floor(diffMs / 3_600_000)
  diffMs -= hours * 3_600_000

  const minutes = Math.floor(diffMs / 60_000)
  diffMs -= minutes * 60_000

  const seconds = Math.floor(diffMs / 1000)

  runtime.value = { days, hours, minutes, seconds }
}

function stopTimer() {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

function startTimer() {
  updateRuntime()
  stopTimer()

  if (isClient)
    timer = setInterval(updateRuntime, 1000)
}

watch(() => footer.value.runtimeSince, startTimer)

onMounted(startTimer)
onUnmounted(stopTimer)
</script>

<template>
  <footer class="sakura-footer h-$sakura-footer-height" text="center sm" style="color:var(--va-c-text-light)">
    <div v-if="footer.icp" class="icp" p="y-2" v-html="footer.icp" />

    <SakuraCopyright />

    <p v-if="runtime" class="sakura-footer-runtime">
      本站已经流畅运行
      <span class="sakura-footer-runtime__num">{{ runtime.days }}</span>天
      <span class="sakura-footer-runtime__num">{{ runtime.hours }}</span>小时
      <span class="sakura-footer-runtime__num">{{ runtime.minutes }}</span>分钟
      <span class="sakura-footer-runtime__num">{{ runtime.seconds }}</span>秒
    </p>

    <SakuraPowered v-if="footer.powered" />

    <slot />
  </footer>
</template>

<style lang="scss" scoped>
.sakura-footer-runtime {
  margin: 0;
  padding: 4px 0 8px;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--va-c-text-light);
}

.sakura-footer-runtime__num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--sakura-color-primary, #fe9500);
}
</style>
