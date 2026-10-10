<template>
  <div
    class="rj-popup"
    :class="{ 'is-inline': inline }"
    :style="inline ? {} : { left: x + 'px', top: y + 'px', minWidth: '240px' }"
    @click.stop
  >
    <template v-if="filterType === 'select'">
      <div
        class="rj-popup-row"
        style="justify-content: space-between; font-size: 12px; margin-bottom: 4px"
      >
        <label class="rj-check-item">
          <input type="checkbox" :checked="allChecked" @change="toggleAll()" /> {{ t('selectAll') }}
        </label>
        <label class="rj-check-item" :title="t('invertHint')">
          <input type="checkbox" v-model="exclude" /> {{ t('excludeSelected') }}
        </label>
      </div>
      <input
        v-model="search"
        class="rj-input"
        style="width: 100%; margin-bottom: 6px"
        :placeholder="t('searchOptions')"
      />
      <div class="rj-check-list">
        <label v-for="opt in filteredOptions" :key="String(opt)" class="rj-check-item">
          <input type="checkbox" :value="opt" v-model="values" />
          <span>{{ displayOf(opt) }}</span>
        </label>
        <div v-if="!filteredOptions.length" style="padding: 6px; color: #999">{{
          t('noOptions')
        }}</div>
      </div>
    </template>
    <template v-else>
      <div class="rj-popup-row">
        <div class="rj-radio-tabs">
          <span :class="{ 'is-active': operator === 'and' }" @click="operator = 'and'">AND</span>
          <span :class="{ 'is-active': operator === 'or' }" @click="operator = 'or'">OR</span>
        </div>
      </div>
      <div v-for="(cond, i) in conds" :key="i" class="rj-popup-row">
        <select
          v-model="cond.op"
          class="rj-input"
          style="width: auto; min-width: 92px; max-width: 168px; padding: 0 4px"
        >
          <option v-for="op in ops" :key="op.value" :value="op.value">
            {{ opLabel(op) }}
          </option>
        </select>
        <input
          v-if="!noValue(cond.op)"
          v-model="cond.value1"
          class="rj-input"
          style="flex: 1; min-width: 0"
          :type="inputType"
          @keyup.enter="apply()"
        />
        <template v-if="hasV2(cond.op)">
          <span>~</span>
          <input
            v-model="cond.value2"
            class="rj-input"
            style="flex: 1; min-width: 0"
            :type="inputType"
          />
        </template>
        <span
          v-if="conds.length > 1"
          class="rj-cond-del"
          :title="t('deleteCondition')"
          @click="conds.splice(i, 1)"
          >×</span
        >
      </div>
      <div class="rj-popup-row">
        <a style="font-size: 12px; color: var(--rj-primary); cursor: pointer" @click="addCond">{{
          t('addCondition')
        }}</a>
      </div>
    </template>
    <div class="rj-popup-footer">
      <button class="rj-btn" @click="$emit('clear')">{{ t('clear') }}</button>
      <span class="rj-adv-link" @click="$emit('advanced')">{{ t('advancedFilterLink') }}</span>
      <button class="rj-btn is-active" @click="apply()">{{ t('apply') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { RjColumn, RjFilterCondition, RjFilterModel } from './types'
import { FILTER_OPS } from './useRowModel'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import { RJ_OPTIONS_KEY, defaultOptionsAccessor } from './optionsSource'

defineOptions({ name: 'RjFilterMenu' })

const t = inject(RJ_LOCALE_KEY, defaultTranslate)
const optionsAccessor = inject(RJ_OPTIONS_KEY, defaultOptionsAccessor)

const props = withDefaults(
  defineProps<{
    column: RjColumn
    filterType: 'text' | 'number' | 'date' | 'select'
    model: RjFilterModel | null
    x?: number
    y?: number
    uniqueValues?: any[]
    /** 内联模式：作为列菜单“筛选”页签嵌入，不做绝对定位 */
    inline?: boolean
  }>(),
  { x: 0, y: 0, inline: false }
)

const emit = defineEmits<{
  (e: 'apply', model: RjFilterModel): void
  (e: 'clear'): void
  (e: 'advanced'): void
}>()

const ops = computed(() => FILTER_OPS[props.filterType] || [])
/** 算子名取当前语言文案（目录未命中时回落内置中文 label） */
function opLabel(o: { label: string; labelKey: string }) {
  const s = t(o.labelKey)
  return s === o.labelKey ? o.label : s
}
const hasV2 = (op: string) => !!ops.value.find((o) => o.value === op)?.v2
const noValue = (op: string) => op === 'blank' || op === 'notBlank'
const inputType = computed(() =>
  props.filterType === 'date' ? 'date' : props.filterType === 'number' ? 'number' : 'text'
)

const operator = ref<'and' | 'or'>(props.model?.operator || 'or')
const conds = ref<RjFilterCondition[]>(
  props.model?.conditions?.length
    ? props.model.conditions.map((c) => ({ ...c }))
    : [{ op: ops.value[0]?.value || 'contains', value1: '', value2: '' }]
)
const values = ref<any[]>(
  props.model?.type === 'select' &&
    (props.model.conditions[0]?.op === 'in' || props.model.conditions[0]?.op === 'notIn')
    ? (props.model.conditions[0].value1 || []).map(String)
    : []
)
const exclude = ref(props.model?.type === 'select' && props.model.conditions[0]?.op === 'notIn')

const options = computed(() => (props.uniqueValues || []).map(String).sort())
const search = ref('')
const filteredOptions = computed(() => {
  const q = search.value.toLowerCase()
  return q ? options.value.filter((v) => v.toLowerCase().includes(q)) : options.value
})
// 候选标签优先级：网格统一选项载体 value→label > 列 filterValueMap（仍兼容） > 原始值
const displayOf = (v: string) =>
  optionsAccessor.label(props.column, v) ?? props.column.filterValueMap?.[v] ?? v

const allChecked = computed(
  () => options.value.length > 0 && values.value.length >= options.value.length
)
function toggleAll() {
  values.value = allChecked.value ? [] : [...options.value]
}

function addCond() {
  conds.value.push({ op: ops.value[0]?.value || 'contains', value1: '', value2: '' })
}

function apply() {
  if (props.filterType === 'select') {
    if (!values.value.length && !exclude.value) return emit('clear')
    // 未勾选任何项且处于排除模式 → 相当于全部显示（无过滤），清空
    if (exclude.value && !values.value.length) return emit('clear')
    return emit('apply', {
      type: 'select',
      operator: 'or',
      conditions: [{ op: exclude.value ? 'notIn' : 'in', value1: values.value }]
    })
  }
  const valid = conds.value.filter((c) => noValue(c.op) || (c.value1 !== '' && c.value1 != null))
  if (!valid.length) return emit('clear')
  emit('apply', {
    type: props.filterType,
    operator: operator.value,
    conditions: valid.map((c) => ({ op: c.op, value1: c.value1, value2: c.value2 }))
  })
}
</script>
