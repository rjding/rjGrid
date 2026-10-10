<template>
  <div
    class="rj-header-main"
    :style="{ width: totalWidth + 'px', transform: `translateX(${-scrollLeft}px)` }"
  >
    <div
      v-for="(level, li) in levelCells"
      :key="li"
      class="rj-hrow"
      role="row"
      :style="{ height: headerRowHeight + 'px', position: 'relative' }"
    >
      <div
        v-for="cell in level"
        :key="cell.colId"
        class="rj-hcell"
        role="columnheader"
        :aria-sort="ariaSortOf(cell)"
        :class="{
          'is-sortable': cellSortable(cell),
          'is-dragging': !!dragCol && dragCol === cell.colId,
          'is-dragover': !!dragOverCol && dragOverCol === cell.colId,
          [cell.col.headerClass || '']: !!cell.col.headerClass
        }"
        :style="{
          left: cell.x + 'px',
          width: cell.width + 'px',
          top: 0,
          bottom: 0,
          position: 'absolute',
          justifyContent: headerAlignOf(cell)
        }"
        :draggable="!cell.isGroup && reorderable"
        @click="onCellClick(cell, $event)"
        @dragstart="onDragStart(cell, $event)"
        @dragover="onDragOver(cell, $event)"
        @dragleave="dragOverCol = ''"
        @drop="onDrop(cell, $event)"
        @dragend="dragCol = ''"
      >
        <span class="rj-hcell-title" :title="headerTip(cell)">
          <span
            v-if="cell.col.checkbox"
            class="rj-checkbox"
            :class="{ 'is-checked': headerChecked, 'is-indeterminate': headerIndeterminate }"
            @click.stop="$emit('toggle-check-all')"
          >
            <template v-if="headerChecked">{{ icons.checked }}</template>
            <template v-else-if="headerIndeterminate">{{ icons.indeterminate }}</template>
          </span>
          <template v-else-if="cell.col.rowDrag">{{ icons.rowDrag }}</template>
          <RjSlotRender
            v-else-if="gridSlots?.['header-' + cell.colId]"
            :slots="gridSlots"
            :name="'header-' + cell.colId"
            :params="{ column: cell.col }"
          />
          <template v-else>{{ cell.col.title || cell.colId }}</template>
        </span>
        <span class="rj-hcell-icons">
          <span
            v-if="cellSortable(cell)"
            class="rj-sort-icon"
            :class="{ 'is-active': !!sortDir(cell) }"
          >
            {{
              sortDir(cell) === 'asc'
                ? icons.sortAscending
                : sortDir(cell) === 'desc'
                  ? icons.sortDescending
                  : icons.sortUnSort
            }}
          </span>
          <span
            v-if="filterable(cell)"
            class="rj-filter-icon"
            :class="{ 'is-active': filterActive(cell) }"
            :title="t('filter')"
            @click.stop="$emit('open-filter', cell, $event)"
            >{{ icons.filter }}</span
          >
          <span
            v-if="!cell.isGroup && !cell.col.suppressMenu"
            class="rj-menu-btn"
            :title="t('colMenu')"
            @click.stop="$emit('header-menu', cell, $event)"
            >{{ icons.columnMenu }}</span
          >
        </span>
        <span
          v-if="!cell.isGroup && reorderable"
          class="rj-resize-handle"
          @pointerdown.stop
          @click.stop
          @mousedown.stop.prevent="startResize(cell, $event)"
          @dblclick.stop="autoWidth(cell)"
        ></span>
      </div>
    </div>
    <!-- 浮动筛选行 -->
    <div
      v-if="floating"
      class="rj-hrow rj-frow"
      :style="{ height: filterRowHeight + 'px', position: 'relative' }"
    >
      <div
        v-for="leaf in allLeaves"
        :key="'f' + leaf.colId"
        class="rj-fcell"
        :style="{ left: leaf.x + 'px', width: leaf.width + 'px' }"
      >
        <input
          v-if="floatFilterable(leaf.col)"
          class="rj-input rj-finput"
          :value="floatValues?.[leaf.colId] || ''"
          :placeholder="floatPh(leaf.col)"
          @click.stop
          @pointerdown.stop
          @keydown.stop
          @compositionstart="composing = true"
          @compositionend="onFloatCompositionEnd(leaf.colId, $event)"
          @input="onFloatInputGuarded(leaf.colId, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { RjColumn } from './types'
import type { RjLeafCol } from './useColumnState'
import { RJ_ICONS_KEY, mergeIcons } from './icons'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import RjSlotRender from './RjSlotRender'

defineOptions({ name: 'RjHeader' })

export interface HeaderLevelCell {
  col: RjColumn
  colId: string
  title?: string
  x: number
  width: number
  isGroup: boolean
  leafCol?: RjLeafCol
}

const props = defineProps<{
  levelCells: HeaderLevelCell[][]
  totalWidth: number
  scrollLeft: number
  headerRowHeight: number
  sortStates: { field: string; dir: string }[]
  activeFilters: string[]
  reorderable?: boolean
  gridSlots?: Record<string, any>
  allLeaves: RjLeafCol[]
  headerChecked?: boolean
  headerIndeterminate?: boolean
  /** 浮动筛选行 */
  floating?: boolean
  floatValues?: Record<string, string>
  filterRowHeight?: number
}>()

const emit = defineEmits<{
  (e: 'sort', colId: string, field: string | undefined, additive: boolean): void
  (e: 'open-filter', cell: HeaderLevelCell, el: MouseEvent): void
  (e: 'header-menu', cell: HeaderLevelCell, ev: MouseEvent): void
  (e: 'resize', colId: string, width: number, done: boolean): void
  (e: 'col-drop', dragId: string, targetId: string): void
  (e: 'col-draggroup', dragId: string, ev: DragEvent): void
  (e: 'auto-width', colId: string): void
  (e: 'toggle-check-all'): void
  (e: 'float-filter', colId: string, value: string): void
}>()

