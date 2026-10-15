<template>
  <div class="rj-popup rj-adv-dialog" :style="{ left: x + 'px', top: y + 'px' }" @click.stop>
    <div class="rj-adv-title">
      {{ t('advFilterTitle') }}
      <span class="rj-adv-remove" @click="$emit('close')">✕</span>
    </div>
    <RjAdvGroup :group="tree" :columns="columns" :depth="0" />
    <div class="rj-popup-footer">
      <button class="rj-btn" @click="$emit('clear')">{{ t('clear') }}</button>
      <button class="rj-btn is-active" @click="apply()">{{ t('apply') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, reactive } from 'vue'
import RjAdvGroup from './RjAdvGroup.vue'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import { isAdvGroup, type AdvFilterGroup, type AdvColumnCondition } from './filtering'

defineOptions({ name: 'RjAdvancedFilterDialog' })

const t = inject(RJ_LOCALE_KEY, defaultTranslate)

const props = defineProps<{
  model: AdvFilterGroup | null
  columns: { colId: string; title: string; filterType: string }[]
  x: number
  y: number
}>()
const emit = defineEmits<{
  (e: 'apply', model: AdvFilterGroup): void
  (e: 'clear'): void
  (e: 'close'): void
}>()

// 深拷贝一份编辑，Apply 时才回写
const tree = reactive<AdvFilterGroup>(
  props.model
    ? (JSON.parse(JSON.stringify(props.model)) as AdvFilterGroup)
    : { operator: 'and', items: [] }
)

const noValue = (op: string) => op === 'blank' || op === 'notBlank'

/** 规范化：in/notIn 自文本→逗号拆为数组；丢弃空值条件；递归去除空组 */
function normalize(node: AdvFilterGroup): AdvFilterGroup {
  const items: Array<AdvFilterGroup | AdvColumnCondition> = []
  node.items.forEach((it) => {
    if (isAdvGroup(it)) {
      const sub = normalize(it)
      if (sub.items.length) items.push(sub)
      return
    }
    const cond = { ...it.condition }
    if (cond.op === 'in' || cond.op === 'notIn') {
      const arr = String(cond.value1 ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (!arr.length) return
      items.push({
        colId: it.colId,
        filterType: it.filterType,
        condition: { ...cond, value1: arr }
      })
    } else {
      if (!noValue(cond.op) && (cond.value1 === '' || cond.value1 == null)) return
      items.push({ ...it, condition: cond })
    }
  })
  return { operator: node.operator, items }
}

function apply() {
  const normalized = normalize(JSON.parse(JSON.stringify(tree)) as AdvFilterGroup)
  if (!normalized.items.length) return emit('clear')
  emit('apply', normalized)
}
</script>
