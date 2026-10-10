<template>
  <div
    class="rj-cell"
    :class="cellClass"
    :style="[baseStyle, dynStyle]"
    :data-r="rowIndex"
    :data-c="colIndex"
    :role="drow.type === 'group' && isGroupAnchor ? 'rowheader' : 'gridcell'"
    :aria-colindex="colIndex + 1"
    :aria-selected="checked || undefined"
    :title="tooltipText"
  >
    <!-- 编辑态 -->
    <RjEditor
      v-if="editing"
      :column="leaf.col"
      :row="drow.data"
      :value="value"
      :row-index="rowIndex"
      @commit="$emit('edit-commit', $event)"
      @cancel="$emit('edit-cancel')"
    />

    <!-- 复选框列（合计行/钉行等非可选行不渲染选择框） -->
    <span
      v-else-if="leaf.col.checkbox && !drow.noDrag"
      class="rj-checkbox"
      :class="{ 'is-checked': checked, 'is-indeterminate': indeterminate }"
      @click.stop="$emit('toggle-check')"
    >
      <template v-if="checked">{{ icons.checked }}</template>
      <template v-else-if="indeterminate">{{ icons.indeterminate }}</template>
    </span>

    <!-- 行拖拽手柄（合计行/钉行不参与拖拽）；字形走 icons.rowDrag，可被宿主覆盖 -->
    <span
      v-else-if="leaf.col.rowDrag && !drow.noDrag"
      class="rj-row-drag-handle"
      @pointerdown.stop="$emit('row-drag-start', $event)"
      >{{ icons.rowDrag }}</span
    >

    <!-- 分组行：组值 + 展开/折叠 + 计数；页脚行：小计标签 -->
    <template v-else-if="drow.type === 'group' && isGroupAnchor">
      <span class="rj-indent" :style="{ width: drow.level * 18 + 'px' }"></span>
      <span
        v-if="!isPivot && !drow.isFooter && drow.expandable !== false"
        class="rj-expand-icon"
        @click.stop="$emit('toggle-expand', drow.key)"
      >
        {{ drow.expanded ? icons.collapse : icons.expand }}
      </span>
      <span v-else-if="!isPivot" class="rj-expand-icon" style="opacity: 0">{{
        icons.collapse
      }}</span>
      <span class="rj-cell-inner">
        <template v-if="drow.isFooter">{{ t('subtotal') }}</template>
        <template v-else>
          <RjSlotRender
            v-if="gridSlots?.['cell-' + leaf.colId]"
            :slots="gridSlots"
            :name="'cell-' + leaf.colId"
            :params="cellParams"
          />
          <template v-else>{{ groupLabel }}</template>
          <span style="color: var(--rj-text-secondary); margin-left: 6px"
            >({{ drow.data.__count }})</span
          >
        </template>
      </span>
    </template>

    <!-- 数据行 anchor 列：树缩进/展开 + 明细展开 -->
    <template v-else-if="isAnchor">
      <span class="rj-indent" :style="{ width: drow.level * 18 + 'px' }"></span>
      <span
        v-if="treeExpandable"
        class="rj-expand-icon"
        @click.stop="$emit('toggle-expand', drow.key)"
      >
        {{ drow.expanded ? icons.collapse : icons.expand }}
      </span>
      <span
        v-else-if="hasDetail"
        class="rj-expand-icon"
        @click.stop="$emit('toggle-detail', drow.key)"
      >
        {{ detailOpen ? icons.collapse : icons.expand }}
      </span>
      <span v-else style="width: 18px; display: inline-block; flex-shrink: 0"></span>
      <RjImgList v-if="imgUrls.length" v-bind="imgBind" @preview="onImgPreview" />
      <!-- 插槽 / cellRenderer：数据行同样按真 vnode 渲染（与分组行一致），见下方 cellSlot 注释 -->
      <span
        v-else-if="cellSlot || cellRendererFn"
        class="rj-cell-inner rj-cell-custom"
        :class="{ wrap: leaf.col.wrapText }"
      >
        <RjSlotRender
          v-if="gridSlots?.[cellSlot]"
          :slots="gridSlots"
          :name="cellSlot"
          :params="cellParams"
        />
        <RjFnRender v-else :render="cellRendererFn" :params="cellParams" />
      </span>
      <span
        v-else
        class="rj-cell-inner"
        :class="{ wrap: leaf.col.wrapText }"
        v-html="richContent"
      ></span>
    </template>

    <!-- 图片列：真实 <img> 节点（懒加载 + 失败回落 + 点击预览） -->
    <RjImgList v-else-if="imgUrls.length" v-bind="imgBind" @preview="onImgPreview" />

    <!-- 插槽 / cellRenderer：数据行同样按真 vnode 渲染（与分组行一致），见下方 cellSlot 注释 -->
    <span
      v-else-if="cellSlot || cellRendererFn"
      class="rj-cell-inner rj-cell-custom"
      :class="{ wrap: leaf.col.wrapText }"
    >
      <RjSlotRender
        v-if="gridSlots?.[cellSlot]"
        :slots="gridSlots"
        :name="cellSlot"
        :params="cellParams"
      />
      <RjFnRender v-else :render="cellRendererFn" :params="cellParams" />
    </span>

    <!-- 内置操作列（col.actions）：带边框按钮 + 超出列宽自动收入“更多▾”（插槽/cellRenderer 已接管则不叠加） -->
    <RjCellActions
      v-else-if="colActions.length"
      :actions="colActions"
      :params="cellParams"
      :width="width"
      :border="leaf.col.actionsBorder"
      :gap="leaf.col.actionsGap"
    />

    <!-- 迷你图（无自定义渲染时；插槽/cellRenderer 已接管该格则不出迷你图） -->
    <RjSparkline
      v-else-if="sparkData"
      :data="sparkData"
      :style="leaf.col.sparkline?.style || 'bar'"
      :color="leaf.col.sparkline?.color"
    />

    <!-- 常规内容 -->
    <span
      v-else
      class="rj-cell-inner"
      :class="{ wrap: leaf.col.wrapText }"
      v-html="richContent"
    ></span>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { RjCellParams, RjFindMatch, RjRowData } from './types'
