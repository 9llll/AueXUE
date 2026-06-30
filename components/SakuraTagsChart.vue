<script lang="ts" setup>
import { useAppStore, useTags } from 'valaxy'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getDynamicTagMap, useDynamicTaxonomyState } from '../composables/useDynamicTaxonomy'
import { createGradient, loadEcharts, observeChartResize, type EChartsInstance } from '../utils/echarts'

interface TagDataItem {
  name: string
  value: number
  tagKey: string
}

const props = withDefaults(defineProps<{
  displayLength?: number
}>(), {
  displayLength: 10,
})

const builtInTags = useTags()
const { loaded: taxonomyLoaded } = useDynamicTaxonomyState()
const tags = computed(() => {
  if (taxonomyLoaded.value) {
    const dynamic = getDynamicTagMap()
    if (dynamic.size)
      return dynamic
  }
  return builtInTags.value
})
const router = useRouter()
const appStore = useAppStore()
const chartRef = ref<HTMLElement>()
let chartInstance: EChartsInstance | null = null
let echartsLib: Awaited<ReturnType<typeof loadEcharts>> | null = null
let stopObserveResize: (() => void) | undefined

const textColor = computed(() =>
  appStore.isDark ? 'rgba(255,255,255,0.7)' : '#4c4948',
)

const displayData = computed(() => {
  const tagArr: TagDataItem[] = Array.from(tags.value.entries()).map(([key, tag]) => ({
    name: key,
    value: tag.count,
    tagKey: key,
  }))

  tagArr.sort((a, b) => b.value - a.value)
  return tagArr.slice(0, Math.min(tagArr.length, props.displayLength))
})

const chartSignature = computed(() =>
  displayData.value.map(item => `${item.tagKey}:${item.value}`).join('|'),
)

function buildChartOption() {
  const color = textColor.value
  const data = displayData.value
  const gradient = echartsLib ? createGradient(echartsLib) : 'rgba(128, 255, 165)'
  const emphasisGradient = echartsLib
    ? createGradient(echartsLib, 'rgba(128, 255, 195)', 'rgba(1, 211, 255)')
    : 'rgba(128, 255, 195)'

  const option: Record<string, unknown> = {
    title: {
      text: data.length ? `Top ${data.length} 标签统计图` : '标签统计图',
      x: 'center',
      textStyle: { color },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: data.length > 6 ? '20%' : '14%',
      top: '16%',
      containLabel: true,
    },
    tooltip: {
      formatter: '{b}<br/>文章篇数: {c}',
    },
    xAxis: {
      name: '标签',
      type: 'category',
      nameTextStyle: { color },
      axisTick: { show: false },
      axisLabel: {
        show: true,
        color,
        interval: 0,
        rotate: 0,
      },
      axisLine: {
        show: true,
        lineStyle: { color },
      },
      data: data.map(item => item.name),
    },
    yAxis: {
      name: '文章篇数',
      type: 'value',
      splitLine: { show: false },
      nameTextStyle: { color },
      axisTick: { show: false },
      axisLabel: { show: true, color },
      axisLine: {
        show: true,
        lineStyle: { color },
      },
    },
    series: [{
      name: '文章篇数',
      type: 'bar',
      data,
      itemStyle: {
        color: gradient,
      },
      emphasis: {
        itemStyle: {
          color: emphasisGradient,
        },
      },
    }],
  }

  if (data.length > 0) {
    ;(option.series as Array<Record<string, unknown>>)[0].markLine = {
      data: [{
        name: '平均值',
        type: 'average',
        label: { color },
      }],
    }
  }

  return option
}

function renderChart() {
  if (!chartInstance)
    return

  chartInstance.setOption(buildChartOption(), true)
}

async function initChart() {
  if (!chartRef.value)
    return

  try {
    echartsLib = await loadEcharts()
    chartInstance = echartsLib.init(chartRef.value, 'light')
    renderChart()
    chartInstance.resize()

    chartInstance.on('click', 'series', (event) => {
      const data = event.data as TagDataItem | number | undefined
      const tagKey = typeof data === 'object' && data?.tagKey
        ? data.tagKey
        : typeof event.name === 'string'
          ? event.name
          : undefined

      if (tagKey) {
        router.push({
          query: { tag: tagKey },
        })
      }
    })

    stopObserveResize = observeChartResize(chartRef.value, () => {
      chartInstance?.resize()
    })
  }
  catch (error) {
    console.error('[SakuraTagsChart] init failed:', error)
  }
}

watch(chartSignature, renderChart)
watch(textColor, renderChart)
watch(() => props.displayLength, renderChart)

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  stopObserveResize?.()
  chartInstance?.dispose()
  chartInstance = null
  echartsLib = null
})
</script>

<template>
  <div
    id="tags-chart"
    ref="chartRef"
    class="sakura-stat-chart sakura-tags-chart"
    :data-length="displayLength"
  />
</template>

<style lang="scss" scoped>
.sakura-tags-chart {
  display: block;
  height: 360px;
  padding: 10px;
  margin-bottom: 1rem;
}
</style>
