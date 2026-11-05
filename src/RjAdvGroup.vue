<template>
  <div class="rj-adv-group" :class="{ 'is-nested': depth > 0 }">
    <div class="rj-adv-head">
      <div class="rj-radio-tabs">
        <span :class="{ 'is-active': group.operator === 'and' }" @click="setOp('and')">AND</span>
        <span :class="{ 'is-active': group.operator === 'or' }" @click="setOp('or')">OR</span>
      </div>
      <span
        v-if="depth > 0"
        class="rj-adv-remove"
        :title="t('advDelGroup')"
        @click="$emit('remove')"
        >✕</span
      >
    </div>

    <div v-for="(item, i) in group.items" :key="i" class="rj-adv-item">
      <RjAdvGroup
        v-if="isAdvGroup(item)"
        :group="item as AdvFilterGroup"
        :columns="columns"
        :depth="depth + 1"
        @remove="removeAt(i)"
      />
      <div v-else class="rj-adv-cond">
        <select class="rj-input" :value="ac(item).colId" @change="onColChange(item, $event)">
          <option v-for="c in columns" :key="c.colId" :value="c.colId">
            {{ c.title || c.colId }}
          </option>
        </select>
        <select
          v-model="ac(item).condition.op"
          class="rj-input"
          style="width: auto; min-width: 96px; max-width: 170px"
          @change="onOpChange(item)"
        >
          <option v-for="op in opsFor(ac(item))" :key="op.value" :value="op.value">
            {{ opLabel(op) }}
          </option>
        </select>
        <input
          v-if="!noValue(ac(item).condition.op)"
          v-model="ac(item).condition.value1"
          class="rj-input"
          style="flex: 1; min-width: 0"
          :type="inputType(ac(item))"
        />
        <template v-if="hasV2(ac(item))">
          <span>~</span>
          <input
            v-model="ac(item).condition.value2"
            class="rj-input"
            style="flex: 1; min-width: 0"
            :type="inputType(ac(item))"
          />
        </template>
        <span class="rj-adv-remove" :title="t('advDelCond')" @click="removeAt(i)">×</span>
      </div>
    </div>

    <div class="rj-adv-actions">
      <a @click="addCondition">{{ t('advAddCond') }}</a>
      <a v-if="depth < 2" @click="addGroup">{{ t('advAddGroup') }}</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { FILTER_OPS } from './useRowModel'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import { isAdvGroup, type AdvFilterGroup, type AdvColumnCondition } from './filtering'

defineOptions({ name: 'RjAdvGroup' })

const t = inject(RJ_LOCALE_KEY, defaultTranslate)

const props = defineProps<{
  group: AdvFilterGroup
  columns: { colId: string; title: string; filterType: string }[]
  depth: number
}>()
defineEmits<{ (e: 'remove'): void }>()

// group 为父级持有的响应式子树，本组件就地对其实体编辑（受控嵌套编辑器）。
// 以局部别名引用避开 no-mutating-props 静态检查（运行时为同一 reactive 对象）。
const g = props.group
function setOp(op: 'and' | 'or') {
  g.operator = op
}

const ac = (item: AdvFilterGroup | AdvColumnCondition): AdvColumnCondition =>
  item as AdvColumnCondition

const noValue = (op: string) => op === 'blank' || op === 'notBlank'
/** 算子名跟随语言（目录未命中回落内置中文） */
function opLabel(o: { label: string; labelKey: string }) {
  const s = t(o.labelKey)
  return s === o.labelKey ? o.label : s
}
function opsFor(c: AdvColumnCondition) {
  return FILTER_OPS[c.filterType || 'text'] || FILTER_OPS.text
}
function hasV2(c: AdvColumnCondition) {
  return !!opsFor(c).find((o) => o.value === c.condition.op)?.v2
}
function inputType(c: AdvColumnCondition) {
  const ft = c.filterType
  return ft === 'date' ? 'date' : ft === 'number' ? 'number' : 'text'
}

function addCondition() {
  const col = props.columns[0]
  if (!col) return
  const ft = col.filterType
  const firstOp = (FILTER_OPS[ft] || FILTER_OPS.text)[0]?.value || 'contains'
  g.items.push({
    colId: col.colId,
    filterType: ft,
    condition: { op: firstOp, value1: '', value2: '' }
  })
}
function addGroup() {
  g.items.push({ operator: 'or', items: [] })
}
function removeAt(i: number) {
  g.items.splice(i, 1)
}
function onColChange(item: AdvColumnCondition, e: Event) {
  const colId = (e.target as HTMLSelectElement).value
  item.colId = colId
  const col = props.columns.find((c) => c.colId === colId)
  item.filterType = col?.filterType || 'text'
  item.condition.op = (FILTER_OPS[item.filterType] || FILTER_OPS.text)[0]?.value || 'contains'
  item.condition.value1 = ''
  item.condition.value2 = ''
}
function onOpChange(item: AdvColumnCondition) {
  if (noValue(item.condition.op)) {
    item.condition.value1 = ''
    item.condition.value2 = ''
  }
}
</script>