const dragCol = ref('')
const dragOverCol = ref('')
// 图标（由网格根 provide，默认字形兑底）
const icons = inject(
  RJ_ICONS_KEY,
  computed(() => mergeIcons())
)
const t = inject(RJ_LOCALE_KEY, defaultTranslate)

function cellSortable(cell: HeaderLevelCell) {
  return !cell.isGroup && cell.col.sortable !== false && !cell.col.suppressSort && !!cell.col.field
}
function filterable(cell: HeaderLevelCell) {
  return (
    !cell.isGroup &&
    cell.col.filter !== false &&
    !!cell.col.field &&
    !cell.col.checkbox &&
    !cell.col.rowDrag
  )
}
function filterActive(cell: HeaderLevelCell) {
  return props.activeFilters.includes(cell.colId)
}

// ---------------- 浮动筛选 ----------------
function floatType(col: RjColumn): string {
  if (typeof col.filter === 'string') return col.filter
  if (col.type === 'num' || col.type === 'money' || col.type === 'percent') return 'number'
  if (col.type === 'date' || col.type === 'datetime') return 'date'
  return 'text'
}
function floatFilterable(col: RjColumn) {
  return (
    col.filter !== false &&
    !!col.field &&
    !col.checkbox &&
    !col.rowDrag &&
    !col.children?.length &&
    col.type !== 'image'
  )
}
function floatPh(col: RjColumn) {
  const t2 = floatType(col)
  if (t2 === 'number') return t('phNumber')
  if (t2 === 'date') return t('phDate')
  return t('phFilter')
}
function onFloatInput(colId: string, value: string) {
  emit('float-filter', colId, value)
}
// IME 组合输入（中文/日文拼字）期间不 emit，避免父层回写 :value 打断组合；结束后再提交
const composing = ref(false)
function onFloatInputGuarded(colId: string, value: string) {
  if (composing.value) return
  onFloatInput(colId, value)
}
function onFloatCompositionEnd(colId: string, e: Event) {
  composing.value = false
  onFloatInput(colId, (e.target as HTMLInputElement).value)
}
function sortDir(cell: HeaderLevelCell): string {
  if (!cell.col.field) return ''
  const s = props.sortStates.find((x) => x.field === cell.colId || x.field === cell.col.field)
  return s?.dir || ''
}
function headerAlignOf(cell: HeaderLevelCell) {
  const a = cell.col.headerAlign || cell.col.align
  return a === 'center' ? 'center' : a === 'right' ? 'flex-end' : 'flex-start'
}

/** 列头 tooltip：默认给出列标题，窄列被 `…` 截断时仍可见全名（分组表头同样适用） */
function headerTip(cell: HeaderLevelCell): string {
  const c = cell.col
  if (c.headerTooltip !== undefined) return c.headerTooltip
  if (c.checkbox || c.rowDrag) return ''
  return String(c.title ?? '')
}

/** 无障碍：排序语义 */
function ariaSortOf(cell: HeaderLevelCell): 'ascending' | 'descending' | 'none' | undefined {
  if (!cellSortable(cell)) return undefined
  const d = sortDir(cell)
  return d === 'asc' ? 'ascending' : d === 'desc' ? 'descending' : 'none'
}

/** 最近一次拖列宽结束的时间戳：用于吞掉拖拽后浏览器补发的 click，避免误排序 */
let lastResizeEnd = 0
function onCellClick(cell: HeaderLevelCell, e: MouseEvent) {
  // 拖拽列宽后浏览器会补发一个 click（mousedown 已在 handle 上 stop/prevent，但 click 仍会冒泡到单元格）；
  // 刚结束拖拽的短暂窗口内吞掉该 click，避免"只拖列宽却误触发排序"。
  if (Date.now() - lastResizeEnd < 250) return
  if (!cellSortable(cell)) return
  emit('sort', cell.colId, cell.col.field, e.shiftKey)
}

// ---------------- 列宽调整 ----------------

function startResize(cell: HeaderLevelCell, e: MouseEvent) {
  const startX = e.clientX
  const startW = cell.width
  const move = (ev: MouseEvent) => {
    emit('resize', cell.colId, startW + ev.clientX - startX, false)
  }
  const up = (ev: MouseEvent) => {
    emit('resize', cell.colId, startW + ev.clientX - startX, true)
    lastResizeEnd = Date.now()
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseup', up)
  }
  document.addEventListener('mousemove', move)
  document.addEventListener('mouseup', up)
}

function autoWidth(cell: HeaderLevelCell) {
  emit('auto-width', cell.colId)
}

// ---------------- 列拖拽换序 / 拖入分组面板 ----------------

function onDragStart(cell: HeaderLevelCell, e: DragEvent) {
  if (cell.isGroup) return
  dragCol.value = cell.colId
  e.dataTransfer!.effectAllowed = 'copyMove'
  e.dataTransfer!.setData('text/x-rj-col', cell.colId)
}

function onDragOver(cell: HeaderLevelCell, e: DragEvent) {
  if (!dragCol.value || dragCol.value === cell.colId || cell.isGroup) return
  dragOverCol.value = cell.colId
  e.preventDefault()
}

function onDrop(cell: HeaderLevelCell, e: DragEvent) {
  e.preventDefault()
  if (dragCol.value && !cell.isGroup) emit('col-drop', dragCol.value, cell.colId)
  dragCol.value = ''
  dragOverCol.value = ''
}
</script>
