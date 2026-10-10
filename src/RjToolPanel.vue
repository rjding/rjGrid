<template>
  <div class="rj-panel">
    <div class="rj-panel-tabs">
      <div
        v-for="tb in tabs"
        :key="tb.k"
        class="rj-panel-tab"
        :class="{ 'is-active': tab === tb.k }"
        @click="tab = tb.k"
      >
        {{ tb.label }}
      </div>
    </div>
    <div class="rj-panel-body">
      <!-- 列管理 -->
      <template v-if="tab === 'cols'">
        <div class="rj-panel-section">{{ t('panelColsHint') }}</div>
        <div
          v-for="c in leafList"
          :key="c.colId"
          class="rj-panel-item"
          :class="{ 'is-pinned': !!c.pinned }"
          draggable="true"
          @dragstart="dragId = c.colId"
          @dragover.prevent="dragOver = c.colId"
          @drop="drop(c.colId)"
        >
          <span :style="{ opacity: c.hidden ? 0.4 : 1 }" class="rj-panel-item-title">{{
            c.title || c.colId
          }}</span>
          <span class="rj-panel-item-ops">
            <span v-if="c.pinned" class="rj-panel-pin-tag">{{
              c.pinned === 'right' ? t('pinTagRight') : t('pinTagLeft')
            }}</span>
            <span
              class="rj-panel-pin"
              :class="{ 'is-on': !!c.pinned }"
              :title="
                c.pinned === 'left'
                  ? t('pinnedLeft') + ' · ' + t('unpin')
                  : c.pinned === 'right'
                    ? t('pinnedRight') + ' · ' + t('unpin')
                    : t('pinColumn')
              "
              @click.stop="togglePinCol(c)"
              >{{ icons.pin }}</span
            >
            <span
              :title="c.hidden ? t('show') : t('hide')"
              @click.stop="$emit('toggle-hide', c.colId)"
              >{{ c.hidden ? icons.hidden : icons.visible }}</span
            >
          </span>
        </div>
      </template>

      <!-- 行分组 -->
      <template v-else-if="tab === 'group'">
        <div class="rj-panel-section">{{ t('groupHere') }}</div>
        <div
          class="rj-drop-banner"
          style="border: 1px dashed var(--rj-border-strong); height: 40px; margin-bottom: 8px"
          :class="{ 'is-over': overZone === 'group' }"
          @dragover.prevent="overZone = 'group'"
          @dragleave="overZone = ''"
          @drop="onDropTo('group', $event)"
        >
          {{ t('dragToGroup') }}
        </div>
        <div v-for="f in groupedFields" :key="f" class="rj-panel-item">
          <span class="rj-panel-item-title">{{ titleOf(f) }}</span>
          <span class="rj-panel-item-ops">
            <span :title="t('aggMode')" @click.stop="cycleAgg(f)">{{ aggOf(f) || '∑' }}</span>
            <span :title="t('remove')" @click.stop="$emit('group-remove', f)">{{
              icons.remove
            }}</span>
          </span>
        </div>
        <template v-if="groupableCols.length">
          <div class="rj-panel-section" style="margin-top: 10px">{{ t('groupAddMore') }}</div>
          <div
            v-for="c in groupableCols"
            :key="c.colId"
            class="rj-panel-item"
            style="cursor: pointer"
            @click="$emit('group-add', dimKey(c))"
          >
            <span class="rj-panel-item-title">{{ icons.add }} {{ c.title || c.colId }}</span>
          </div>
        </template>
      </template>

      <!-- 透视 -->
      <template v-else-if="tab === 'pivot'">
        <div class="rj-popup-row">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer">
            <input
              type="checkbox"
              :checked="pivot.active"
              @change="$emit('pivot-enable', ($event.target as HTMLInputElement).checked)"
            />
            {{ t('enablePivot') }}
          </label>
        </div>
        <div class="rj-panel-section">{{ t('pivotCols') }}</div>
        <div
          class="rj-drop-banner"
          :class="{ 'is-over': overZone === 'pv-col' }"
          style="border: 1px dashed var(--rj-border-strong); height: 32px; margin-bottom: 6px"
          @dragover.prevent="overZone = 'pv-col'"
          @dragleave="overZone = ''"
          @drop="onDropTo('pv-col', $event)"
        >
          {{ t('dragHere') }}
        </div>
        <div
          v-for="c in pivotableCols"
          :key="c.colId"
          class="rj-panel-item is-check"
          @click="$emit('pivot-toggle', 'cols', dimKey(c))"
        >
          <input type="checkbox" :checked="pivot.cols.includes(dimKey(c))" />
          <span class="rj-panel-item-title">{{ c.title || c.colId }}</span>
        </div>
        <div class="rj-panel-section" style="margin-top: 10px">{{ t('pivotVals') }}</div>
        <div
          v-for="c in valueCols"
          :key="c.colId"
          class="rj-panel-item is-check"
          @click="$emit('pivot-toggle', 'values', c.colId)"
        >
          <input type="checkbox" :checked="isValueOn(c)" />
          <span class="rj-panel-item-title"
            >{{ c.title || c.colId }} ({{ c.aggFunc || 'sum' }})</span
          >
        </div>
        <div class="rj-panel-section" style="margin-top: 10px">{{ t('pivotRowDims') }}</div>
      </template>

      <!-- 筛选集中管理 -->
      <template v-else-if="tab === 'filters'">
        <div v-if="quickFilter" class="rj-panel-item">
          <span class="rj-panel-item-title">{{ t('globalSearch', { v: quickFilter }) }}</span>
          <span class="rj-panel-item-ops">
            <span :title="t('clearShort')" @click.stop="$emit('quick-clear')">{{
              icons.remove
            }}</span>
          </span>
        </div>
        <div v-for="f in filters" :key="f.colId + ':' + f.kind" class="rj-panel-item">
          <span class="rj-panel-item-title">
            {{ f.title }}
            <span style="color: var(--rj-text-secondary)">
              ({{
                f.kind === 'float'
                  ? t('kindFloat')
                  : f.kind === 'advanced'
                    ? t('kindAdvanced')
                    : t('kindColumn')
              }}){{ f.text }}</span
            >
          </span>
          <span class="rj-panel-item-ops">
            <span :title="t('remove')" @click.stop="$emit('filter-remove', f.colId, f.kind)">{{
              icons.remove
            }}</span>
          </span>
        </div>
        <div v-if="!filters?.length && !quickFilter" class="rj-panel-section">
          {{ t('noFilters') }}
        </div>
        <div
          v-if="filters?.length || quickFilter"
          class="rj-panel-item"
          style="cursor: pointer; color: var(--rj-danger); justify-content: center"
          @click="$emit('filters-clear-all')"
        >
          <span class="rj-panel-item-title">{{ t('clearAllFilters') }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { RjColumn } from './types'
import { RJ_ICONS_KEY, mergeIcons } from './icons'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'

defineOptions({ name: 'RjToolPanel' })

export interface PanelLeaf {
  col: RjColumn
  colId: string
  field?: string
  title?: string
  hidden: boolean
  pinned: 'left' | 'right' | null
  aggFunc?: string
}

const props = defineProps<{
  leafList: PanelLeaf[]
  /**
   * 候选列（分组维 / 透视维 / 透视值）专用列源：应始终为用户真正声明的列。
   * 透视态下 leafList 会被引擎生成的 __pv* 列顶替，直接拿它做候选，
   * 用户可以把 `__pvrow0:kind` 再勾一次当透视维，把透视结果直接做塌。
   */
  pivotLeafList?: PanelLeaf[]
  /**
   * 默认「全部指标」隐式态下引擎真正生效的度量 colId 集。
   * 面板候选按类型列出所有数值列，隐式态却只聚合已声明 aggFunc 的那几项，
   * 不拿这份基线画勾选态，会把未生效项也显示成已勾选。
   */
  pivotValueDefault?: string[]
  groupedFields: string[]
  pivot: { cols: string[]; values: string[]; active: boolean }
  filters?: {
    colId: string
    kind: 'column' | 'float' | 'advanced'
    title: string
    text: string
  }[]
  quickFilter?: string
}>()

const emit = defineEmits<{
  (e: 'toggle-hide', colId: string): void
  (e: 'toggle-pin', colId: string, pin: 'left' | 'right' | null): void
  (e: 'col-drop', from: string, to: string): void
  (e: 'group-add', field: string): void
  (e: 'group-remove', field: string): void
  (e: 'group-drop', colId: string): void
  (e: 'pivot-enable', v: boolean): void
  (e: 'pivot-toggle', which: 'cols' | 'values', key: string): void
  (e: 'pivot-drop', colId: string): void
  (e: 'set-agg', field: string, agg: string | undefined): void
  (e: 'filter-remove', colId: string, kind: 'column' | 'float' | 'advanced'): void
  (e: 'filters-clear-all'): void
  (e: 'quick-clear'): void
}>()

const tabs = computed(() => [
  { k: 'cols' as const, label: t('tabColumns') },
  { k: 'group' as const, label: t('tabGroup') },
  { k: 'pivot' as const, label: t('tabPivot') },
  { k: 'filters' as const, label: t('tabFilter') }
])
// 图标（由网格根 provide，默认字形兑底）
const icons = inject(
  RJ_ICONS_KEY,
  computed(() => mergeIcons())
)
const t = inject(RJ_LOCALE_KEY, defaultTranslate)
const tab = ref<'cols' | 'group' | 'pivot' | 'filters'>('cols')
const dragId = ref('')
const dragOver = ref('')
const overZone = ref('')

/**
 * 维度/度量定位键：表达式列可能只声明 colId 没有 field，
 * 拿 `c.field &&` 做候选门槛会把整列屏蔽掉，面板勾选态从此跟不上引擎生效集。
 */
const dimKey = (c: PanelLeaf) => c.field || c.colId

/** 候选列源：优先用声明列，并过滤掉任何透视生成列（__pv*） */
const candLeaves = computed(() => {
  const base =
    props.pivotLeafList && props.pivotLeafList.length ? props.pivotLeafList : props.leafList
  return base.filter(
    (c) => !String(c.colId).startsWith('__pv') && !String(c.field ?? '').startsWith('__pv')
  )
})

const groupableCols = computed(() =>
  candLeaves.value.filter(
    (c) =>
      !c.col.checkbox &&
      !c.col.rowDrag &&
      !props.groupedFields.includes(dimKey(c)) &&
      !props.pivot.cols.includes(dimKey(c))
  )
)
const pivotableCols = computed(() =>
  candLeaves.value.filter(
    (c) =>
      c.col.allowPivot !== false &&
      !props.groupedFields.includes(dimKey(c)) &&
      (c.col.type === 'text' || c.col.type === 'boolean' || !c.col.type || c.col.type === 'link')
  )
)
const valueCols = computed(() =>
  candLeaves.value.filter(
    (c) =>
      c.col.type === 'num' || c.col.type === 'money' || c.col.type === 'percent' || !!c.col.aggFunc
  )
)

const valueDefaultSet = computed(() => new Set(props.pivotValueDefault || []))
/** 度量勾选态：显式态按已勾项，隐式「全部指标」态按引擎真正生效的那几项 */
function isValueOn(c: PanelLeaf) {
  return props.pivot.values.length
    ? props.pivot.values.includes(c.colId)
    : valueDefaultSet.value.has(c.colId)
}

const titleOf = (f: string) =>
  candLeaves.value.find((c) => c.field === f || c.colId === f)?.title ||
  props.leafList.find((c) => c.field === f || c.colId === f)?.title ||
  f
const aggOf = (f: string) => {
  const c = candLeaves.value.find((x) => x.field === f)
  const a = c?.aggFunc
  return a ? { sum: '∑', avg: 'x̄', min: '↓', max: '↑', count: '#' }[a as string] || a : ''
}

const AGG_CYCLE = ['sum', 'avg', 'min', 'max', 'count'] as const
function cycleAgg(f: string) {
  const cur = candLeaves.value.find((x) => x.field === f)?.aggFunc as
    | (typeof AGG_CYCLE)[number]
    | undefined
  const i = cur ? AGG_CYCLE.indexOf(cur) : -1
  const next = AGG_CYCLE[(i + 1) % AGG_CYCLE.length]
  emit('set-agg', f, next)
}

/**
 * 图钉点击：未冻结 → 冻结到左侧；已冻结 → 直接取消冻结。
 * 与列菜单「列」页签的 toggleColPin 保持同一语义（两处入口不能一个循环一个开关）。
 */
function togglePinCol(c: PanelLeaf) {
  emit('toggle-pin', c.colId, c.pinned ? null : 'left')
}

function drop(toId: string) {
  if (dragId.value && dragId.value !== toId) emit('col-drop', dragId.value, toId)
  dragId.value = ''
  dragOver.value = ''
}

function onDropTo(zone: 'group' | 'pv-col', e?: DragEvent) {
  overZone.value = ''
  // dragId 只在「列」页签条目自身 dragstart 时赋值；从表头拖过来时面板内拿不到它，
  // 不兼收 dataTransfer 的话，横幅上写的“拖列到此”就是个永远达不到目标的承诺。
  const id = dragId.value || e?.dataTransfer?.getData('text/x-rj-col') || ''
  if (!id) return
  if (zone === 'group') emit('group-drop', id)
  else emit('pivot-drop', id)
  dragId.value = ''
}
</script>
