import type { ECharts } from 'echarts'

export type EChartsInstance = ECharts
export type EchartsLib = typeof import('echarts')

export function loadEcharts() {
  return import('echarts')
}

export function createGradient(
  echartsLib: Awaited<ReturnType<typeof loadEcharts>>,
  topColor = 'rgba(128, 255, 165)',
  bottomColor = 'rgba(1, 191, 236)',
) {
  return echartsLib.graphic?.LinearGradient
    ? new echartsLib.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: topColor },
        { offset: 1, color: bottomColor },
      ])
    : topColor
}

export function observeChartResize(
  el: HTMLElement | undefined,
  onResize: () => void,
) {
  if (!el)
    return () => {}

  let resizeTimer: ReturnType<typeof setTimeout> | undefined

  const scheduleResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(onResize, 100)
  }

  const observer = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(scheduleResize)
    : null

  observer?.observe(el)
  window.addEventListener('resize', scheduleResize)

  return () => {
    observer?.disconnect()
    window.removeEventListener('resize', scheduleResize)
    clearTimeout(resizeTimer)
  }
}
