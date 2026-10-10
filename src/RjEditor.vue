<template>
  <div class="rj-editor" @keydown.stop>
    <template v-if="editorType === 'custom' && customComp">
      <component
        :is="customComp"
        :value="model"
        :row="row"
        :column="column"
        @commit="commit"
        @cancel="cancel"
      />
    </template>
    <template v-else-if="editorType === 'select' || editorType === 'richSelect'">
      <div class="rj-editor-select">
        <input
          ref="inputRef"
          v-model="text"
          class="rj-editor-combo"
          :placeholder="placeholder"
          role="combobox"
          :aria-expanded="open"
          @focus="openList()"
          @input="query = text"
          @blur="onSelectBlur"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="confirmPick()"
          @keydown.esc.prevent="cancel()"
        />
        <div v-show="open" ref="listRef" class="rj-editor-dropdown rj-option-tree" @mousedown.prevent>
          <div
            v-for="(node, i) in visibleRows"
            :key="String(node.option.value) + ':' + i"
            class="rj-editor-option rj-option-row"
            :class="{ 'is-active': i === activeIdx, 'is-selected': node.option.value === model }"
            :style="{ paddingLeft: 8 + node.depth * 16 + 'px' }"
            @mouseenter="activeIdx = i"
            @click="pick(node.option)"
          >
            <span
              v-if="node.hasChildren"
              class="rj-option-caret"
              @click.stop="toggleExpand(node.option)"
              >{{ node.expanded ? '▾' : '▸' }}</span
            >
            <span v-else class="rj-option-caret is-leaf"></span>
            <span class="rj-option-label">{{ node.option.label }}</span>
          </div>
          <div v-if="!visibleRows.length" class="rj-editor-option" style="color: #999">
            {{ t('noMatches') }}
          </div>
        </div>
      </div>
    </template>
    <template v-else-if="editorType === 'largeText'">
      <textarea
        ref="taRef"
        class="rj-editor-textarea"
        v-model="text"
        :rows="cfg.props?.rows || 4"
        :placeholder="placeholder"
        @keydown.esc.prevent="cancel()"
        @keydown.ctrl.enter.prevent="commit(text)"
        @blur="commit(text)"
      ></textarea>
    </template>
    <template v-else-if="editorType === 'checkbox'">
      <input
        ref="inputRef"
        type="checkbox"
        :checked="!!model"
        @change="commit(($event.target as HTMLInputElement).checked)"
      />
    </template>
    <template v-else-if="editorType === 'date'">
      <input
        ref="inputRef"
        type="date"
        v-model="text"
        @change="commit(text)"
        @keydown.esc.prevent="cancel()"
      />
    </template>
    <template v-else-if="editorType === 'number'">
      <input
        ref="inputRef"
        type="text"
        inputmode="decimal"
        v-model="text"
        :placeholder="placeholder"
        v-on="extraProps"
        @keydown.enter.prevent="commit(text)"
        @keydown.esc.prevent="cancel()"
        @blur="commit(text)"
      />
    </template>
    <template v-else>
      <input
        ref="inputRef"
        type="text"
        v-model="text"
        :placeholder="placeholder"
        v-on="extraProps"
        @keydown.enter.prevent="commit(text)"
        @keydown.esc.prevent="cancel()"
        @blur="commit(text)"
      />
    </template>
    <div v-if="error" class="rj-editor-error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, watch } from 'vue'
import type { RjColumn, RjEditorOption, RjRowData } from './types'
import { formatDate, parseNumericInput } from './utils'
import { isFormula } from './formula'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import {
  RJ_OPTIONS_KEY,
  defaultOptionsAccessor,
  collectParentKeys,
  filterOptionTree,
  flattenOptions,
  flattenTreeForRender
} from './optionsSource'

defineOptions({ name: 'RjEditor' })

const t = inject(RJ_LOCALE_KEY, defaultTranslate)
const optionsAccessor = inject(RJ_OPTIONS_KEY, defaultOptionsAccessor)

const props = defineProps<{
  column: RjColumn
  row: RjRowData
  value: any
  rowIndex: number
}>()

const emit = defineEmits<{
  (e: 'commit', value: any): void
  (e: 'cancel'): void
}>()

const cfg = computed(() => {
  const ed = props.column.editor
  if (!ed) return {} as any
  return typeof ed === 'string' ? { type: ed } : ed
})

const editorType = computed<string>(() => {
  if (cfg.value.type) return cfg.value.type
  const t = props.column.type
  if (t === 'boolean') return 'checkbox'
  if (t === 'num' || t === 'money' || t === 'percent') return 'number'
  if (t === 'date' || t === 'datetime') return 'date'
  if (cfg.value.options) return 'select'
  return 'input'
})

/** 下拉型编辑器（select 与 richSelect 共用键盘导航/打字过滤） */
const isSelectLike = computed(
  () => editorType.value === 'select' || editorType.value === 'richSelect'
)

