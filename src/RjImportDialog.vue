<template>
  <div class="rj-form-mask" @click.self="tryClose">
    <div class="rj-import-dialog" @click.stop>
      <div class="rj-form-header">
        {{ t('importTitle') }}
        <span class="rj-form-close" @click="tryClose">✕</span>
      </div>
      <!-- busy 期间整块禁点：否则「导入中」还能重选文件/再点模板，用户以为可以打断上传 -->
      <div class="rj-import-body" :class="{ 'is-busy': busy }">
        <div class="rj-import-step">
          <div class="rj-import-step-title">{{ t('importTplStep') }}</div>
          <div class="rj-import-tpl-row">
            <span class="rj-import-tpl-hint">{{ t('importTplHint') }}</span>
            <button class="rj-btn rj-import-tpl-btn" @click="$emit('template')">
              {{ t('importTplBtn') }}
            </button>
          </div>
        </div>
        <div class="rj-import-step">
          <div class="rj-import-step-title">{{ t('importFileStep') }}</div>
          <!-- label 包 input：点热区任意处即开文件框（label 激活由浏览器特判，不会与 input 的 click 互相回环） -->
          <label
            class="rj-import-drop"
            :class="{ 'is-picked': !!picked, 'is-over': dragOver }"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="onDrop"
          >
            <input type="file" class="rj-import-input" :accept="ACCEPT" @change="onPick" />
            <template v-if="picked">
              <span class="rj-import-file" :title="picked.name">📄 {{ picked.name }}</span>
              <span class="rj-import-meta">{{ sizeText }} · {{ t('importRechoose') }}</span>
            </template>
            <template v-else>
              <span class="rj-import-drop-icon">⬆</span>
              <span class="rj-import-drop-text">{{ t('importDrop') }}</span>
              <span class="rj-import-drop-ext">{{ t('importDropExt') }}</span>
            </template>
          </label>
          <!-- 就地提示而不借宿主 toast：弹框遮罩在 toast 之上，失败原因飘在框后等于没说 -->
          <div v-if="errText || error" class="rj-import-error">{{ errText || error }}</div>
        </div>
        <!--
          宿主声明的额外字段（importExtraFields）：按数组顺序排在选择器下方。
          位置刻意留在 .rj-import-body 内：busy 时整块禁点的样式直接覆盖到这些控件，不另写禁用逻辑。
          控件与行表单弹框同源（原生勾选 + 原生下拉），零 UI 库依赖且不会被弹框裁掉浮层。
        -->
        <div v-if="extraFields.length" class="rj-import-step">
          <div class="rj-import-step-title">{{ t('importExtraStep') }}</div>
          <div class="rj-import-fields">
            <div v-for="f in extraFields" :key="f.key" class="rj-form-field rj-import-field">
              <label v-if="f.kind === 'checkbox'" class="rj-form-label">
                <input v-model="values[f.key]" type="checkbox" class="rj-form-check" />
                <span>{{ f.label }}</span>
              </label>
              <template v-else>
                <span class="rj-form-label">{{ f.label }}</span>
                <select v-model="values[f.key]" class="rj-form-input">
                  <option :value="undefined">{{ t('querySelect') }}</option>
                  <option v-for="o in f.options || []" :key="String(o.value)" :value="o.value">
                    {{ o.label }}
                  </option>
                </select>
              </template>
              <div v-if="f.tip" class="rj-import-tip">{{ f.tip }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="rj-popup-footer">
        <button class="rj-btn" :disabled="busy" @click="tryClose">{{ t('confirmCancel') }}</button>
        <button
          class="rj-btn rj-btn-primary"
          :class="{ 'is-busy': busy }"
          :disabled="!picked || busy"
          @click="submit"
        >
          {{ busy ? t('importBusy') : t('importOk') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 内置导入弹框：工具栏「导入」按钮（showImport）的配套弹窗。
 * 后台只吃 Excel，所以组件不解析文件内容——选中的 File 原样交给宿主的 importFile 回调去上传，
 * 弹框只管「下载模板 → 选文件 → 开始导入」这条动线的布局与前置校验。
 * 与确认框 / 行 JSON 查看器同族的根内 fixed 遮罩（不 Teleport，全程取 --rj 主题变量）。
 */
import { computed, inject, reactive, ref } from 'vue'
import type { RjImportExtraField } from './types'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
import { formatFileSize } from './utils'

defineOptions({ name: 'RjImportDialog' })

const t = inject(RJ_LOCALE_KEY, defaultTranslate)

const props = defineProps<{
  /** 宿主 importFile 回调进行中：按钮转「导入中…」并禁用，失败时保留弹框以便换文件重试 */
  busy?: boolean
  /** 宿主侧失败原因（后台回执文案）：显示在选文件热区下方，重新选文件时由本弹框发 clear-error 请宿主清掉 */
  error?: string
  /** 宿主自定义的额外表单字段：本弹框只渲染与收集，不懂其业务含义 */
  fields?: RjImportExtraField[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'template'): void
  (e: 'submit', file: File, extras: Record<string, unknown>): void
  (e: 'clear-error'): void
}>()

/** 后台当前只接受 Excel；宿主若放开格式，改这两处常量与提示文案即可 */
const ACCEPT = '.xlsx,.xls'
const EXTS = ['.xlsx', '.xls']

const picked = ref<File | null>(null)
const dragOver = ref(false)
const errText = ref('')

const extraFields = computed(() => props.fields || [])

/** 初值只在建立时算一次：弹框由 RjGrid 用 v-if 挂载，重开就是新实例，天然回到 defaultValue */
function initialExtras(fields: RjImportExtraField[]): Record<string, any> {
  const out: Record<string, any> = {}
  for (const f of fields) out[f.key] = f.defaultValue ?? (f.kind === 'checkbox' ? false : undefined)
  return out
}

const values = reactive<Record<string, any>>(initialExtras(extraFields.value))

const sizeText = computed(() => (picked.value ? formatFileSize(picked.value.size) : ''))

function isExcel(f: File): boolean {
  const n = (f.name || '').toLowerCase()
  return EXTS.some((e) => n.endsWith(e))
}

/** 收口所有来源（点选 / 拖拽）的文件：类型不符就地报错且不写入 picked，免得「开始导入」把非 Excel 递给宿主 */
function acceptFile(f: File | null | undefined) {
  if (!f) return
  if (!isExcel(f)) {
    picked.value = null
    errText.value = t('importBadType')
    return
  }
  picked.value = f
  errText.value = ''
  // 换了文件就是另一次尝试：上次的后台报错得跟着消失，否则用户对着一个干净文件也在看红字
  emit('clear-error')
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  acceptFile(input.files?.[0])
  // 清空 value：否则「选了同一个文件（改过内容）」不再触发 change，用户点了半天没反应
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  acceptFile(e.dataTransfer?.files?.[0])
}

function submit() {
  if (picked.value) emit('submit', picked.value, { ...values })
}

/** busy 期间忽略一切关闭：上传还在飞，框先没了就没有地方落「导入中/失败」的反馈 */
function tryClose() {
  if (props.busy) return
  emit('close')
}
</script>