import type { RjLeafCol } from './useColumnState'
import type { RjDisplayRow } from './useRowModel'
import RjEditor from './RjEditor.vue'
import RjImgList from './RjImgList.vue'
import RjSparkline from './RjSparkline.vue'
import RjCellActions from './RjCellActions.vue'
import RjSlotRender, { RjFnRender } from './RjSlotRender'
import { RJ_ICONS_KEY, mergeIcons } from './icons'
import { resolveColActions } from './cellActions'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'

defineOptions({ name: 'RjCell', inheritAttrs: false })

const props = defineProps<{
  leaf: RjLeafCol
  drow: RjDisplayRow
  rowIndex: number
  colIndex: number
  x: number
  width: number
  height: number
  /** rowSpan 跨行格的提升层级（普通格不传） */
  z?: number
  value: any
  checked?: boolean
  indeterminate?: boolean
  editing?: boolean
  flash?: boolean
  /** 脏格：当前值与初始值不一致（编辑未保存），显示角标 */
  dirty?: boolean
  treeExpandable?: boolean
  hasDetail?: boolean
  detailOpen?: boolean
  isAnchor?: boolean
  isGroupAnchor?: boolean
  /** 分组显示模式：singleColumn 时组锚单元格展示完整层级路径 */
  groupDisplay?: 'singleColumn' | 'multipleColumns'
  matches?: RjFindMatch[] | null
  activeMatch?: RjFindMatch | null
  gridSlots?: Record<string, any>
  display: string
}>()

const emit = defineEmits<{
  (e: 'edit-commit', v: any): void
  (e: 'edit-cancel'): void
  (e: 'toggle-check'): void
  (e: 'toggle-expand', key: string | number): void
  (e: 'toggle-detail', key: string | number): void
  (e: 'row-drag-start', ev: PointerEvent): void
  (e: 'img-preview', url: string): void
}>()

const cellParams = computed<RjCellParams>(() => ({
  value: props.value,
  row: props.drow.data,
  rowIndex: props.rowIndex,
  column: props.leaf.col,
  colIndex: props.colIndex
}))

