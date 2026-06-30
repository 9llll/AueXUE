<script lang="ts" setup>
import type { Post } from 'valaxy'
import type { ArchiveMonthItem } from '../types/posts'
import { useAppStore } from 'valaxy'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createGradient, loadEcharts, observeChartResize, type EChartsInstance } from '../utils/echarts'

const props = withDefaults(defineProps<{
  posts?: Post[]
  months?: ArchiveMonthItem[]
  startMonth?: string
}>(), {
  startMonth: '2020-01',
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

function generateMonthArray(startMonth: string) {
  const [startYear, startMon] = startMonth.split('-').map(Number)
  const now = new Date()
  const endYear = now.getFullYear()
  const endMon = now.getMonth() + 1

  const months: string[] = []
  let year = startYear
  let month = startMon

  while (year < endYear || (year === endYear && month <= endMon)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return months
}

function getPostMonth(post: Post) {
  if (!post.date)
    return null
  if (post.hide && post.hide !== 'index')
    return null

  const date = post.date instanceof Date ? post.date : new Date(post.date)
  if (Number.isNaN(date.getTime()))
    return null

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function countPostsByMonth(posts: Post[], monthArr: string[]) {
  const monthMap = new Map(monthArr.map(month => [month, 0]))

  posts.forEach((post) => {
    const month = getPostMonth(post)
    if (month && monthMap.has(month))
      monthMap.set(month, (monthMap.get(month) || 0) + 1)
  })

  return monthArr.map(month => monthMap.get(month) || 0)
}

const monthArr = computed(() => generateMonthArray(props.startMonth))
const monthValueArr = computed(() => {
  if (props.months?.length) {
    const monthMap = new Map(props.months.map(item => [item.month, item.count]))
    return monthArr.value.map(month => monthMap.get(month) || 0)
  }
  return countPostsByMonth(props.posts || [], monthArr.value)
})

const chartSignature = computed(() =>
  `${props.startMonth}|${monthArr.value.at(-1)}|${monthValueArr.value.join(',')}`,
)

function buildChartOption() {
  const color = textColor.value
  const gradient = echartsLib ? createGradient(echartsLib) : 'rgba(128, 255, 165)'

  return {
    title: {
      text: '文章发布统计图',
      x: 'center',
      textStyle: { color },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '16%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>文章篇数: {c}',
    },
    xAxis: {
      name: '日期',
      type: 'category',
      boundaryGap: false,
      nameTextStyle: { color },
      axisTick: { show: false },
      axisLabel: { show: true, color },
      axisLine: {
        show: true,
        lineStyle: { color },
      },
      data: monthArr.value,
    },
    yAxis: {
      name: '文章篇数',
      type: 'value',
      nameTextStyle: { color },
      splitLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: true, color },
      axisLine: {
        show: true,
        lineStyle: { color },
      },
    },
    series: [{
      name: '文章篇数',
      type: 'line',
      smooth: true,
      lineStyle: { width: 0 },
      showSymbol: false,
      itemStyle: {
        opacity: 1,
        color: gradient,
      },
      areaStyle: {
        opacity: 1,
        color: gradient,
      },
      data: monthValueArr.value,
      markLine: {
        data: [{
          name: '平均值',
          type: 'average',
          label: { color },
        }],
      },
    }],
  }
}

function renderChart() {
  if (!chartInstance)
    return

  chartInstance.setOption(buildChartOption(), true)
}

async function initChart() {
  if (!chartRef.value)
    return

  echartsLib = await loadEcharts()
  chartInstance = echartsLib.init(chartRef.value, 'light')
  renderChart()
  chartInstance.resize()

  chartInstance.on('click', 'series', (event) => {
    if (event.componentType !== 'series' || typeof event.name !== 'string')
      return

    const [year] = event.name.split('-')
    router.push({
      path: '/archives',
      hash: `##archive-year-${year}`,
    })
  })

  stopObserveResize = observeChartResize(chartRef.value, () => {
    chartInstance?.resize()
  })
}

watch(chartSignature, renderChart)
watch(textColor, renderChart)

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
    id="posts-chart"
    ref="chartRef"
    class="sakura-stat-chart sakura-archives-chart"
    :data-start="startMonth"
  />
</template>

<style lang="scss" scoped>
.sakura-archives-chart {
  display: block;
  height: 360px;
  padding: 10px;
  margin-bottom: 1rem;
}
</style>
