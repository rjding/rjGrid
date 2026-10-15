<template>
  <div class="rj-form-mask" @click.self="$emit('close')">
    <div class="rj-json-dialog" @click.stop>
      <div class="rj-form-header">
        {{ t('jsonTitle') }}
        <span class="rj-form-close" @click="$emit('close')">✕</span>
      </div>
      <!-- pre 保留缩进且可选中复制；max-height 内滚动，超大行不撑破视口 -->
      <pre class="rj-json-body" tabindex="0">{{ json }}</pre>
      <div class="rj-popup-footer">
        <button class="rj-btn" @click="$emit('close')">{{ t('jsonClose') }}</button>
        <!-- 复制后按钮文案短暂变「已复制/复制失败」作反馈，不用宿主 toast -->
        <button class="rj-btn rj-btn-primary" @click="copy">{{ t(tip || 'jsonCopy') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 内置行 JSON 查看器：右键菜单「查看该行 JSON」的展示弹层。
 * 与确认框同族的根内 fixed 遮罩（不 Teleport，全程取 --rj 主题变量，明暗自动适配）。
 */
import { inject, ref } from 'vue'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import { writeClipboard } from './export'

defineOptions({ name: 'RjRowJsonDialog' })

const t = inject(RJ_LOCALE_KEY, defaultTranslate)
const props = defineProps<{ json: string }>()
defineEmits<{ (e: 'close'): void }>()

const tip = ref('')
let tipTimer: ReturnType<typeof setTimeout> | undefined
async function copy() {
  const done = await writeClipboard(props.json)
  tip.value = done ? 'jsonCopied' : 'jsonCopyFail'
  clearTimeout(tipTimer)
  tipTimer = setTimeout(() => (tip.value = ''), 1500)
}
</script>