// 图标（由网格根 provide，默认字形兑底）
const icons = inject(
  RJ_ICONS_KEY,
  computed(() => mergeIcons())
)
const t = inject(RJ_LOCALE_KEY, defaultTranslate)

const sparkData = computed<number[] | null>(() => {
  const cfg = props.leaf.col.sparkline
  if (!cfg || props.drow.type !== 'row') return null
  const raw = cfg.valueField ? (props.drow.data as any)[cfg.valueField] : props.value
  if (!Array.isArray(raw) || !raw.length) return null
  return raw.map((v: any) => Number(v) || 0)
})

const groupLabel = computed(() => {
  const labels = (props.drow.data as any).__groupLabels as any[] | undefined
  if (props.groupDisplay === 'singleColumn') {
    if (labels?.length)
      return labels.map((v) => (v === '' || v == null ? t('emptyVal') : String(v))).join(' / ')
  }
  // multipleColumns 下的组锚单元格取本级标签：__groupLabels 末项就是 __groupValue 的显示文本
  // （客户端分组已按被分组列的 formatter 转过，服务端分组由后端给），不能退回原始值，
  // 否则同一行会出现组标题「1」而单元格「目录」的双口径。__groupValue 仍保持原始值供键/跳转使用。
  const last = labels?.length ? labels[labels.length - 1] : props.drow.data.__groupValue
  return last === '' || last == null ? t('emptyVal') : String(last)
})

/** 透视聚合行：不做展开/折叠（各级小计与总计逐行平铺），隐藏失效的展开三角 */
const isPivot = computed(() => !!(props.drow.data as any).__pivot)

// 公式错误哨兵（formula.ts 以哨兵字符串传播）：命中则标红，便于定位坏公式/循环引用
const FX_ERRORS = ['#CIRCULAR!', '#REF!', '#VALUE!', '#NAME?', '#DIV/0!', '#NUM!', '#N/A']
const isFxError = computed(
  () => props.drow.type === 'row' && FX_ERRORS.includes(String(props.display ?? '').trim())
)

const baseStyle = computed(() => ({
  left: props.x + 'px',
  width: props.width + 'px',
  height: props.height + 'px',
  lineHeight: props.height + 'px',
  zIndex: props.z
}))

const align = computed(() => {
  const c = props.leaf.col
  if (c.align) return c.align
  if (c.type === 'num' || c.type === 'money' || c.type === 'percent') return 'right'
  if (c.type === 'boolean') return 'center'
  return 'left'
})

const dynStyle = computed(() => {
  const c = props.leaf.col
  const st: Record<string, any> = {}
  if (typeof c.cellStyle === 'function') Object.assign(st, c.cellStyle(cellParams.value) || {})
  else if (c.cellStyle) Object.assign(st, c.cellStyle)
  return st
})

const cellClass = computed(() => {
  const c = props.leaf.col
  const cls: Record<string, boolean> = {
    ['rj-cell-' + align.value]: true,
    'is-editing': !!props.editing,
    'is-dirty': !!props.dirty,
    'rj-cell-link': c.type === 'link',
    'rj-cell-img': c.type === 'image',
    // 公式错误格（含循环引用）标红
    'is-fx-err': isFxError.value,
    // 拖拽列：手柄撑满整格作 grab 热区（否则字形仅占列宽一小部分，点列中央拖不动）
    'rj-cell-drag': !!c.rowDrag && !props.drow.noDrag
  }
  if (typeof c.cellClass === 'function') {
    String(c.cellClass(cellParams.value) || '')
      .split(' ')
      .filter(Boolean)
      .forEach((x) => (cls[x] = true))
  } else if (typeof c.cellClass === 'string') {
    c.cellClass
      .split(' ')
      .filter(Boolean)
      .forEach((x) => (cls[x] = true))
  }
  return cls
})

const tooltipText = computed(() => {
  const t = props.leaf.col.tooltip
  // 图片列默认 tooltip 用格式化后的可读文本（而非 data URI 全文）
  if (!t) return imgUrls.value.length ? props.display || undefined : undefined
  return typeof t === 'function' ? t(cellParams.value) : t
})

