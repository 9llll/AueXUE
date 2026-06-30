<script lang="ts" setup>
import type { Categories, CategoryList } from 'valaxy'
import { isCategoryList, useAppStore } from 'valaxy'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { loadEcharts, observeChartResize, type EChartsInstance } from '../utils/echarts'

interface ChartDataItem {
  name: string
  value: number
  categoryKey: string
  children?: ChartDataItem[]
}

interface ChartClickParams {
  data?: {
    categoryKey?: string
  }
}

const props = defineProps<{
  categories: Categories
}>()

const { t } = useI18n()
const router = useRouter()
const appStore = useAppStore()
const chartRef = ref<HTMLElement>()
let chartInstance: EChartsInstance | null = null
let stopObserveResize: (() => void) | undefined

const textColor = computed(() =>
  appStore.isDark ? 'rgba(255,255,255,0.7)' : '#4c4948',
)

function getCategoryName(name: string) {
  return name === 'Uncategorized' ? t('category.uncategorized') : name
}

function hasNestedCategories(categories: Categories) {
  for (const category of categories.values()) {
    if (!isCategoryList(category))
      continue
    for (const child of category.children.values()) {
      if (isCategoryList(child))
        return true
    }
  }
  return false
}

function buildFlatData(categories: Categories): ChartDataItem[] {
  const data: ChartDataItem[] = []
  for (const category of categories.values()) {
    if (!isCategoryList(category))
      continue
    data.push({
      name: getCategoryName(category.name),
      value: category.total,
      categoryKey: category.name,
    })
  }
  return data
}

function buildTreeNode(category: CategoryList, parentKey = ''): ChartDataItem {
  const categoryKey = parentKey ? `${parentKey}/${category.name}` : category.name
  const node: ChartDataItem = {
    name: getCategoryName(category.name),
    value: category.total,
    categoryKey,
  }

  const children: ChartDataItem[] = []
  for (const child of category.children.values()) {
    if (isCategoryList(child))
      children.push(buildTreeNode(child, categoryKey))
  }

  if (children.length > 0)
    node.children = children

  return node
}

function buildTreeData(categories: Categories) {
  return Array.from(categories.values())
    .filter(isCategoryList)
    .map(category => buildTreeNode(category))
}

function buildChartOption(hasParentCategory: boolean) {
  const flatData = buildFlatData(props.categories)
  const treeData = buildTreeData(props.categories)
  const color = textColor.value

  const option: Record<string, unknown> = {
    title: {
      text: '文章分类统计图',
      x: 'center',
      textStyle: { color },
    },
    legend: {
      top: 'bottom',
      data: flatData.map(item => item.name),
      textStyle: { color },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b} : {c}篇 ({d}%)',
    },
    series: [],
  }

  if (hasParentCategory) {
    ;(option.series as unknown[]).push({
      nodeClick: false,
      name: '文章篇数',
      type: 'sunburst',
      radius: ['15%', '90%'],
      center: ['50%', '55%'],
      sort: 'desc',
      data: treeData,
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 2,
        emphasis: {
          focus: 'ancestor',
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(255, 255, 255, 0.5)',
        },
      },
    })
  }
  else {
    ;(option.series as unknown[]).push({
      name: '文章篇数',
      type: 'pie',
      radius: [30, 80],
      roseType: 'area',
      label: {
        color,
        formatter: '{b} : {c} ({d}%)',
      },
      data: flatData,
      itemStyle: {
        emphasis: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(255, 255, 255, 0.5)',
        },
      },
    })
  }

  return option
}

function renderChart() {
  if (!chartInstance || !chartRef.value)
    return

  const hasParentCategory = hasNestedCategories(props.categories)
  chartInstance.setOption(buildChartOption(hasParentCategory), true)
}

function handleChartResize() {
  chartInstance?.resize()
}

async function initChart() {
  if (!chartRef.value)
    return

  const echarts = await loadEcharts()
  chartInstance = echarts.init(chartRef.value, 'light')
  renderChart()
  chartInstance.resize()

  chartInstance.on('click', 'series', (event: ChartClickParams) => {
    if (event.data?.categoryKey) {
      router.push({
        query: { category: event.data.categoryKey },
      })
    }
  })

  stopObserveResize = observeChartResize(chartRef.value, handleChartResize)
}

const categorySignature = computed(() =>
  Array.from(props.categories.entries())
    .map(([key, value]) => (isCategoryList(value) ? `${key}:${value.total}` : key))
    .join('|'),
)

watch(categorySignature, renderChart)
watch(textColor, renderChart)

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  stopObserveResize?.()
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<template>
  <div
    id="categories-chart"
    ref="chartRef"
    class="sakura-stat-chart sakura-categories-chart"
    data-parent="true"
  />
</template>

<style lang="scss" scoped>
.sakura-categories-chart {
  display: block;
  height: 360px;
  padding: 10px;
  margin-bottom: 1rem;
}
</style>
