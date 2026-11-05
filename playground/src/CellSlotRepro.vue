<template>
  <div class="csr">
    <h3>单元格插槽回归（#cell-* / cellRenderer）</h3>
    <p class="csr-tip">
      刻意用 SFC 模板写插槽（v-for + :key 的 el-tag、el-switch、两行文本），与宿主
      <code>infra/gridQueryField</code> 同编译形态。插槽内容必须按真 vnode 渲染：一旦退化成「渲染期把宿主
      vnode mount 到游离节点、取 innerHTML 再 unmount」，SFC 的 block/_cache 复用同一批 vnode 会被置
      null component，悬停换行触发 keyed diff 就报
      <code>Cannot read properties of null (reading 'emitsOptions')</code>；字符串快照还会让标签卡在过渡
      起始态（宽 0 / 透明）看不见、开关点不动。点「跑探针」自检。
    </p>

    <div class="csr-bar">
      <el-button type="primary" size="small" @click="runProbe">跑悬停/移出探针</el-button>
      <el-button size="small" @click="resetProbe">清零</el-button>
      <span class="csr-result">
        报错 <b :class="{ bad: errs.length > 0 }">{{ errs.length }}</b> 条 · 可见标签
        <b :class="{ bad: totalTags === 0 || visibleTags < totalTags }">
          {{ visibleTags }}/{{ totalTags }}
        </b>
        · 开关可点 <b :class="{ bad: !switchClickable }">{{ switchClickable ? '是' : '否' }}</b> · 选中
        {{ selected.length }} 行
      </span>
    </div>
    <pre v-if="errs.length" class="csr-errs">{{ errs.slice(0, 5).join('\n') }}</pre>

    <div class="csr-grid">
      <div class="csr-col" data-probe="slot">
        <h4>A：用 #cell-* 插槽</h4>
        <rj-grid
          :columns="colsA"
          data-mode="client"
          :rows="rows"
          row-key="id"
          height="260px"
          density="medium"
          row-selection="multiple"
          floating-filters
          status-bar
          :quick-filter-enabled="false"
          :groupable="false"
          :queryable="false"
          :viewable="false"
          :row-form="false"
          :exportable="false"
          :chartable="false"
          :context-menu="rowContextMenu"
          state-key="repro-cell-slot-a"
          @selection-change="onSelectionChange"
        >
          <template #toolbar>
            <el-button type="primary" size="small" :disabled="!canEditOne" @click="noop">
              修改
            </el-button>
            <el-button type="danger" size="small" :disabled="!selected.length" @click="noop">
              删除
            </el-button>
          </template>
          <template #cell-field="p">
            <div>{{ p.row.field }}</div>
            <div class="csr-sub">{{ p.row.tableName }}.{{ p.row.columnName }}</div>
          </template>
          <template #cell-operators="p">
            <el-tag v-for="op in opsOf(p.row)" :key="op" size="small" class="csr-tag">
              {{ LABELS[op] || op }}
            </el-tag>
            <span v-if="!opsOf(p.row).length" class="csr-sub">未声明</span>
          </template>
          <template #cell-enabled="p">
            <span @click.stop>
              <el-switch
                :model-value="p.row.enabled"
                @change="(val: boolean) => onSwitch(p.row, val)"
              />
            </span>
          </template>
          <template #empty>无数据</template>
        </rj-grid>
      </div>

      <div class="csr-col" data-probe="plain">
        <h4>B：同列不挂插槽（formatter 文本，作对照）</h4>
        <rj-grid
          :columns="colsB"
          data-mode="client"
          :rows="rows"
          row-key="id"
          height="260px"
          density="medium"
          :quick-filter-enabled="false"
          :groupable="false"
          :queryable="false"
          :viewable="false"
          :row-form="false"
          :exportable="false"
          :chartable="false"
          state-key="repro-cell-slot-b"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 常驻回归页：hash 为 #cell-slot 时由 App.vue 挂载本页。
// 探针逐行派发 pointermove / pointerleave（复刻崩溃栈里的 onBodyPointerMove 与 _cache onPointerleave），
// 再同时校验三件事：无报错、插槽里的 el-tag 真的可见、el-switch 的 change 能落回行数据。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RjGrid } from 'rj-grid'
import type { RjColumn, RjMenuItem } from 'rj-grid'

const LABELS: Record<string, string> = {
  contains: '包含',
  eq: '等于',
  in: '枚举',
  between: '介于'
}
const ALL_OPS = ['contains', 'eq', 'in', 'between']

interface DemoRow {
  id: number
  gridKey: string
  field: string
  tableName: string
  columnName: string
  title: string
  operators: string
  enabled: boolean
  createTime: string
}

const rows = ref<DemoRow[]>(
  Array.from({ length: 30 }, (_, i): DemoRow => {
    return {
      id: i + 1,
      gridKey: 'bd_material',
      field: 'field' + (i + 1),
      tableName: 'bd_material',
      columnName: 'column_' + (i + 1),
      title: '标题' + (i + 1),
      operators: ALL_OPS.slice(0, (i % 4) + 1).join(','),
      enabled: i % 2 === 0,
      createTime: '2026-09-' + String((i % 28) + 1).padStart(2, '0') + ' 10:00:00'
    }
  })
)

