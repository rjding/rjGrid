<template>
  <!-- 视图命名弹框：由网格「视图菜单 → 存为新视图」唤起；根内同级 fixed（不 Teleport，保留 --rj 主题变量，遮罩/弹层不透明、不叠字） -->
  <div v-if="dlg" class="rj-view-mask" @click.self="dlg = false">
    <div class="rj-view-dlg">
      <div class="rj-view-dlg-title">{{ t('viewSaveNew') }}</div>
      <label class="rj-view-dlg-label">{{ t('viewName') }}</label>
      <input
        ref="nameInput"
        v-model="draftName"
        class="rj-input"
        :placeholder="t('viewNamePh')"
        maxlength="30"
        @keyup.enter="confirm"
        @keydown.esc="dlg = false"
      />
      <div class="rj-view-dlg-tip">
        {{ t('viewDlgTip', { q: condCount, c: colCount }) }}
      </div>
      <div class="rj-view-dlg-foot">
        <button class="rj-btn" @click="dlg = false">{{ t('viewCancel') }}</button>
        <button class="rj-btn rj-btn-primary" @click="confirm">{{ t('viewOk') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 自定义视图「命名弹框」：仅收集视图名称，确认后上抛 save({ name })。
 * 组件本身不碰存储、不列视图、不切换/删除——快照组装、持久化、视图菜单均由 RjGrid 负责。
 * 渲染在 .rj-grid 子树内、根内同级 fixed（不 Teleport），保留 --rj 主题变量。
 */
import { inject, nextTick, ref } from 'vue'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'

defineOptions({ name: 'RjViewManager' })

defineProps<{ condCount: number; colCount: number }>()

const emit = defineEmits<{
  (e: 'save', payload: { name: string }): void
}>()

const t = inject(RJ_LOCALE_KEY, defaultTranslate)

const dlg = ref(false)
const draftName = ref('')
const nameInput = ref<HTMLInputElement>()

function open() {
  dlg.value = true
  draftName.value = ''
  nextTick(() => nameInput.value?.focus())
}

function confirm() {
  const name = draftName.value.trim()
  if (!name) return
  emit('save', { name })
  dlg.value = false
}

// RjGrid 视图菜单「存为新视图」经此入口唤起命名框
defineExpose({ openNew: open })
</script>
