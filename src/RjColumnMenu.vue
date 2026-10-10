<template>
  <div
    class="rj-colmenu"
    :style="{ left: clampX + 'px', top: clampY + 'px' }"
    @click.stop
    @mousedown.stop
  >
    <div class="rj-colmenu-tabs">
      <div
        v-for="tb in visibleTabs"
        :key="tb.k"
        class="rj-colmenu-tab"
        :class="{ 'is-active': tab === tb.k }"
        @click="tab = tb.k"
      >
        <span class="rj-colmenu-tab-ic">{{ tb.icon }}</span
        >{{ tb.label }}
      </div>
    </div>
    <div class="rj-colmenu-body">
      <!-- 通用 -->
      <template v-if="tab === 'general'">
        <div class="rj-colmenu-title">{{ col.title || colId }}</div>
        <template v-if="canSort">
          <div class="rj-colmenu-item" @click="pick(() => $emit('sort', 'asc'))">
            <span class="rj-colmenu-ic">{{ icons.sortAscending }}</span
            >{{ t('sortAsc') }}
            <span v-if="sortDir === 'asc'" class="rj-colmenu-cur">{{ icons.checked }}</span>
          </div>
          <div class="rj-colmenu-item" @click="pick(() => $emit('sort', 'desc'))">
            <span class="rj-colmenu-ic">{{ icons.sortDescending }}</span
            >{{ t('sortDesc') }}
            <span v-if="sortDir === 'desc'" class="rj-colmenu-cur">{{ icons.checked }}</span>
          </div>
          <div class="rj-colmenu-item" @click="pick(() => $emit('sort', null))">
            <span class="rj-colmenu-ic">{{ icons.sortUnSort }}</span
            >{{ t('sortUnsort') }}
          </div>
          <div class="rj-colmenu-divider"></div>
        </template>
        <div class="rj-colmenu-item" @click="pick(() => $emit('select'))">{{
          t('selectColumn')
        }}</div>
        <div class="rj-colmenu-item" @click="pick(() => $emit('autosize'))">{{
          t('autosize')
        }}</div>
        <div class="rj-colmenu-divider"></div>
        <!-- 冻结两项报的是生效冻结（pinOf：用户三态覆盖 ?? 列定义 fixed）：生效项打勾并标记行，
             再点同一项语义转为「取消冻结」，不做重复钉同一侧的空操作；与「列」页签图钉同一口径 -->
        <div
          class="rj-colmenu-item"
          :class="{ 'is-active': pinned === 'left' }"
          :title="pinned === 'left' ? t('pinnedLeft') + ' · ' + t('unpin') : ''"
          @click="pick(() => toggleGeneralPin('left'))"
        >
          <span class="rj-colmenu-ic">{{ icons.pin }}</span
          >{{ t('pinLeft') }}
          <span v-if="pinned === 'left'" class="rj-colmenu-cur">{{ icons.checked }}</span>
        </div>
        <div
          class="rj-colmenu-item"
          :class="{ 'is-active': pinned === 'right' }"
          :title="pinned === 'right' ? t('pinnedRight') + ' · ' + t('unpin') : ''"
          @click="pick(() => toggleGeneralPin('right'))"
        >
          <span class="rj-colmenu-ic">{{ icons.pin }}</span
          >{{ t('pinRight') }}
          <span v-if="pinned === 'right'" class="rj-colmenu-cur">{{ icons.checked }}</span>
        </div>
        <!-- 没冻结时不给「取消冻结」入口（否则点下去只是白写一条 null 覆盖） -->
        <div v-if="pinned" class="rj-colmenu-item" @click="pick(() => $emit('pin', null))">{{
          t('unpin')
        }}</div>
        <div class="rj-colmenu-item" @click="pick(() => $emit('hide'))">
          <span class="rj-colmenu-ic">{{ icons.hidden }}</span
          >{{ t('hideColumn') }}
        </div>
        <template v-if="canGroup">
          <div class="rj-colmenu-divider"></div>
          <div class="rj-colmenu-item" @click="pick(() => $emit('group'))">{{ t('groupBy') }}</div>
        </template>
      </template>

      <!-- 筛选 -->
      <template v-else-if="tab === 'filter'">
        <RjFilterMenu
          inline
          :column="col"
          :filter-type="filterType"
          :model="filterModel"
          :unique-values="uniqueValues"
          @apply="(m: any) => $emit('apply-filter', m)"
          @clear="$emit('clear-filter')"
          @advanced="$emit('advanced')"
        />
      </template>

      <!-- 列 -->
      <template v-else-if="tab === 'columns'">
        <div class="rj-colmenu-title">{{ t('columnsCount', { n: columns.length }) }}</div>
        <div class="rj-colmenu-draghint">{{ t('colDragHint') }}</div>
        <div class="rj-colmenu-list">
          <div
            v-for="c in columns"
            :key="c.colId"
            class="rj-colmenu-col"
            :class="{
              'is-dragover': dragOverId === c.colId && dragId !== c.colId,
              'is-pinned': !!c.pinned
            }"
            draggable="true"
            @dragstart="onColDragStart(c.colId, $event)"
            @dragover.prevent="dragOverId = c.colId"
            @dragleave="dragOverId === c.colId && (dragOverId = '')"
            @drop.prevent="onColDrop(c.colId)"
            @dragend="onColDragEnd"
          >
            <span class="rj-colmenu-grip" title="">{{ icons.rowDrag }}</span>
            <span
              class="rj-colmenu-eye"
              :title="c.hidden ? t('show') : t('hide')"
              @click="$emit('toggle-col-hide', c.colId)"
              >{{ c.hidden ? icons.hidden : icons.visible }}</span
            >
            <span class="rj-colmenu-col-name" :style="{ opacity: c.hidden ? 0.45 : 1 }">{{
              c.title
            }}</span>
            <span
              v-if="c.pinned"
              class="rj-colmenu-pin-tag"
              :class="{ 'is-right': c.pinned === 'right' }"
              >{{ c.pinned === 'right' ? t('pinTagRight') : t('pinTagLeft') }}</span
            >
            <span
              class="rj-colmenu-pin"
              :class="{ 'is-on': !!c.pinned }"
              :title="
                c.pinned === 'left'
                  ? t('pinnedLeft') + ' · ' + t('unpin')
                  : c.pinned === 'right'
                    ? t('pinnedRight') + ' · ' + t('unpin')
                    : t('pinColumn')
              "
              @click="toggleColPin(c)"
              >{{ icons.pin }}</span
            >
          </div>
        </div>
        <div class="rj-colmenu-foot">
          <a @click="setAll(true)">{{ t('showAll') }}</a>
          <a @click="setAll(false)">{{ t('hideAll') }}</a>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { RjColumn, RjFilterModel } from './types'
