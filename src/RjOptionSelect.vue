<template>
  <div ref="rootRef" class="rj-opt-select" :class="{ 'is-open': open }">
    <!-- 触发器：外观对齐查询栏原生控件（rj-query-val），点击展开下拉面板 -->
    <button
      type="button"
      class="rj-opt-trigger"
      :class="{ 'is-placeholder': !displayText }"
      @click="toggle()"
    >
      <span class="rj-opt-text">{{ displayText || placeholder }}</span>
      <span class="rj-opt-arrow" aria-hidden="true">▾</span>
    </button>

    <div v-show="open" class="rj-opt-panel" @mousedown.stop>
      <input
        ref="searchRef"
        v-model="query"
        class="rj-opt-search"
        type="text"
        :placeholder="t('searchOptions')"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="confirmActive()"
        @keydown.esc.prevent="close()"
      />
      <div ref="listRef" class="rj-opt-list rj-option-tree">
        <div
          v-for="(row, i) in visibleRows"
          :key="String(row.option.value) + ':' + i"
          class="rj-opt-row"
          :class="{ 'is-active': i === activeIdx, 'is-selected': isChosen(row.option.value) }"
          :style="{ paddingLeft: 8 + row.depth * 16 + 'px' }"
          @mouseenter="activeIdx = i"
          @click="onRowClick(row)"
        >
          <span
            v-if="row.hasChildren"
            class="rj-option-caret"
            @click.stop="toggleExpand(row.option)"
            >{{ row.expanded ? '▾' : '▸' }}</span
          >
          <span v-else class="rj-option-caret is-leaf"></span>
          <input
            v-if="multiple"
            type="checkbox"
            class="rj-opt-check"
            :checked="isChosen(row.option.value)"
            @click.stop
            @change="toggleValue(row.option)"
          />
          <span class="rj-option-label">{{ row.option.label }}</span>
        </div>
        <div v-if="!visibleRows.length" class="rj-opt-empty">{{ t('noOptions') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 查询栏用的可搜索树形下拉：一份 options（可为带 children 的树）→ 层级缩进 + 折叠 + 打字过滤。
 * 纯原生控件 + --rj 主题变量（与网格浮层一致，不引 Element Plus、不 Teleport）；
 * 单选 emit 标量值，多选 emit 值数组。点击外部 / Esc 关闭。
 */
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { RjEditorOption } from './types'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import {
  collectParentKeys,
  filterOptionTree,
  flattenOptions,
  flattenTreeForRender
} from './optionsSource'

defineOptions({ name: 'RjOptionSelect' })

const props = withDefaults(
  defineProps<{
    options?: RjEditorOption[]
    modelValue?: any
    multiple?: boolean
    placeholder?: string
  }>(),
  { options: () => [], modelValue: undefined, multiple: false, placeholder: '' }
)
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()

const t = inject(RJ_LOCALE_KEY, defaultTranslate)

const rootRef = ref<HTMLElement>()
const searchRef = ref<HTMLInputElement>()
const listRef = ref<HTMLElement>()
const open = ref(false)
const query = ref('')
const activeIdx = ref(-1)
const expanded = ref<Set<string>>(new Set(collectParentKeys(props.options)))

// 源变化时重置展开集合（默认展开全部父节点）
watch(
  () => props.options,
  (opts) => {
    expanded.value = collectParentKeys(opts)
  }
)

const filteredTree = computed(() => filterOptionTree(props.options, query.value))
const visibleRows = computed(() => {
  const q = (query.value || '').trim()
  const tree = filteredTree.value
  const exp = q ? collectParentKeys(tree) : expanded.value
  return flattenTreeForRender(tree, exp)
})

const flat = computed(() => flattenOptions(props.options))
function labelOf(value: any): string {
  const hit = flat.value.find((o) => String(o.value) === String(value))
  return hit ? String(hit.label) : String(value ?? '')
}
const chosen = computed<any[]>(() =>
  props.multiple
    ? Array.isArray(props.modelValue)
      ? props.modelValue
      : []
    : props.modelValue == null || props.modelValue === ''
      ? []
      : [props.modelValue]
)
const displayText = computed(() => {
  if (!chosen.value.length) return ''
  if (props.multiple) return chosen.value.map((v) => labelOf(v)).join('、')
  return labelOf(chosen.value[0])
})
function isChosen(value: any): boolean {
  return chosen.value.some((v) => String(v) === String(value))
}

function toggle() {
  if (open.value) close()
  else openList()
}
function openList() {
  open.value = true
  query.value = ''
  activeIdx.value = visibleRows.value.length ? 0 : -1
  nextTick(() => searchRef.value?.focus())
  document.addEventListener('mousedown', onDocDown)
}
function close() {
  open.value = false
  document.removeEventListener('mousedown', onDocDown)
}
function onDocDown(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) close()
}

function toggleExpand(opt: RjEditorOption) {
  const k = String(opt.value)
  const next = new Set(expanded.value)
  if (next.has(k)) next.delete(k)
  else next.add(k)
  expanded.value = next
}

function move(dir: number) {
  const len = visibleRows.value.length
  if (!len) return
  activeIdx.value = Math.min(len - 1, Math.max(0, activeIdx.value + dir))
  nextTick(() => {
    const el = listRef.value?.children?.[activeIdx.value] as HTMLElement | undefined
    el?.scrollIntoView?.({ block: 'nearest' })
  })
}

function emitValue(v: any) {
  emit('update:modelValue', v)
}
function pickSingle(opt: RjEditorOption) {
  emitValue(opt.value)
  close()
}
function toggleValue(opt: RjEditorOption) {
  const cur = chosen.value.slice()
  const i = cur.findIndex((v) => String(v) === String(opt.value))
  if (i >= 0) cur.splice(i, 1)
  else cur.push(opt.value)
  emitValue(cur)
}
function onRowClick(row: { option: RjEditorOption }) {
  if (props.multiple) toggleValue(row.option)
  else pickSingle(row.option)
}
function confirmActive() {
  const row = visibleRows.value[activeIdx.value]
  if (row) onRowClick(row)
}

onBeforeUnmount(() => document.removeEventListener('mousedown', onDocDown))
</script>
