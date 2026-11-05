<template>
  <div ref="containerRef" class="rj-cell-actions" :style="{ gap: gap + 'px' }">
    <button
      v-for="(a, i) in inlineActions"
      :key="a.name + '@' + i"
      type="button"
      class="rj-act-btn"
      :class="{
        'is-danger': a.danger,
        'is-text': !borderOf(a),
        'is-disabled': evalFlag(a.disabled, a)
      }"
      :disabled="evalFlag(a.disabled, a)"
      @pointerdown.stop
      @click.stop="run(a)"
    >
      <span v-if="a.icon" class="rj-act-ico">{{ a.icon }}</span>
      <span v-if="a.label">{{ a.label }}</span>
    </button>
    <button
      v-if="overflowActions.length"
      ref="moreRef"
      type="button"
      class="rj-act-btn rj-act-more"
      title="更多"
      @pointerdown.stop
      @click.stop="openMore"
    >
      ⋯
    </button>
    <!-- 隐藏测量层：容纳全部可见动作 + 一个“更多”样本，量出各自自然宽以决定放得下的数量（不参交互、不可见） -->
    <div ref="measureRef" class="rj-act-measure" aria-hidden="true">
      <button
        v-for="(a, i) in shownActions"
        :key="'m' + a.name + '@' + i"
        type="button"
        class="rj-act-btn"
        :class="{ 'is-danger': a.danger, 'is-text': !borderOf(a) }"
      >
        <span v-if="a.icon" class="rj-act-ico">{{ a.icon }}</span>
        <span v-if="a.label">{{ a.label }}</span>
      </button>
      <button type="button" class="rj-act-btn rj-act-more">⋯</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { RjCellAction, RjCellParams } from './types'
import { RJ_CELL_ACTIONS_KEY, computeInlineCount, filterVisibleActions } from './cellActions'

defineOptions({ name: 'RjCellActions', inheritAttrs: false })

const props = defineProps<{
  actions: RjCellAction[]
  params: RjCellParams
  /** 列宽（px）：决定能放下几个按钮 */
  width: number
  /** 列级默认描边（默认 true） */
  border?: boolean
  /** 按钮间距（px，默认 4） */
  gap?: number
}>()

const host = inject(RJ_CELL_ACTIONS_KEY, null)

const gap = computed(() => (props.gap == null ? 4 : props.gap))

/** 按 visible 过滤后的动作（决定参行与入菜单的候选集）：visible 缺省=可见，见 filterVisibleActions */
const shownActions = computed(() => filterVisibleActions(props.actions, ctxOf))

function ctxOf(a: RjCellAction) {
  return { ...props.params, action: a }
}
/** 布尔直通；函数按当前行求值。def 为函数缺位时的返回值（visible 缺位=显示，disabled 缺位=不禁用） */
function evalFlag(
  v: boolean | ((c: any) => boolean) | undefined,
  a: RjCellAction,
  def = false
): boolean {
  if (v == null) return def
  return typeof v === 'function' ? !!v(ctxOf(a)) : !!v
}
function borderOf(a: RjCellAction) {
  return a.border == null ? props.border !== false : a.border
}

const containerRef = ref<HTMLElement | null>(null)
const moreRef = ref<HTMLElement | null>(null)
const measureRef = ref<HTMLElement | null>(null)
/** 能inline放下的按钮数量，其余收进“更多” */
const inlineCount = ref(shownActions.value.length)

const inlineActions = computed(() => shownActions.value.slice(0, inlineCount.value))
const overflowActions = computed(() => shownActions.value.slice(inlineCount.value))

/** 量出各按钮自然宽，交给纯函数 computeInlineCount 算出容器内能放下的数量 */
function computeFit() {
  const cont = containerRef.value
  const measure = measureRef.value
  const n = shownActions.value.length
  if (!cont || !measure) {
    inlineCount.value = n
    return
  }
  const kids = Array.from(measure.children) as HTMLElement[]
  const moreW = kids.length ? kids[kids.length - 1].offsetWidth : 0
  const btnW = kids.slice(0, n).map((el) => el.offsetWidth)
  inlineCount.value = computeInlineCount(btnW, moreW, gap.value, cont.clientWidth)
}

function remeasure() {
  nextTick(() => computeFit())
}

let ro: ResizeObserver | null = null
onMounted(() => {
  remeasure()
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    ro = new ResizeObserver(remeasure)
    ro.observe(containerRef.value)
  }
})
onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

watch(
  () => [props.width, shownActions.value.length] as const,
  remeasure
)

function run(a: RjCellAction) {
  if (evalFlag(a.disabled, a)) return
  host?.run(a, props.params)
}
function openMore() {
  const el = moreRef.value
  if (el && host) host.openOverflow(el, overflowActions.value, props.params)
}
</script>
