<template>
  <div ref="chartRef" class="chart"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  title: { type: String, default: '' },
  points: { type: Array, default: () => [] },
  yFormatter: { type: Function, default: null }
})

const chartRef = ref(null)
let chart
let resizeHandler

const render = () => {
  if (!chart) return
  const months = [...new Set(props.points.map((item) => item.month))]
  const names = [...new Set(props.points.map((item) => item.name))]
  const series = names.map((name) => ({
    name,
    type: 'line',
    smooth: true,
    symbolSize: 7,
    data: months.map((month) => {
      const hit = props.points.find((item) => item.month === month && item.name === name)
      return hit ? Number(hit.value) : 0
    })
  }))

  chart.setOption({
    title: { text: props.title, left: 0, top: 0, textStyle: { fontSize: 14, fontWeight: 700 } },
    color: ['#2563eb', '#ef4444', '#0f766e', '#f59e0b', '#7c3aed', '#64748b', '#db2777'],
    tooltip: { trigger: 'axis', valueFormatter: (value) => props.yFormatter ? props.yFormatter(value) : value },
    legend: { top: 0, right: 0, type: 'scroll' },
    grid: { left: 48, right: 24, top: 52, bottom: 34 },
    xAxis: { type: 'category', boundaryGap: false, data: months },
    yAxis: { type: 'value', axisLabel: { formatter: (value) => `${Math.round(value / 10000)}万` } },
    series
  }, true)
}

onMounted(() => {
  chart = echarts.init(chartRef.value)
  resizeHandler = () => chart?.resize()
  render()
  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler)
  chart?.dispose()
})

watch(() => props.points, render, { deep: true })
</script>