const opsOf = (row: DemoRow): string[] =>
  String(row.operators || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

const baseCols = (): RjColumn[] => [
  {
    field: 'gridKey',
    title: '网格标识',
    width: 140,
    fixed: 'left',
    filter: 'text',
    suppressSort: true
  },
  {
    field: 'field',
    title: '字段 / 列',
    minWidth: 180,
    fixed: 'left',
    filter: 'text',
    suppressSort: true,
    headerTooltip: '模糊匹配'
  },
  { field: 'title', title: '标题', width: 100, filter: false, suppressSort: true },
  { field: 'operators', title: '声明运算符', minWidth: 200, filter: false, suppressSort: true },
  {
    field: 'enabled',
    title: '启用',
    width: 90,
    align: 'center',
    filter: 'select',
    options: [
      { label: '已启用', value: true },
      { label: '已停用', value: false }
    ],
    suppressSort: true
  },
  {
    field: 'createTime',
    title: '创建时间',
    width: 160,
    type: 'datetime',
    filter: 'date',
    suppressSort: true
  }
]

const colsA = ref<RjColumn[]>(baseCols())
const colsB = ref<RjColumn[]>(
  baseCols().map((c) => {
    if (c.field === 'operators') {
      return { ...c, formatter: (p: any) => opsOf(p.row).map((o) => LABELS[o] || o).join(' / ') }
    }
    if (c.field === 'field') {
      return {
        ...c,
        formatter: (p: any) => `${p.row.field}（${p.row.tableName}.${p.row.columnName}）`
      }
    }
    if (c.field === 'enabled') {
      return { ...c, formatter: (p: any) => (p.row.enabled ? '已启用' : '已停用') }
    }
    return c
  })
)

const selected = ref<DemoRow[]>([])
const onSelectionChange = (r: any[]) => (selected.value = (r || []) as DemoRow[])
const canEditOne = computed(() => selected.value.length === 1)
const switched = ref(0)
const onSwitch = (row: DemoRow, val: boolean) => {
  row.enabled = val
  switched.value++
}
const noop = () => {}

function rowContextMenu(ctx: any): RjMenuItem[] {
  const row = ctx.row as DemoRow | undefined
  if (!row?.id) return []
  return [{ name: '编辑', action: () => noop() }]
}

/* ---------------- 报错采集与自检 ---------------- */
const errs = ref<string[]>([])
const visibleTags = ref(0)
const totalTags = ref(0)
const switchClickable = ref(false)

const onError = (e: ErrorEvent) => errs.value.push('window.error: ' + e.message)
const onRejection = (e: PromiseRejectionEvent) =>
  errs.value.push('rejection: ' + String((e.reason as any)?.message ?? e.reason ?? ''))
const rawConsoleError = console.error
const onConsoleError = (...a: any[]) => {
  errs.value.push('console.error: ' + a.map((x) => String((x as any)?.message ?? x)).join(' '))
  rawConsoleError(...a)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function resetProbe() {
  errs.value = []
  visibleTags.value = 0
  totalTags.value = 0
  switchClickable.value = false
}

async function runProbe() {
  resetProbe()
  const host = document.querySelector('[data-probe="slot"]') as HTMLElement
  for (const el of Array.from(host.querySelectorAll('.rj-row'))) {
    for (const type of ['pointermove', 'pointerleave']) {
      el.dispatchEvent(
        new PointerEvent(type, { bubbles: true, pointerType: 'mouse', composed: true })
      )
      await sleep(0)
    }
  }
  await sleep(300)

  const tags = Array.from(host.querySelectorAll('.el-tag')) as HTMLElement[]
  totalTags.value = tags.length
  visibleTags.value = tags.filter((t) => {
    return t.offsetWidth > 0 && Number(getComputedStyle(t).opacity) > 0.5
  }).length

  const sw = host.querySelector('.el-switch') as HTMLElement | undefined
  if (sw) {
    const before = switched.value
    sw.click()
    await sleep(50)
    switchClickable.value = switched.value > before
  }
}

onMounted(() => {
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  console.error = onConsoleError
})
onBeforeUnmount(() => {
  window.removeEventListener('error', onError)
  window.removeEventListener('unhandledrejection', onRejection)
  console.error = rawConsoleError
})
</script>

<style scoped>
.csr {
  padding: 12px;
  font: 13px/1.6 system-ui;
}
.csr h3 {
  margin: 0 0 6px;
}
.csr-tip {
  max-width: 1100px;
  margin: 0 0 10px;
  color: #666;
}
.csr-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}
.csr-result b {
  color: #0a8a3a;
}
.csr-result b.bad {
  color: #d4380d;
}
.csr-errs {
  max-height: 140px;
  padding: 8px;
  margin: 0 0 8px;
  overflow: auto;
  white-space: pre-wrap;
  background: #fff1f0;
}
.csr-grid {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.csr-col {
  flex: 1 1 0;
  min-width: 0;
}
.csr-sub {
  font-size: 12px;
  color: #888;
}
.csr-tag {
  margin-right: 4px;
}
</style>
