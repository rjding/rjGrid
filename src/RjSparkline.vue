<template>
  <span class="rj-sparkline"
    ><canvas
      ref="cv"
      :width="w * dpr"
      :height="h * dpr"
      :style="`width:${w}px;height:${h}px`"
    ></canvas
  ></span>
</template>

<script setup lang="ts">
// 单元格迷你图：bar / line / spider（雷达网），Canvas 直绘，零依赖
import { nextTick, onMounted, ref, watch } from 'vue'

defineOptions({ name: 'RjSparkline' })

const props = withDefaults(
  defineProps<{
    data: number[]
    style?: 'bar' | 'line' | 'spider'
    color?: string
    w?: number
    h?: number
  }>(),
  { color: '', w: 60, h: 22 }
)

const cv = ref<HTMLCanvasElement>()
const dpr = window.devicePixelRatio || 1

function draw() {
  const el = cv.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  const { w, h } = props
  ctx.clearRect(0, 0, w, h)
  const data = (props.data || []).filter((v) => typeof v === 'number' && isFinite(v))
  if (!data.length) return
  const max = Math.max(...data, 0)
  const min = Math.min(...data, 0)
  const span = max - min || 1
  const css = getComputedStyle(el.parentElement || el)
  const color = props.color || css.getPropertyValue('--rj-primary') || '#3b76f6'
  ctx.lineWidth = 1.2

  if (props.style === 'bar') {
    const bw = Math.max((w - data.length + 1) / data.length, 1)
    data.forEach((v, i) => {
      const bh = Math.max(((v - min) / span) * (h - 2), 1)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.85
      ctx.fillRect(i * (bw + 1), h - bh, bw, bh)
    })
  } else if (props.style === 'spider') {
    const cx = w / 2
    const cy = h / 2
    const r = Math.min(w, h) / 2 - 1
    const n = Math.max(data.length, 3)
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = color
    ctx.beginPath()
    data.forEach((v, i) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2
      const rr = ((v - min) / span) * r
      const x = cx + rr * Math.cos(a)
      const y = cy + rr * Math.sin(a)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.globalAlpha = 0.3
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.stroke()
  } else {
    ctx.strokeStyle = color
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * (w - 2) + 1
      const y = h - 1 - ((v - min) / span) * (h - 2)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
    const last = data[data.length - 1]
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(
      ((data.length - 1) / Math.max(data.length - 1, 1)) * (w - 2) + 1,
      h - 1 - ((last - min) / span) * (h - 2),
      1.8,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }
}

watch(
  () => [props.data, props.style],
  () => nextTick(draw),
  { deep: true }
)
onMounted(draw)
</script>