/** 插槽/渲染函数优先，否则富文本（查找高亮 + link/image 预设） */
const slotName = computed(() => 'cell-' + props.leaf.colId)
/**
 * 单元格自定义内容的两条真 vnode 通道（插槽优先于 cellRenderer，与手册 §11 的承诺一致）。
 * 旧实现把宿主插槽/cellRenderer 的 vnode 在渲染期 mount 到游离 div、取 innerHTML 后立刻
 * unmount，只留字符串快照给 v-html：SFC 编译产物有 block/_cache，会复用同一批 vnode 对象，
 * 被 unmount 后 vnode.component 置 null，下一次 keyed diff 命中 shouldUpdateComponent 读
 * null.emitsOptions 即抛 TypeError（悬停换行时最易触发）；字符串快照还丢掉事件绑定，并把组件
 * 卡在过渡起始态（宽 0 / 透明）导致内容看不见。故插槽/cellRenderer 一律走真 vnode，
 * v-html 只留给纯文本的查找高亮与 link 预设。
 */
const cellSlot = computed(() => (props.gridSlots?.[slotName.value] ? slotName.value : ''))
const cellRendererFn = computed(() => (cellSlot.value ? undefined : props.leaf.col.cellRenderer))
/** 内置操作列按钮组（插槽/cellRenderer 优先；合计行/钉行是合成行，不渲染按钮）——判定见 resolveColActions 纯函数 */
const colActions = computed(() =>
  resolveColActions(props.leaf.col.actions, {
    overridden: !!cellSlot.value || !!props.leaf.col.cellRenderer,
    pinned: props.drow.pinned
  })
)

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const richContent = computed(() => {
  const text = props.display ?? ''
  if (text === '') return ''
  let html = esc(String(text))
  // 查找高亮
  if (props.matches?.length) {
    const segs: string[] = []
    let last = 0
    props.matches.forEach((m) => {
      segs.push(html.slice(last, m.start))
      const isCur = props.activeMatch && props.activeMatch.start === m.start
      segs.push(
        `<span class="${isCur ? 'rj-find-current' : 'rj-find-hit'}">${html.slice(m.start, m.end)}</span>`
      )
      last = m.end
    })
    segs.push(html.slice(last))
    html = segs.join('')
  }
  const c = props.leaf.col
  if (c.type === 'link') html = `<a href="javascript:void(0)">${html}</a>`
  return html
})

// ---------------- 图片单元格（type: 'image'） ----------------
/** 地址列表：插槽 / cellRenderer 优先则不叠加内置渲染；多值用数组或 | 分隔（不按逗号切，避免拆坏 data URI） */
const imgUrls = computed<string[]>(() => {
  const c = props.leaf.col
  if (c.type !== 'image') return []
  const cfg = c.image || {}
  if (cellSlot.value || c.cellRenderer) return []
  const raw = cfg.src ? cfg.src(cellParams.value) : props.value
  if (raw == null || raw === '') return []
  const list = Array.isArray(raw) ? raw : String(raw).split(/[|\n]/)
  const limit = cfg.max && cfg.max > 0 ? cfg.max : Array.isArray(raw) ? 3 : 1
  return list
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, limit)
})

const imgBind = computed(() => {
  const cfg = props.leaf.col.image || {}
  const size = cfg.size && cfg.size > 0 ? cfg.size : 24
  const title = props.leaf.col.title
  return {
    urls: imgUrls.value,
    style: {
      width: (cfg.width && cfg.width > 0 ? cfg.width : size) + 'px',
      height: (cfg.height && cfg.height > 0 ? cfg.height : size) + 'px'
    },
    shape: cfg.shape || 'rounded',
    lazy: cfg.lazy !== false,
    alt: cfg.alt ?? (typeof title === 'string' ? title : ''),
    fallback: cfg.fallback !== undefined ? cfg.fallback : props.display || ''
  }
})

function onImgPreview(url: string) {
  if ((props.leaf.col.image || {}).preview === false) return
  emit('img-preview', url)
}

void ({} as RjRowData)
</script>
