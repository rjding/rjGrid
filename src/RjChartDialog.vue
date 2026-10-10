<template>
  <div class="rj-chart-mask" @click.self="$emit('close')">
    <div class="rj-chart-dialog">
      <div class="rj-chart-header">
        {{ t('chartTitle') }}
        <span class="rj-chart-close" @click="$emit('close')">{{ icons.remove }}</span>
      </div>
      <div class="rj-chart-body">
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center">
          <div class="rj-radio-tabs">
            <span
              v-for="tt in TYPE_KEYS"
              :key="tt.k"
              :class="{ 'is-active': chartType === tt.k }"
              @click="chartType = tt.k as any"
              >{{ t(tt.labelKey) }}</span
            >
          </div>
          <select v-model="xCat" class="rj-input" style="padding: 0 4px">
            <option value="">{{ t('chartPickX') }}</option>
            <option v-for="c in dimCols" :key="c.field" :value="c.field">{{
              c.title || c.field
            }}</option>
          </select>
          <select v-model="yVal" class="rj-input" style="padding: 0 4px">
            <option value="">{{ t('chartPickY') }}</option>
            <option v-for="c in valCols" :key="c.field" :value="c.field">{{
              c.title || c.field
            }}</option>
          </select>
          <select v-model="agg" class="rj-input" style="padding: 0 4px">
            <option v-for="[k, v] of aggEntries" :key="k" :value="k">{{ v }}</option>
          </select>
          <select v-if="groupCols.length" v-model="groupBy" class="rj-input" style="padding: 0 4px">
            <option value="">{{ t('chartNoSeries') }}</option>
            <option v-for="c in groupCols" :key="c.field" :value="c.field">{{
              c.title || c.field
            }}</option>
          </select>
        </div>
        <div ref="chartEl" class="rj-chart-canvas"></div>
        <div v-if="chartUnavailable" class="rj-chart-warn">{{ t('chartNoEcharts') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { RjAggFunc, RjColumn, RjRowData } from './types'
import { AGG_LABELS, runAgg } from './utils'
import { cellRawValue } from './useRowModel'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import { RJ_ICONS_KEY, mergeIcons } from './icons'

defineOptions({ name: 'RjChartDialog' })

const t = inject(RJ_LOCALE_KEY, defaultTranslate)
// 图标（由网格根 provide，默认字形兜底）
const icons = inject(
  RJ_ICONS_KEY,
  computed(() => mergeIcons())
)

/** 图表类型→文案 key（下标固定，避开模板内联对象每次重建于每帧新字面量） */
const TYPE_KEYS = [
  { k: 'bar', labelKey: 'chartBar' },
  { k: 'line', labelKey: 'chartLine' },
  { k: 'pie', labelKey: 'chartPie' },
  { k: 'area', labelKey: 'chartArea' }
] as const

const props = defineProps<{
  columns: RjColumn[]
  rows: RjRowData[]
}>()
defineEmits<{ (e: 'close'): void }>()

const dimCols = computed(() =>
  props.columns.filter(
    (c) => c.field && !c.checkbox && c.type !== 'num' && c.type !== 'money' && c.type !== 'percent'
  )
)
const valCols = computed(() =>
  props.columns.filter(
    (c) => c.field && (c.type === 'num' || c.type === 'money' || c.type === 'percent' || c.aggFunc)
  )
)
const groupCols = computed(() => dimCols.value.filter((c) => c !== null).slice(0, 30))

/** 聚合候选项：AGG_LABELS 存的是文案 key，经 t() 取词，语言切换时自动重算 */
const aggEntries = computed(() =>
  (Object.keys(AGG_LABELS) as RjAggFunc[]).map((k) => [k, t(AGG_LABELS[k])] as const)
)

const chartType = ref<'bar' | 'line' | 'pie' | 'area'>('bar')
const xCat = ref('')
const yVal = ref('')
const agg = ref('sum')
const groupBy = ref('')

const chartEl = ref<HTMLDivElement>()
// echarts 是可选 peer：宿主没装时只让「集成图表」降级成一行提示，不能把整页拖崩
const chartUnavailable = ref(false)
let chartInstance: any = null
let disposed = false

/** 默认轴：X 取首个维度列，Y 取首个“非 X”的指标列，避免两轴选中同一列 */
function applyDefaults() {
  if (!xCat.value) xCat.value = dimCols.value[0]?.field || ''
  if (!yVal.value) {
    const vc = valCols.value.find((c) => c.field && c.field !== xCat.value) || valCols.value[0]
    yVal.value = vc?.field || ''
  }
}

watch([xCat, yVal], applyDefaults)

async function renderChart() {
  if (!chartEl.value || !xCat.value || !yVal.value) return
  let echarts: any
  try {
    echarts = await import('echarts')
  } catch {
    chartUnavailable.value = true
    return
  }
  chartUnavailable.value = false
  if (disposed || !chartEl.value) return
  if (!chartInstance || chartInstance.isDisposed?.()) {
    chartInstance = echarts.init(chartEl.value)
  }
  const xCol = props.columns.find((c) => c.field === xCat.value)!
  const yCol = props.columns.find((c) => c.field === yVal.value)!
  const buildSeries = (subset: RjRowData[]) => {
    const map = new Map<string, RjRowData[]>()
    subset.forEach((r) => {
      const k = String(cellRawValue(xCol, r) ?? t('emptyVal'))
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    })
    const labels = Array.from(map.keys())
    const values = labels.map((k) => {
      const rowsOf = map.get(k)!
      const vals = rowsOf.map((r) => cellRawValue(yCol, r)).filter((v) => v != null)
      const num = runAgg(agg.value as any, rowsOf, vals)
      return typeof num === 'number' ? Math.round(num * 100) / 100 : num
    })
    return { labels, values }
  }

  let option: any
  if (chartType.value === 'pie') {
    const { labels, values } = buildSeries(props.rows)
    option = {
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['35%', '65%'],
          data: labels.map((n, i) => ({ name: n, value: values[i] }))
        }
      ]
    }
  } else {
    let labels: string[] = []
    let series: any[] = []
    if (groupBy.value) {
      const gCol = props.columns.find((c) => c.field === groupBy.value)!
      const groups = Array.from(
        new Set(props.rows.map((r) => String(cellRawValue(gCol, r) ?? t('emptyVal'))))
      )
      const base = buildSeries(props.rows)
      labels = base.labels
      series = groups.map((g) => {
        const s = buildSeries(
          props.rows.filter((r) => String(cellRawValue(gCol, r) ?? t('emptyVal')) === g)
        )
        return {
          name: g,
          type: chartType.value === 'line' || chartType.value === 'area' ? 'line' : 'bar',
          areaStyle: chartType.value === 'area' ? {} : undefined,
          smooth: chartType.value !== 'bar',
          data: labels.map((l) => s.values[s.labels.indexOf(l)] ?? null)
        }
      })
    } else {
      const built = buildSeries(props.rows)
      labels = built.labels
      series = [
        {
          type: chartType.value === 'line' || chartType.value === 'area' ? 'line' : 'bar',
          areaStyle: chartType.value === 'area' ? {} : undefined,
          smooth: chartType.value !== 'bar',
          data: built.values
        }
      ]
    }
    option = {
      tooltip: { trigger: 'axis' },
      legend: series.length > 1 ? { top: 0 } : undefined,
      grid: { left: 50, right: 20, bottom: 60, top: series.length > 1 ? 32 : 16 },
      xAxis: { type: 'category', data: labels, axisLabel: { rotate: labels.length > 8 ? 35 : 0 } },
      yAxis: { type: 'value' },
      series
    }
  }
  // 类目过多时截取 Top50
  chartInstance.setOption(option, true)
  chartInstance.resize()
}

const onResize = () => chartInstance?.resize()
let raf = 0
function scheduleRender() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(renderChart)
}

watch([chartType, xCat, yVal, agg, groupBy], scheduleRender)

onMounted(() => {
  applyDefaults()
  window.addEventListener('resize', onResize)
  scheduleRender()
})
onBeforeUnmount(() => {
  disposed = true
  window.removeEventListener('resize', onResize)
  chartInstance?.dispose?.()
})
</script>
