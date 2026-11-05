<template>
  <div class="rj-form-mask" @click.self="$emit('close')">
    <div class="rj-row-form-dialog" :style="{ width: width + 'px' }" @click.stop>
      <div class="rj-form-header">
        {{ title || (addMode ? t('rowFormAddTitle') : t('rowFormTitle')) }}
        <span class="rj-form-close" @click="$emit('close')">✕</span>
      </div>
      <div v-if="multi" class="rj-form-hint">{{ t('rowFormMultiHint') }}</div>
      <div class="rj-form-body">
        <div v-if="!fields.length" class="rj-form-empty">{{ t('rowFormEmpty') }}</div>
        <div
          v-for="f in fields"
          :key="f.colId"
          class="rj-form-field"
          :class="{ 'is-off': multi && !enabled[f.field] }"
        >
          <label v-if="multi" class="rj-form-batch" :title="t('rowFormMultiHint')">
            <input v-model="enabled[f.field]" type="checkbox" />{{ t('rowFormChangeTag') }}
          </label>
          <label class="rj-form-label">{{ f.title }}</label>
          <textarea
            v-if="f.kind === 'textarea'"
            v-model="values[f.field]"
            class="rj-form-input"
            :rows="f.rows"
          ></textarea>
          <select v-else-if="f.kind === 'select'" v-model="values[f.field]" class="rj-form-input">
            <option :value="undefined">{{ addMode ? t('querySelect') : t('rowFormKeepValue') }}</option>
            <option v-for="o in f.options" :key="String(o.value)" :value="o.value">
              {{ o.label }}
            </option>
          </select>
          <input
            v-else-if="f.kind === 'checkbox'"
            v-model="values[f.field]"
            type="checkbox"
            class="rj-form-check"
          />
          <input
            v-else-if="f.kind === 'number'"
            v-model.number="values[f.field]"
            type="number"
            class="rj-form-input"
          />
          <input
            v-else-if="f.kind === 'date'"
            v-model="values[f.field]"
            type="date"
            class="rj-form-input"
          />
          <input v-else v-model="values[f.field]" type="text" class="rj-form-input" />
          <div v-if="errors[f.field]" class="rj-form-error">{{ errors[f.field] }}</div>
        </div>
      </div>
      <div class="rj-popup-footer">
        <button class="rj-btn" @click="$emit('close')">{{ t('confirmCancel') }}</button>
        <button class="rj-btn rj-btn-primary" :disabled="!changedCount" @click="submit">
          {{ (addMode ? t('rowFormSave') : t('rowFormApply')) + (multi ? '(' + changedCount + ')' : '') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 内置行编辑/新增弹窗：字段由 rowForm.buildFormFields 依列定义生成（RjGrid 传入）。
 * 编辑：单选全字段预填；多选走 diff 批量语义 —— 字段默认「不修改」，勾选才写入全部目标行。
 * 新增（mode='add'，rows 传 [preset]）：空白表单不预填，下拉占位为「请选择」，提交钮「保存」。
 * 提交前逐行跑列上 editor.validator，任一失败即阻断并显示在字段下方；
 * 校验通过后 emit submit(changes)，事务回填/新行插入与宿主持久化由 RjGrid 编排。
 */
import { computed, inject, reactive } from 'vue'
import type { RjFormField } from './rowForm'
import { fieldValue } from './rowForm'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import type { RjRowData } from './types'

defineOptions({ name: 'RjRowFormDialog' })

const t = inject(RJ_LOCALE_KEY, defaultTranslate)

const props = withDefaults(
  defineProps<{
    fields: RjFormField[]
    rows: RjRowData[]
    title?: string
    width?: number
    /** add=新增模式（空白表单）；缺省 edit=编辑模式（预填选中行） */
    mode?: 'edit' | 'add'
  }>(),
  { width: 560, mode: 'edit' }
)
const emit = defineEmits<{
  (e: 'submit', changes: Record<string, any>): void
  (e: 'close'): void
}>()

const multi = computed(() => props.rows.length > 1)
const addMode = computed(() => props.mode === 'add')
/** 值预填首行（新增模式即 preset，无则空白）；enabled 决定多选下该字段是否参与 */
const values = reactive<Record<string, any>>({})
const enabled = reactive<Record<string, boolean>>({})
const errors = reactive<Record<string, string>>({})

props.fields.forEach((f) => {
  values[f.field] = fieldValue(props.rows[0] || {}, f.field) ?? ''
  enabled[f.field] = !multi.value
})

/** 已生效字段数：单选=全部字段；多选=勾选数（0 时禁用提交） */
const changedCount = computed(() =>
  props.fields.filter((f) => !multi.value || enabled[f.field]).length
)

function activeFields() {
  return props.fields.filter((f) => !multi.value || enabled[f.field])
}

async function submit() {
  const fields = activeFields()
  Object.keys(errors).forEach((k) => delete errors[k])
  // 逐字段 × 逐目标行跑列校验器：任一失败阻断提交（与单元格编辑同一口径）
  for (const f of fields) {
    for (const row of props.rows) {
      const v = values[f.field]
      const msg = (await f.validator?.(v, row, f.col)) || ''
      if (msg) {
        errors[f.field] = msg
        return
      }
    }
  }
  const changes: Record<string, any> = {}
  fields.forEach((f) => {
    changes[f.field] = values[f.field] === '' && f.kind !== 'text' ? undefined : values[f.field]
  })
  emit('submit', changes)
}
</script>
