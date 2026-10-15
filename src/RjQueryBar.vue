<template>
  <div class="rj-query-bar">
    <!-- 已添加的查询条件：字段 + 运算符 + 值 -->
    <span v-for="(c, i) in list" :key="c.field" class="rj-query-item">
      <b class="rj-query-label">{{ titleOf(c.field) }}</b>
      <select class="rj-query-op" :value="c.operator" @change="onOp(c, $event)">
        <option v-for="o in opsOf(c.field)" :key="o" :value="o">{{ opText(o) }}</option>
      </select>

      <!-- 介于：两个输入（日期用 date，数值用 number） -->
      <template v-if="c.operator === 'between'">
        <component
          :is="'input'"
          class="rj-query-val sm"
          :type="kindOf(c.field) === 'date' ? 'date' : 'number'"
          :value="c.value1"
          :placeholder="t('queryFrom')"
          @input="setVal(c, 'value1', $event)"
        />
        <span class="rj-query-tilde">~</span>
        <component
          :is="'input'"
          class="rj-query-val sm"
          :type="kindOf(c.field) === 'date' ? 'date' : 'number'"
          :value="c.value2"
          :placeholder="t('queryTo')"
          @input="setVal(c, 'value2', $event)"
        />
      </template>
      <!-- 属于（多选）：可搜索树形下拉 -->
      <RjOptionSelect
        v-else-if="c.operator === 'in'"
        class="rj-query-select"
        multiple
        :options="optionsOf(c.field)"
        :model-value="Array.isArray(c.value) ? c.value : []"
        :placeholder="t('querySelect')"
        @update:model-value="setMulti(c, $event)"
      />
      <!-- 下拉（单值 eq/ne）：可搜索树形下拉 -->
      <RjOptionSelect
        v-else-if="kindOf(c.field) === 'select'"
        class="rj-query-select"
        :options="optionsOf(c.field)"
        :model-value="c.value"
        :placeholder="t('querySelect')"
        @update:model-value="setSingle(c, $event)"
      />
      <!-- 数值（eq/gt/gte/lt/lte） -->
      <input
        v-else-if="kindOf(c.field) === 'number'"
        class="rj-query-val"
        type="number"
        :value="c.value"
        :placeholder="t('queryInput')"
        @input="setVal(c, 'value', $event)"
        @keyup.enter="emit('search')"
      />
      <!-- 文本（contains/eq/ne） -->
      <input
        v-else
        class="rj-query-val"
        type="text"
        :value="c.value"
        :placeholder="t('queryInput')"
        @input="setVal(c, 'value', $event)"
        @keyup.enter="emit('search')"
      />
      <span class="rj-query-del" :title="t('queryRemove')" @click="remove(i)">✕</span>
    </span>

    <!-- 可随时添加查询字段 -->
    <select class="rj-query-add" :value="''" @change="add($event)">
      <option value="" disabled>＋ {{ t('queryAddField') }}</option>
      <option v-for="f in available" :key="f.field" :value="f.field">
        {{ f.title }}（{{ kindText(f.kind) }}）
      </option>
      <option v-if="!available.length" value="" disabled>{{ t('queryAllAdded') }}</option>
    </select>

    <span class="rj-query-actions">
      <span class="rj-query-core">
        <button class="rj-btn rj-btn-primary" @click="emit('search')">{{ t('querySearch') }}</button>
        <button class="rj-btn" @click="clearAll">{{ t('queryReset') }}</button>
      </span>
      <span v-if="hasActions" class="rj-query-sep" aria-hidden="true"></span>
      <!-- 宿主声明式操作按钮（修改/删除…）：禁用态按选中行求值，confirm/onClick 编排由 RjGrid 完成 -->
      <span v-if="actionList.length" class="rj-query-action-btns">
        <button
          v-for="(a, i) in actionList"
          :key="i"
          class="rj-btn"
          :class="{ 'rj-btn-danger': a.danger }"
          :disabled="isDisabled(a)"
          @click="emit('action-click', a)"
        >
          <template v-if="a.icon">{{ a.icon }}</template>{{ a.name }}
        </button>
      </span>
      <!-- 插槽覆盖轨：宿主自带工具按钮时往这里放，与声明式按钮并存 -->
      <span v-if="$slots.actions" class="rj-query-slot-btns">
        <slot name="actions" :rows="selRows"></slot>
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
/**
 * 动态查询条件栏：字段可随时添加/移除，每个条件 = 字段 + 运算符 + 值。
 * 纯原生控件 + --rj 主题变量（与网格浮层一致，不引 Element Plus、不 Teleport），
 * 值通过 v-model(list) 上抛，宿主决定「前端过滤」还是「透给后端 loadData」。
 * 重置旁的操作按钮只负责渲染与上抛（禁用态例外：需选中行实时求值），
 * confirm/onClick 编排在 RjGrid 侧，保持本组件纯展示。
 */
import { computed, inject, useSlots } from 'vue'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import { defaultQueryOperator, queryOpsOfKind } from './query'
import { queryActionDisabled } from './rowForm'
import { flattenOptions } from './optionsSource'
import RjOptionSelect from './RjOptionSelect.vue'
import type {
  RjQueryAction,
  RjQueryCondition,
  RjQueryFieldDef,
  RjQueryFieldKind,
  RjQueryOperator,
  RjRowData
} from './types'

defineOptions({ name: 'RjQueryBar' })