const customComp = computed(() => cfg.value.component)
const placeholder = computed(() => cfg.value.props?.placeholder ?? '')
const extraProps = computed(() => {
  const p = { ...cfg.value.props }
  delete p.placeholder
  return p
})

const model = ref<any>(props.value)
const text = ref<string>(
  editorType.value === 'date'
    ? formatDate(props.value).split(' ')[0]
    : props.value == null
      ? ''
      : String(props.value)
)

const options = computed<RjEditorOption[]>(() => {
  const o = cfg.value.options
  // 编辑器显式候选优先（函数/非空数组）
  if (typeof o === 'function') {
    const r = o(props.row)
    if (Array.isArray(r) && r.length) return r
  } else if (Array.isArray(o) && o.length) {
    return o
  }
  // 缺省/空数组（含宿主手写回填的 options: []）→ select 类编辑器回落到网格统一选项载体
  if (isSelectLike.value) return optionsAccessor.list(props.column) || []
  return Array.isArray(o) ? o : []
})
// 展开集合（以 String(value) 为键）：候选树变化时默认展开全部父节点
const expanded = ref<Set<string>>(new Set())
watch(
  options,
  (opts) => {
    expanded.value = collectParentKeys(opts)
  },
  { immediate: true }
)
// 搜索词剪枝后的树（保留祖先路径）
const filteredTree = computed(() =>
  isSelectLike.value ? filterOptionTree(options.value, query.value) : options.value
)
// 铺成可渲染的可见行（缩进深度 + 折叠态）；搜索时自动展开命中分支
const visibleRows = computed(() => {
  const q = (query.value || '').trim()
  const tree = filteredTree.value
  const exp = isSelectLike.value && q ? collectParentKeys(tree) : expanded.value
  return flattenTreeForRender(tree, exp)
})
function toggleExpand(opt: RjEditorOption) {
  const k = String(opt.value)
  const next = new Set(expanded.value)
  if (next.has(k)) next.delete(k)
  else next.add(k)
  expanded.value = next
}

const open = ref(false)
const error = ref<string | null>(null)
const inputRef = ref<HTMLInputElement>()
const taRef = ref<HTMLTextAreaElement>()
const listRef = ref<HTMLElement>()
const activeIdx = ref(-1)
// 下拉过滤词：仅在用户实际打字后生效（打开时为空→展示全量候选）
const query = ref('')
const committed = ref(false)

function scrollToActive() {
  nextTick(() => {
    const el = listRef.value?.children?.[activeIdx.value] as HTMLElement | undefined
    el?.scrollIntoView?.({ block: 'nearest' })
  })
}
function openList() {
  if (!isSelectLike.value) return
  open.value = true
  query.value = ''
  const i = visibleRows.value.findIndex((r) => r.option.value === model.value)
  activeIdx.value = i >= 0 ? i : visibleRows.value.length ? 0 : -1
  scrollToActive()
}
function move(dir: number) {
  if (!open.value) return openList()
  const len = visibleRows.value.length
  if (!len) return
  activeIdx.value = Math.min(len - 1, Math.max(0, activeIdx.value + dir))
  scrollToActive()
}
function confirmPick() {
  const row = visibleRows.value[activeIdx.value]
  if (open.value && row) pick(row.option)
  else pickText()
}

function pick(opt: RjEditorOption) {
  model.value = opt.value
  text.value = String(opt.label)
  open.value = false
  commit(opt.value)
}

function pickText() {
  const exact = flattenOptions(options.value).find((o) => String(o.label) === text.value)
  if (exact) return pick(exact)
  const first = visibleRows.value[0]
  if (first && text.value.trim()) return pick(first.option)
  commit(text.value)
}

function onSelectBlur() {
  setTimeout(() => {
    open.value = false
    commit(text.value)
  }, 150)
}

async function commit(v: any) {
  if (committed.value) return
  // 数值列以 = 开头的公式文本需原样透传（交由网格公式分支登记），不参与数值解析
  const isFx = typeof v === 'string' && isFormula(v.trim())
  const val = editorType.value === 'number' && !isFx ? parseNumericInput(v) : v
  if (cfg.value.validator) {
    const err = await cfg.value.validator(val, props.row, props.column)
    if (err) {
      error.value = err
      committed.value = false
      nextTick(() => inputRef.value?.focus())
      return
    }
  }
  committed.value = true
  emit('commit', val)
}

function cancel() {
  committed.value = true
  emit('cancel')
}

onMounted(() => {
  nextTick(() => {
    if (editorType.value === 'largeText') {
      taRef.value?.focus()
      return
    }
    inputRef.value?.focus()
    if (inputRef.value?.select && editorType.value !== 'checkbox') inputRef.value.select()
  })
})

// 下拉选项因打字过滤变化时，高亮回到首项
watch(query, () => {
  if (isSelectLike.value && open.value) activeIdx.value = visibleRows.value.length ? 0 : -1
})
</script>
