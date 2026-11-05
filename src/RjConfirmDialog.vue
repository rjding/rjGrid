<template>
  <div class="rj-form-mask" @click.self="$emit('cancel')">
    <div class="rj-confirm-dialog" @click.stop>
      <div class="rj-form-header">
        {{ title || t('confirmTitle') }}
        <span class="rj-form-close" @click="$emit('cancel')">✕</span>
      </div>
      <div class="rj-confirm-msg">{{ message }}</div>
      <div class="rj-popup-footer">
        <button class="rj-btn" @click="$emit('cancel')">{{ t('confirmCancel') }}</button>
        <button class="rj-btn rj-btn-primary" @click="$emit('ok')">{{ t('confirmOk') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 内置极简确认框：查询栏 confirm 型操作按钮（删除等危险动作）共用。
 * 与图表弹窗同族的根内 fixed 遮罩（不 Teleport，保留 --rj 主题变量）。
 */
import { inject } from 'vue'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'

defineOptions({ name: 'RjConfirmDialog' })

const t = inject(RJ_LOCALE_KEY, defaultTranslate)

defineProps<{
  message: string
  title?: string
}>()
defineEmits<{
  (e: 'ok'): void
  (e: 'cancel'): void
}>()
</script>