const props = defineProps<{
  fields: RjQueryFieldDef[]
  modelValue: RjQueryCondition[]
  /** 重置旁的自定义操作按钮（queryActions prop） */
  actions?: RjQueryAction[]
  /** 当前选中行：供按钮禁用态实时求值 */
  selectedRows?: RjRowData[]
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: RjQueryCondition[]): void
  (e: 'search'): void
  (e: 'reset'): void
  (e: 'action-click', a: RjQueryAction): void
}>()

const t = inject(RJ_LOCALE_KEY, defaultTranslate)

// 插槽契约：rows 永远是非空数组（未选中时空数组），宿主侧免判 undefined
defineSlots<{
  actions?: (props: { rows: RjRowData[] }) => unknown
}>()

const selRows = computed(() => props.selectedRows || [])
const actionList = computed(() => props.actions || [])
// 分隔线：声明式或插槽任一有操作钮才画（纯查询栏保持原样不突兀）
const slots = useSlots()
const hasActions = computed(() => actionList.value.length > 0 || !!slots.actions)
function isDisabled(a: RjQueryAction): boolean {
  return queryActionDisabled(a, selRows.value)
}

const list = computed(() => props.modelValue || [])
const fieldMap = computed(() => new Map(props.fields.map((f) => [f.field, f])))
const available = computed(() => {
  const used = new Set(list.value.map((c) => c.field))
  return props.fields.filter((f) => !used.has(f.field))
})

function defOf(field: string): RjQueryFieldDef | undefined {
  return fieldMap.value.get(field)
}
function titleOf(field: string): string {
  return defOf(field)?.title || field
}
function kindOf(field: string): RjQueryFieldKind {
  return defOf(field)?.kind || 'text'
}
function optionsOf(field: string) {
  return defOf(field)?.options || []
}
function opsOf(field: string): RjQueryOperator[] {
  return queryOpsOfKind(kindOf(field))
}

const OP_KEY: Record<string, string> = {
  contains: 'opContains',
  eq: 'opEq',
  ne: 'opNe',
  gt: 'opGt',
  gte: 'opGte',
  lt: 'opLt',
  lte: 'opLte',
  between: 'opBetween',
  in: 'opIn'
}
function opText(op: string): string {
  return t(OP_KEY[op] || op)
}
const KIND_KEY: Record<string, string> = {
  text: 'queryKindText',
  number: 'queryKindNumber',
  date: 'queryKindDate',
  select: 'queryKindSelect'
}
function kindText(k?: RjQueryFieldKind): string {
  return t(KIND_KEY[k || 'text'] || 'queryKindText')
}

function emitList(next: RjQueryCondition[]) {
  emit('update:modelValue', next)
}

function add(ev: Event) {
  const sel = ev.target as HTMLSelectElement
  const field = sel.value
  sel.value = ''
  if (!field) return
  const next = list.value.slice()
  next.push({
    field,
    operator: defaultQueryOperator(kindOf(field)),
    value: undefined,
    valueText: ''
  })
  emitList(next)
}

function remove(i: number) {
  const next = list.value.slice()
  next.splice(i, 1)
  emitList(next)
}

// 重置：不再直接清空，而是交由 RjGrid 按当前视图处理（有激活视图则回到该视图保存的条件快照，否则清空）
function clearAll() {
  emit('reset')
}

/** 从原生事件里取标量值（number 型转数字，空串转 undefined） */
function readVal(ev: Event, numeric: boolean): any {
  const raw = (ev.target as HTMLInputElement | HTMLSelectElement).value
  if (raw === '' || raw === undefined) return undefined
  return numeric ? Number(raw) : raw
}

function setVal(c: RjQueryCondition, key: 'value' | 'value1' | 'value2', ev: Event, isSelect = false) {
  const numeric = isSelect ? false : kindOf(c.field) === 'number'
  ;(c as any)[key] = readVal(ev, numeric)
  emitList(list.value.slice())
}

/** 取候选项标签（候选可能为树，先拍平再按 value 命中） */
function labelOf(field: string, value: any): string {
  const hit = flattenOptions(optionsOf(field)).find((o) => String(o.value) === String(value))
  return hit ? String(hit.label) : String(value ?? '')
}

/** 单值下拉：写入 value 并同步展示文本（供视图卡片直显） */
function setSingle(c: RjQueryCondition, v: any) {
  c.value = v
  c.valueText = v == null || v === '' ? '' : labelOf(c.field, v)
  emitList(list.value.slice())
}

/** 多选（in）：写入值数组并同步拼接展示文本 */
function setMulti(c: RjQueryCondition, v: any) {
  const arr = Array.isArray(v) ? v : []
  c.value = arr
  c.valueText = arr.map((x) => labelOf(c.field, x)).join('、')
  emitList(list.value.slice())
}

/** 切运算符时清理不适配的旧值，避免脏值参与过滤 */
function onOp(c: RjQueryCondition, ev: Event) {
  const op = (ev.target as HTMLSelectElement).value as RjQueryOperator
  c.operator = op
  if (op === 'between') {
    c.value = undefined
  } else if (op === 'in') {
    c.value = Array.isArray(c.value) ? c.value : c.value == null || c.value === '' ? [] : [c.value]
  } else {
    c.value1 = undefined
    c.value2 = undefined
    if (Array.isArray(c.value)) c.value = undefined
  }
  emitList(list.value.slice())
}
</script>