import { RJ_ICONS_KEY, mergeIcons } from './icons'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import RjFilterMenu from './RjFilterMenu.vue'

defineOptions({ name: 'RjColumnMenu' })

interface ColMenuItem {
  colId: string
  title: string
  hidden: boolean
  pinned: 'left' | 'right' | null
}

const props = withDefaults(
  defineProps<{
    col: RjColumn
    colId: string
    x: number
    y: number
    canSort?: boolean
    canFilter?: boolean
    canGroup?: boolean
    sortDir?: 'asc' | 'desc' | null
    /** 本列的生效冻结（父级用 colState.pinOf 传入，不是只看用户覆盖，否则列定义 fixed 的列不亮） */
    pinned?: 'left' | 'right' | null
    filterType?: 'text' | 'number' | 'date' | 'select'
    filterModel?: RjFilterModel | null
    uniqueValues?: any[]
    columns: ColMenuItem[]
  }>(),
  {
    canSort: false,
    canFilter: false,
    canGroup: false,
    sortDir: null,
    pinned: null,
    filterType: 'text',
    filterModel: null,
    uniqueValues: () => []
  }
)

const emit = defineEmits<{
  (e: 'sort', dir: 'asc' | 'desc' | null): void
  (e: 'select'): void
  (e: 'autosize'): void
  (e: 'pin', pos: 'left' | 'right' | null): void
  (e: 'hide'): void
  (e: 'group'): void
  (e: 'apply-filter', model: RjFilterModel): void
  (e: 'clear-filter'): void
  (e: 'advanced'): void
  (e: 'toggle-col-hide', colId: string): void
  (e: 'toggle-col-pin', colId: string, pin: 'left' | 'right' | null): void
  (e: 'col-drop', from: string, to: string): void
}>()

const icons = inject(
  RJ_ICONS_KEY,
  computed(() => mergeIcons())
)
const t = inject(RJ_LOCALE_KEY, defaultTranslate)
const tab = ref<'general' | 'filter' | 'columns'>('general')

const tabs = computed(() => {
  const list: { k: 'general' | 'filter' | 'columns'; label: string; icon: string }[] = [
    { k: 'general', label: t('tabGeneral'), icon: icons.value.menuGeneral }
  ]
  if (props.canFilter)
    list.push({ k: 'filter', label: t('tabFilter'), icon: icons.value.menuFilter })
  list.push({ k: 'columns', label: t('tabColumns'), icon: icons.value.menuColumns })
  return list
})
const visibleTabs = tabs

// 防溢出：贴近视口右缘时左移，贴近下缘时上提
const clampX = computed(() => {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  return Math.max(8, Math.min(props.x, w - 300))
})
const clampY = computed(() => {
  const h = typeof window !== 'undefined' ? window.innerHeight : 768
  return Math.max(8, Math.min(props.y, h - 420))
})

function pick(fn: () => void) {
  fn()
}

/**
 * 图钉点击：未冻结 → 冻结到左侧；已冻结 → 直接取消冻结。
 * 不再做 null→left→right→null 三态循环：已冻结的列想取消得多点一次，而中间态「从
 * 左换到右」在图标上几乎看不出来（图钉本来就无法用 CSS 着色，见 rj-grid.scss 同名说明）。
 * 左右精确归属交给「通用」页签的「冻结到左侧 / 冻结到右侧」两项。
 */
function toggleColPin(c: ColMenuItem) {
  emit('toggle-col-pin', c.colId, c.pinned ? null : 'left')
}
/**
 * 「通用」页签的冻结到左/右：已经是该侧生效态时转为取消冻结（重复钉同一侧是空操作，
 * 不如把这一击当作关）；否则直接钉到点的那一侧（左/右精确归属仍由本页签完成）。
 */
function toggleGeneralPin(side: 'left' | 'right') {
  emit('pin', props.pinned === side ? null : side)
}
// 「列」页签拖拽换序：拖动条目重排列（与表头拖拽、工具面板同走 moveColumn）
const dragId = ref('')
const dragOverId = ref('')
function onColDragStart(colId: string, e: DragEvent) {
  dragId.value = colId
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/x-rj-col', colId)
  }
}
function onColDrop(toId: string) {
  if (dragId.value && dragId.value !== toId) emit('col-drop', dragId.value, toId)
  dragId.value = ''
  dragOverId.value = ''
}
/** 拖拽结束（含未成功 drop 的取消）统一清理拖拽态；用命名函数避免多行内联 handler 被模板编译器当表达式解析失败 */
function onColDragEnd() {
  dragId.value = ''
  dragOverId.value = ''
}
function setAll(visible: boolean) {
  props.columns.forEach((c) => {
    if (!!c.hidden === visible) emit('toggle-col-hide', c.colId)
  })
}
</script>
