<template>
  <div ref="chartRef" class="chart"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  title: { type: String, default: '' },
  points: { type: Array, default: () => [] }
})

const chartRef = ref(null)
let chart
let resizeHandler

const render = () => {
  if (!chart) return
  chart.setOption({
    title: { text: props.title, left: 0, top: 0, textStyle: { fontSize: 14, fontWeight: 700 } },
    color: ['#2563eb', '#0f766e', '#f59e0b', '#ef4444', '#7c3aed', '#64748b', '#db2777'],
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value, percent }) => `${name}<br/>¥${Number(value).toLocaleString()} (${percent}%)`
    },
    legend: { bottom: 0, type: 'scroll' },
    series: [{
      type: 'pie',
      radius: ['44%', '68%'],
      center: ['50%', '48%'],
      avoidLabelOverlap: true,
      data: props.points.map((item) => ({ name: item.name, value: Number(item.value) }))
    }]
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
