// rj-grid 行模型：数据管线（过滤→排序→分组/树/透视→虚拟行展平）+ 事务 + 服务端模式
import { computed, reactive, ref, watch } from 'vue'
import type {
  RjColumn,
  RjDataMode,
  RjFilterModel,
  RjLoadServerParams,
  RjRowData,
  RjSortState,
  RjTransaction,
  RjQueryCondition
} from './types'
import {
  applyRowLimit,
  colIdOf,
  defaultComparator,
  getValueByPath,
  runAgg,
  setValueByPath,
  uid
} from './utils'
import { compileExpression, isExpression } from './expression'
import { evalAdvancedFilter, evalConditions, type AdvFilterGroup } from './filtering'
import { activeQueryConditions, kindOfColumn, matchQueryValue } from './query'
import { SsrmStore, SsrmTxBatcher } from './ssrm'
import { flattenServerGroups, type SgChildState, type SgNeedLoad } from './serverGroups'
import { evaluateAst, parse, collectDeps, type AstNode, type FormulaCtx } from './formula'

/** 虚拟行类型 */
export interface RjDisplayRow {
  key: string | number
  type: 'row' | 'group' | 'detail' | 'fullwidth'
  data: RjRowData
  level: number
  parentKey?: string | number
  expanded?: boolean
  height: number
  /** group 行附加信息 */
  groupField?: string
  groupValue?: any
  groupCount?: number
  /** 服务端权威分组：该组行是否可展开（false 时不显示三角；缺省视为可展开） */
  expandable?: boolean
  /** 分组页脚行（复用 group 类型，但展示于组底部） */
  isFooter?: boolean
  /** 合成行（合计行 / 顶部与底部钉行）：不参与行拖拽排序 */
  noDrag?: boolean
  /** 钉行/合计行等合成行：非真实数据行，不渲染 col.actions 操作按钮 */
  pinned?: boolean
}

const keyMap = new WeakMap<object, string | number>()

export function rowKeyOf(row: RjRowData, keyField?: string): string | number {
  if (keyField && row[keyField] != null) return row[keyField]
  let k = keyMap.get(row)
  if (k == null) {
    k = uid('row')
    keyMap.set(row, k)
  }
  return k
}

// ---------------- 筛选算子 ----------------
// labelKey 指向 locale 目录键（切语言时筛选面板/高级过滤同步）；label 作中文释义与目录缺失时的回落

export const FILTER_OPS: Record<
  string,
  { label: string; labelKey: string; value: string; v2?: boolean }[]
> = {
  text: [
    { label: '包含', labelKey: 'opContains', value: 'contains' },
    { label: '不等于', labelKey: 'opNe', value: 'ne' },
    { label: '等于', labelKey: 'opEq', value: 'eq' },
    { label: '开头是', labelKey: 'opStartsWith', value: 'startsWith' },
    { label: '结尾是', labelKey: 'opEndsWith', value: 'endsWith' },
    { label: '为空', labelKey: 'opBlank', value: 'blank' },
    { label: '不为空', labelKey: 'opNotBlank', value: 'notBlank' }
  ],
  number: [
    { label: '等于', labelKey: 'opEq', value: 'eq' },
    { label: '不等于', labelKey: 'opNe', value: 'ne' },
    { label: '大于', labelKey: 'opGt', value: 'gt' },
    { label: '大于等于', labelKey: 'opGte', value: 'gte' },
    { label: '小于', labelKey: 'opLt', value: 'lt' },
    { label: '小于等于', labelKey: 'opLte', value: 'lte' },
    { label: '介于', labelKey: 'opInRange', value: 'inRange', v2: true }
  ],
  date: [
    { label: '等于', labelKey: 'opEq', value: 'eq' },
    { label: '早于', labelKey: 'opBefore', value: 'lt' },
    { label: '晚于', labelKey: 'opAfter', value: 'gt' },
    { label: '介于', labelKey: 'opInRange', value: 'inRange', v2: true }
  ],
  select: [
    { label: '包括（多选）', labelKey: 'opInMulti', value: 'in' },
    { label: '不包含（多选）', labelKey: 'opNotInMulti', value: 'notIn' }
  ]
}

const toTime = (v: any): number => {
  if (v == null || v === '') return NaN
  if (typeof v === 'number') return v
  if (v instanceof Date) return v.getTime()
  const s = String(v)
  const t = new Date(/^\d+$/.test(s) ? Number(s) : s.replace(/-/g, '/')).getTime()
  return isNaN(t) ? new Date(s).getTime() : t
}

const dayTime = (v: number) => {
  const d = new Date(v)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function matchCondition(cellVal: any, op: string, v1: any, v2: any, filterType: string): boolean {
  const empty = cellVal == null || cellVal === ''
  switch (op) {
    case 'blank':
      return empty
    case 'notBlank':
      return !empty
    case 'contains':
      return !empty && String(cellVal).toLowerCase().includes(String(v1).toLowerCase())
    case 'startsWith':
      return !empty && String(cellVal).toLowerCase().startsWith(String(v1).toLowerCase())
    case 'endsWith':
      return !empty && String(cellVal).toLowerCase().endsWith(String(v1).toLowerCase())
    case 'eq':
      if (filterType === 'date') return !empty && dayTime(toTime(cellVal)) === dayTime(toTime(v1))
      if (filterType === 'number') return Number(cellVal) === Number(v1)
      return String(cellVal ?? '') === String(v1 ?? '')
    case 'ne':
      return !matchCondition(cellVal, 'eq', v1, v2, filterType)
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (empty || v1 == null || v1 === '') return false
      if (filterType === 'date') {
        const a = toTime(cellVal)
        const b = toTime(v1)
        if (op === 'gt') return a > b
        if (op === 'gte') return a >= b
        if (op === 'lt') return a < b
        return a <= b
      }
      const a = Number(cellVal)
      const b = Number(v1)
      if (op === 'gt') return a > b
      if (op === 'gte') return a >= b
      if (op === 'lt') return a < b
      return a <= b
    }
    case 'inRange': {
      if (empty) return false
      if (filterType === 'date') {
        const a = toTime(cellVal)
        return a >= toTime(v1) && a <= dayTime(toTime(v2)) + 86399999
      }
      const a = Number(cellVal)
      return a >= Number(v1) && a <= Number(v2)
    }
    case 'in':
      return Array.isArray(v1) ? v1.map(String).includes(String(cellVal)) : false
    case 'notIn':
      return Array.isArray(v1) ? !v1.map(String).includes(String(cellVal)) : false
    default:
      return true
  }
}

function filterTypeOf(col: RjColumn): string {
  if (typeof col.filter === 'string') return col.filter
  if (col.type === 'num' || col.type === 'money' || col.type === 'percent') return 'number'
  if (col.type === 'date' || col.type === 'datetime') return 'date'
  return 'text'
}

/** 浮动筛选行文本匹配：text 包含；number 支持 >=/>/<=/</=/~/.. 区间；date 同理；select 逗号枚举 */
export function matchFloatFilter(cellVal: any, raw: string, type: string): boolean {
  const s = (raw || '').trim()
  if (!s) return true
  if (type === 'select') {
    const tokens = s
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (!tokens.length) return true
    return tokens.map(String).includes(String(cellVal ?? ''))
  }
  if (cellVal == null || cellVal === '') return false
  if (type === 'number') {
    const range = s.split(/~|\.\.|\u2013/)
    if (range.length === 2) {
      const a = Number(range[0])
      const b = Number(range[1])
      const v = Number(cellVal)
      return (!isNaN(a) ? v >= a : true) && (!isNaN(b) ? v <= b : true)
    }
    const m = s.match(/^(>=|<=|>|<|=)?\s*(-?[\d.]+)$/)
    if (!m) return String(cellVal).toLowerCase().includes(s.toLowerCase())
    const v = Number(cellVal)
    const n = Number(m[2])
    switch (m[1] || '=') {
      case '>':
        return v > n
      case '<':
        return v < n
      case '>=':
        return v >= n
      case '<=':
        return v <= n
      default:
        return v === n
    }
  }
  if (type === 'date') {
    const parts = s
      .split(/~|\uff5e/)
      .map((x) => x.trim())
      .filter(Boolean)
    if (parts.length === 2) {
      const a = toTime(parts[0])
      const b = dayTime(toTime(parts[1])) + 86399999
      const t = toTime(cellVal)
      return t >= a && t <= b
    }
    const m = s.match(/^(>=|<=|>|<|=)?\s*(.+)$/)
    const op = m?.[1] || '='
    const a = dayTime(toTime(cellVal))
    const b = dayTime(toTime(m ? m[2] : s))
    if (isNaN(a) || isNaN(b)) return false
    switch (op) {
      case '>':
        return a > b
      case '<':
        return a < b
      case '>=':
        return a >= b
      case '<=':
        return a <= b
      default:
        return a === b
    }
  }
  return String(cellVal).toLowerCase().includes(s.toLowerCase())
}

// ---------------- 值访问 ----------------

/** 公式计算结果影子（按行对象持有，非响应式：避免 processed 读写自依赖导致的循环失效） */
const fxMap = new WeakMap<object, Record<string, any>>()

/** 单元格基础值（忽略公式影子，供公式引擎读取输入原值） */
function rawCellValue(col: RjColumn, row: RjRowData): any {
  if (!col || !row) return undefined
  if ((row as any).__group) return undefined
  const vg = col.valueGetter
  if (!vg) return getValueByPath(row, col.field)
  if (typeof vg === 'function') return vg(row)
  if (isExpression(vg)) {
    const fn = compileExpression(vg)
    if (fn)
      return fn({
        value: getValueByPath(row, col.field),
        data: row,
        row,
        node: row,
        colId: colIdOf(col),
        column: col
      })
  }
  return undefined
}

/** 单元格原始值（编辑/导出/排序/过滤统一入口；优先返回公式计算结果） */
export function cellRawValue(col: RjColumn, row: RjRowData): any {
  if (!col) return undefined
  if ((row as any).__group) {
    const agg = (row as any).__agg as Record<string, any>
    const id = colIdOf(col)
    if (agg && id in agg) return agg[id]
    if (col.field && col.field in row && !(col as any).__isGroupValue)
      return (row as any)[col.field]
    // 组行里没有这一列的聚合项就留空：拿 Object.values(agg)[0] 兜底等于把别的列的聚合值
    // 冒充过来（透视组合列与聚合键不同源时，「齐套率」会整列显示成「单价」的合计）
    return undefined
  }
  const fx = fxMap.get(row)
  if (fx) {
    const id = colIdOf(col)
    if (id in fx) return fx[id]
  }
  const vg = col.valueGetter
  if (!vg) return getValueByPath(row, col.field)
  if (typeof vg === 'function') return vg(row)
  if (isExpression(vg)) {
    const fn = compileExpression(vg)
    if (fn)
      return fn({
        value: getValueByPath(row, col.field),
        data: row,
        row,
        node: row,
        colId: colIdOf(col),
        column: col
      })
  }
  return undefined
}

/**
 * 透视度量列判定。生成组合列（buildPivotCols）与聚合取值（buildPivotRows）必须共用这一条
 * 判定，否则表头里存在的组合列在行 __agg 中找不到键。
 */
export function isPivotValueCol(c: RjColumn): boolean {
  if (!c.aggFunc) return false
  if (c.type === 'num' || c.type === 'money' || c.type === 'percent') return true
  const key = c.field || colIdOf(c)
  return !!key && !/name|code|no$/i.test(key)
}

/** 透视度量列的稳定指标键：只有 colId 没有 field 的表达式列也要能唯一编码进组合列 id */
export function pivotValueKey(c: RjColumn): string {
  return c.field || colIdOf(c)
}

// ---------------- 行模型 ----------------

export interface RowModelOptions {
  rowKey: () => string | undefined
  rowHeight: () => number
  detailHeight: () => number
  fullWidthHeight: () => number
  hasDetailSlot: () => boolean
  /** 是否启用分组页脚行 */
  groupFooter?: () => boolean
  /**
   * 组行显示标签的取法（客户端分组专用）：用被分组列的 formatter 把组值转成显示文本。
   * 不给就原样用原始值。只影响 __groupLabels 的显示，__groupValue/组键/组 path 仍为原始值。
   */
  groupLabelOf?: (col: RjColumn | undefined, value: any, row: RjRowData) => any
  /** 服务端权威分组：分组/聚合由后端完成，客户端不重建组树 */
  serverGrouping?: () => boolean
  /** SSRM：判定某行是否为可展开的服务端分组行（缺省按组行有子行即可展开） */
  isServerSideGroup?: (data: RjRowData) => boolean
  isFullWidthRow: (row: RjRowData) => boolean
  loadData?: (params: RjLoadServerParams) => Promise<{ list?: any[]; rows?: any[]; total: number }>
  dataMode: () => RjDataMode
  pageSize: () => number
  treeData: () => boolean
  childrenField: () => string
  parentField: () => string
  /** SSRM：每块行数（serverSide 模式） */
  ssrmBlockSize?: () => number
  /** SSRM：缓存中最多保留的已加载块数 */
  ssrmMaxBlocks?: () => number
  /** SSRM：视口外额外保留块数 */
  ssrmOverflow?: () => number
  /** 公式：有序叶子列（按可见顺序，A/B/C 字母按索引映射），由主组件注入 */
  formulaColumns?: () => RjColumn[]
  /** 公式：单元格级公式表，key=`${rowKey}::${colId}` → 公式文本 */
  cellFormulas?: () => Map<string, string>
  /** 引擎生成列/行的文案（透视总计等），由主组件按当前语言注入；缺省回落中文 */
  labels?: () => { total: string; grandTotal: string; totalOf: (title: string) => string }
}

/**
 * 服务端加载上下文：loadData 透出的排序 / 过滤 / 分组 / 查询条件快照。
 * 声明在模块层并导出：useRowModel 的返回值携带 setLoadCtx，留在函数体内会让生成的
 * .d.ts 出现 TS4060（private name），发布类型声明就断了。
 */
export interface LoadCtx {
  sort: RjSortState[]
  filters: { field: string; model: RjFilterModel }[]
  quickFilterText: string
  floatFilters?: { colId: string; value: string }[]
  rowGroup?: { field: string; aggFunc?: string }[]
  advancedFilter?: AdvFilterGroup | null
  queryConditions?: RjQueryCondition[]
}

/** labels 未注入时的内置中文兜底 */
const ROW_MODEL_LABELS_ZH = {
  total: '合计',
  grandTotal: '总计',
  totalOf: (title: string) => `总${title}`
}

export function useRowModel(userRows: () => RjRowData[], opts: RowModelOptions) {
  /** 内部数据副本（客户端模式的编辑/事务落在副本上） */
  let internalRows: RjRowData[] | null = null
  /** 引擎自生成文案（在 computed 里调用可随主组件语言响应） */
  const L = () => opts.labels?.() ?? ROW_MODEL_LABELS_ZH
  /** rev 驱动所有派生计算重算（避免全量深度响应式的开销） */
  const rev = ref(0)
  const serverRev = ref(0)

  // 服务端状态
  const serverRows = ref<RjRowData[]>([])
  const serverTotal = ref(0)
  const loadingMore = ref(false)
  const serverLoading = ref(false)
  let serverLoadedCount = 0

  /** 用户数据变化时重置内部副本 */
  watch(
    userRows,
    (v) => {
      if (opts.dataMode() === 'client') {
        internalRows = null
        serverRows.value = []
        rev.value++
        void v
      } else {
        reloadServer()
      }
    },
    { flush: 'post' }
  )

  const sourceRows = (): RjRowData[] => {
    const mode = opts.dataMode()
    if (mode === 'serverSide') return ssrmStore().slots.filter(Boolean) as RjRowData[]
    if (mode !== 'client') return serverRows.value
    if (!internalRows) internalRows = userRows().slice()
    return internalRows
  }

  function touch() {
    rev.value++
  }

  /** 仅顺序变更信号：行拖拽重排用它。processed 依赖它刷新展示序，而 summaryRow 等
   *  顺序无关的派生不依赖 → 免去每拖一次就对全量行重算一遍聚合（求和/均值与行序无关） */
  const orderRev = ref(0)
  function touchOrder() {
    orderRev.value++
  }

  // ---------------- 事务（实时更新） ----------------
  const flashRows = ref(new Set<string | number>())

  function applyTransaction(tx: RjTransaction) {
    if (opts.dataMode() === 'serverSide') {
      // SSRM：就地应用于块缓存（update 不位移 / add 追加 / remove 左移），闪烁高亮
      const s = ssrmStore()
      const res = s.applyDelta(tx)
      if (res.flash.length) {
        res.flash.forEach((k) => flashRows.value.add(k))
        setTimeout(() => (flashRows.value = new Set()), 900)
      }
      serverTotal.value = s.rowCount > 0 ? s.rowCount : serverTotal.value
      serverRev.value++
      return
    }
    if (opts.dataMode() !== 'client') {
      // 服务端模式仅追加展示
      if (tx.add?.length) serverRows.value.push(...tx.add)
      if (tx.update?.length) {
        const key = opts.rowKey()
        tx.update.forEach((u) => {
          const i = serverRows.value.findIndex((r) => r[key!] === u[key!])
          if (i >= 0) serverRows.value[i] = u
        })
      }
      serverRev.value++
      return
    }
    const rows = sourceRows()
    const key = opts.rowKey()
    const keyOf = (r: RjRowData) => (key ? r[key] : rowKeyOf(r))
    if (tx.remove?.length) {
      // 按 key 集合整批重过滤：勿在遍历快照时下标时对活数组 splice（会删错相邻行）
      const del = new Set(tx.remove.map(keyOf))
      const kept = rows.filter((r) => !del.has(keyOf(r)))
      rows.length = 0
      rows.push(...kept)
    }
    if (tx.update?.length) {
      tx.update.forEach((u) => {
        const i = rows.findIndex((r) => keyOf(r) === keyOf(u))
        if (i >= 0) {
          rows[i] = u
          flashRows.value.add(keyOf(u))
        }
      })
    }
    if (tx.upsert?.length) {
      tx.upsert.forEach((u) => {
        const i = rows.findIndex((r) => keyOf(r) === keyOf(u))
        if (i >= 0) rows[i] = u
        else rows.unshift(u)
      })
    }
    if (tx.add?.length) {
      if (tx.addIndex != null && tx.addIndex >= 0) rows.splice(tx.addIndex, 0, ...tx.add)
      else rows.push(...tx.add)
      tx.add.forEach((r) => flashRows.value.add(keyOf(r)))
    }
    rev.value++
    setTimeout(() => {
      flashRows.value = new Set()
    }, 900)
  }

  /** 编辑提交时写回行 */
  function setRowValue(row: RjRowData, col: RjColumn, value: any) {
    if (col.valueGetter || !col.field) return false
    const ok = setValueByPath(row, col.field, value === '' ? null : value)
    flashRows.value.add(rowKeyOf(row, opts.rowKey()))
    setTimeout(() => (flashRows.value = new Set()), 900)
    touch()
    return ok
  }

  function setRowData(rows: RjRowData[]) {
    internalRows = rows.slice()
    serverRows.value = []
    touch()
  }

  // ---------------- 服务端加载 ----------------

  let loadCtx: LoadCtx = { sort: [], filters: [], quickFilterText: '', floatFilters: [] }
  let loadSeq = 0

  function setLoadCtx(ctx: LoadCtx) {
    loadCtx = ctx
  }

  async function fetchServer(reset: boolean, startOverride?: number) {
    const mode = opts.dataMode()
    if (mode === 'client' || !opts.loadData) return
    const seq = ++loadSeq
    const pageSize = mode === 'pagination' ? opts.pageSize() : Math.max(opts.pageSize(), 100)
    const start = startOverride ?? (reset ? 0 : serverLoadedCount)
    serverLoading.value = !reset || start === 0
    loadingMore.value = reset || start > 0
    try {
      const page = Math.floor(start / pageSize) + 1
      const res = await opts.loadData({
        start,
        end: start + pageSize - 1,
        page,
        pageSize,
        sort: loadCtx.sort,
        filters: loadCtx.filters,
        quickFilterText: loadCtx.quickFilterText,
        floatFilters: loadCtx.floatFilters || [],
        rowGroup: loadCtx.rowGroup || [],
        advancedFilter: loadCtx.advancedFilter || null,
        queryConditions: queryConditions.value.slice()
      })
      if (seq !== loadSeq) return
      const list = res.rows || res.list || []
      serverTotal.value = res.total ?? list.length
      if (reset) {
        serverRows.value = list
        // 整页重取（首次/翻页/条件变更）：旧组 path 的子块与折叠态不再对应，一并作废
        if (serverGroupKids.value.size || serverGroupLoading.value.size) resetServerGroupView(false)
      } else {
        serverRows.value = serverRows.value.concat(list)
      }
      serverLoadedCount = start + list.length
      serverRev.value++
    } finally {
      if (seq === loadSeq) {
        serverLoading.value = false
        loadingMore.value = false
      }
    }
  }

  function fetchPage(page: number, size: number) {
    return fetchServer(true, (page - 1) * size)
  }

  function reloadServer() {
    if (opts.dataMode() === 'serverSide') {
      // SSRM：清空块缓存，下一帧由 ensureServerBlocks 重新探测块 0
      purgeServerSideCache()
      return
    }
    serverLoadedCount = 0
    fetchServer(true)
  }

  function fetchMore() {
    const mode = opts.dataMode()
    if (mode === 'client' || !opts.loadData) return
    if (loadingMore.value || serverLoading.value) return
    if (mode === 'infinite' && serverLoadedCount >= serverTotal.value && serverTotal.value > 0)
      return
    fetchServer(false)
  }

  function allServerLoaded() {
    return (
      opts.dataMode() !== 'infinite' ||
      (serverTotal.value > 0 && serverLoadedCount >= serverTotal.value)
    )
  }

  // ---------------- SSRM 服务端行模型（serverSide：块缓存 + Delta） ----------------
  let ssrm: SsrmStore | null = null
  function ssrmStore(): SsrmStore {
    if (!ssrm) {
      ssrm = new SsrmStore({
        blockSize: opts.ssrmBlockSize ? opts.ssrmBlockSize() : 100,
        maxBlocksInCache: opts.ssrmMaxBlocks ? opts.ssrmMaxBlocks() : 10,
        cacheOverflow: opts.ssrmOverflow ? opts.ssrmOverflow() : 4,
        keyOf: (r) => {
          const k = opts.rowKey()
          return k && r[k] != null ? r[k] : rowKeyOf(r)
        }
      })
    }
    return ssrm
  }
  let ssrmBusy = false

  /** 异步事务批量器：高频推送合并后统一应用 */
  const ssrmBatcher = new SsrmTxBatcher((tx) => {
    const s = ssrmStore()
    const res = s.applyDelta(tx)
    if (res.flash.length) {
      res.flash.forEach((k) => flashRows.value.add(k))
      setTimeout(() => (flashRows.value = new Set()), 900)
    }
    serverTotal.value = s.rowCount > 0 ? s.rowCount : serverTotal.value
    serverRev.value++
  })

  /** 加载单个块（带 seq 竞态守卫） */
  async function ssrmLoadBlock(s: SsrmStore, b: number): Promise<boolean> {
    if (!opts.loadData || s.isBlockBusy(b)) return false
    const start = s.startRowOf(b)
    const end = start + s.blockSize - 1
    const seq = s.beginLoad(b)
    try {
      const res = await opts.loadData({
        start,
        end,
        page: Math.floor(start / s.blockSize) + 1,
        pageSize: s.blockSize,
        sort: loadCtx.sort,
        filters: loadCtx.filters,
        quickFilterText: loadCtx.quickFilterText,
        floatFilters: loadCtx.floatFilters || [],
        rowGroup: loadCtx.rowGroup || [],
        advancedFilter: loadCtx.advancedFilter || null,
        queryConditions: queryConditions.value.slice(),
        type: 'select'
      })
      const list = res.rows || res.list || []
      const total = res.total != null ? res.total : (res as any).lastRow
      if (typeof total === 'number' && total >= 0) {
        s.configure(total)
        serverTotal.value = total
      }
      const applied = s.commitLoad(b, seq, list)
      if (applied) serverRev.value++
      return applied
    } catch {
      s.failLoad(b, seq)
      return false
    }
  }

  /** 按视口区间调度取数 + 淘汰（防并发重叠） */
  async function ensureServerBlocks(first: number, last: number) {
    if (opts.dataMode() !== 'serverSide' || !opts.loadData) return
    const s0 = ssrmStore()
    // 总数未知（首屏 / purge 后）：先探 block 0 拿回 total。必须排在分组下标换算之前——
    // 此时 sgAbsAt 还是上一代的陈旧映射（分组视图下视口可能全落在懒取子行 abs=-1），
    // 若先换算再早退，缓存被清空后就再没人探块 0，表格会锁死在 0 行。
    if (s0.rowCount <= 0) {
      serverLoading.value = true
      await ssrmLoadBlock(s0, 0)
      serverLoading.value = false
      serverRev.value++
    }
    // 分组视图：显示下标≠绝对行号，先经 absAt 换算为稠密槽区间
    if (opts.serverGrouping?.() && rowGroupFields.value.length) {
      let lo = -1
      let hi = -1
      for (let i = first; i <= last; i++) {
        const a = sgAbsAt[i]
        if (a == null || a < 0) continue
        if (lo < 0 || a < lo) lo = a
        if (a > hi) hi = a
      }
      if (lo < 0) return // 视口全在懒取子项/空洞之外：根块已探测过就不补
      first = lo
      last = hi
    }
    const s = ssrmStore()
    if (ssrmBusy) return
    const need = s.planLoad(first, last, s.blockSize)
    if (!need.length) return
    ssrmBusy = true
    try {
      await Promise.all(need.map((b) => ssrmLoadBlock(s, b)))
      const evicted = s.prune(s.keepSet(first, last))
      serverRev.value++
      void evicted
    } finally {
      ssrmBusy = false
    }
  }

  /** 重置块缓存（refresh purge / 模式切换） */
  function purgeServerSideCache() {
    if (ssrm) ssrm.reset()
    serverTotal.value = 0
    resetServerGroupView(false)
    serverRev.value++
  }

  /** 刷新服务端：purge 后重新拉取视口 */
  async function refreshServerSide(purge = true) {
    if (purge) purgeServerSideCache()
    await ensureServerBlocks(0, ssrmStore().blockSize - 1)
  }

  // ---------------- 过滤 / 排序 / 分组状态 ----------------

  const quickFilter = ref('')
  const filterModels = reactive(new Map<string, RjFilterModel>())
  /** 查询条件栏（queryable）：字段 + 运算符 + 值；client 模式在此参与过滤，服务端模式透出给 loadData */
  const queryConditions = ref<RjQueryCondition[]>([])
  /** 浮动筛选行：colId → 原始文本 */
  const floatFilters = reactive(new Map<string, string>())
  /** 高级过滤：跨列 AND/OR 表达式树（对标 AG Grid Advanced Filter） */
  const advancedFilter = ref<AdvFilterGroup | null>(null)
  const sortStates = ref<RjSortState[]>([])
  const rowGroupFields = ref<string[]>([])
  /** NLQ「取前 N 行」(TopN) 显示限量：0=不限量。在排序/过滤之后、构行之前截断 */
  const rowLimit = ref(0)
  const pivotState = ref({ cols: [] as string[], values: [] as string[], active: false })
  const expandedGroups = ref(new Set<string>())
  const expandedTree = ref(new Set<string>())
  const expandedDetails = ref(new Set<string | number>())
  const defaultExpandAll = ref(false)
  const firstExpansionDone = ref(false)

  function passFilter(rows: RjRowData[], cols: RjColumn[]): RjRowData[] {
    const queryConds = activeQueryConditions(queryConditions.value)
    const queryColOf = queryConds.length
      ? (f: string) => cols.find((c) => c.field === f || colIdOf(c) === f)
      : undefined
    if (queryConds.length && queryColOf) {
      rows = rows.filter((row) =>
        queryConds.every((c) => {
          const col = queryColOf(c.field)
          const raw = col?.filterValueGetter
            ? col.filterValueGetter(row)
            : col
              ? cellRawValue(col, row)
              : getValueByPath(row, c.field)
          return matchQueryValue(raw, c, col ? kindOfColumn(col) : 'text')
        })
      )
    }
    const active = cols
      .filter((c) => filterModels.has(colIdOf(c)))
      .map((c) => ({ col: c, model: filterModels.get(colIdOf(c))!, type: filterTypeOf(c) }))
    const floats = Array.from(floatFilters.entries()).filter(([, v]) => v && v.trim())
    const colById = new Map(cols.map((c) => [colIdOf(c), c]))
    const quick = quickFilter.value.trim().toLowerCase()
    const quickCols = quick
      ? cols.filter(
          (c) =>
            c.field &&
            c.filter !== false &&
            !c.checkbox &&
            !c.rowDrag &&
            c.type !== 'link' &&
            c.type !== 'image'
        )
      : []
    if (!active.length && !quick && !floats.length && !advancedFilter.value) return rows
    const adv = advancedFilter.value
    return rows.filter((row) => {
      for (const { col, model, type } of active) {
        const val = col.filterValueGetter ? col.filterValueGetter(row) : cellRawValue(col, row)
        const ok = evalConditions(model.conditions, model.operator, (cond) =>
          matchCondition(val, cond.op, cond.value1, cond.value2, type)
        )
        if (!ok) return false
      }
      if (adv) {
        const okAdv = evalAdvancedFilter(adv, (ac) => {
          const col = colById.get(ac.colId)
          if (!col) return true
          const val = col.filterValueGetter ? col.filterValueGetter(row) : cellRawValue(col, row)
          return matchCondition(
            val,
            ac.condition.op,
            ac.condition.value1,
            ac.condition.value2,
            ac.filterType || filterTypeOf(col)
          )
        })
        if (!okAdv) return false
      }
      for (const [id, raw] of floats) {
        const col = colById.get(id)
        if (!col) continue
        const val = col.filterValueGetter ? col.filterValueGetter(row) : cellRawValue(col, row)
        if (!matchFloatFilter(val, raw, filterTypeOf(col))) return false
      }
      if (quick) {
        const hit = quickCols.some((c) => {
          const v = cellRawValue(c, row)
          return v != null && String(v).toLowerCase().includes(quick)
        })
        if (!hit) return false
      }
      return true
    })
  }

  function comparatorOf(col: RjColumn | undefined, dir: 'asc' | 'desc') {
    const sign = dir === 'asc' ? 1 : -1
    return (a: RjRowData, b: RjRowData): number => {
      const va = col ? cellRawValue(col, a) : (a as any).__group?.v
      const vb = col ? cellRawValue(col, b) : (b as any).__group?.v
      if (col?.comparator) return col.comparator(va, vb, a, b) * sign
      return defaultComparator(va, vb) * sign
    }
  }

  function sortRows(rows: RjRowData[], cols: RjColumn[]): RjRowData[] {
    if (!sortStates.value.length) return rows
    const accessors = sortStates.value.map((s) => {
      const col = cols.find((c) => c.field === s.field || colIdOf(c) === s.field)
      return { col, sign: s.dir === 'asc' ? 1 : -1 }
    })
    // 装饰-排序-去装饰：取值(cellRawValue，含 field 路径/valueGetter)每行仅算一次，
    // 避免比较器内 O(n log n) 次重复取值（大数据下排序的主要热点）
    const decorated = rows.map((r) => ({
      r,
      vals: accessors.map((a) => (a.col ? cellRawValue(a.col, r) : undefined))
    }))
    decorated.sort((x, y) => {
      for (let i = 0; i < accessors.length; i++) {
        const { col, sign } = accessors[i]
        const va = x.vals[i]
        const vb = y.vals[i]
        const cmp = col?.comparator ? col.comparator(va, vb, x.r, y.r) : defaultComparator(va, vb)
        if (cmp !== 0) return cmp * sign
      }
      return 0
    })
    return decorated.map((d) => d.r)
  }

  // ---------------- 分组 + 聚合 ----------------

  interface GroupNode {
    value: any
    rows: RjRowData[]
    children: GroupNode[]
    depth: number
    path: string
  }

  function buildGroupTree(rows: RjRowData[], fields: string[], cols: RjColumn[]): GroupNode[] {
    const groupCols = fields.map((f) => cols.find((c) => c.field === f || colIdOf(c) === f))
    const build = (level: number, list: RjRowData[], parentPath: string): GroupNode[] => {
      if (level >= fields.length) return []
      const map = new Map<any, RjRowData[]>()
      list.forEach((r) => {
        const v = cellRawValue(groupCols[level]!, r) ?? ''
        if (!map.has(v)) map.set(v, [])
        map.get(v)!.push(r)
      })
      const nodes: GroupNode[] = []
      Array.from(map.entries())
        .sort((a, b) => defaultComparator(a[0], b[0]))
        .forEach(([value, bucket]) => {
          const path = `${parentPath}|${level}|${String(value)}`
          const node: GroupNode = {
            value,
            rows: bucket,
            children: build(level + 1, bucket, path),
            depth: level,
            path
          }
          nodes.push(node)
        })
      return nodes
    }
    return build(0, rows, '')
  }

  function makeGroupRow(
    node: GroupNode,
    cols: RjColumn[],
    fields: string[],
    labels: any[] = []
  ): RjRowData {
    const agg: Record<string, any> = {}
    cols.forEach((c) => {
      if (!c.aggFunc) return
      const vals = node.rows.map((r) => cellRawValue(c, r))
      agg[colIdOf(c)] = runAgg(c.aggFunc, node.rows, vals)
    })
    const data: RjRowData = {
      __group: true,
      __agg: agg,
      __count: node.rows.length,
      __path: node.path,
      __level: node.depth,
      __groupField: fields[node.depth],
      __groupValue: node.value,
      __groupLabels: labels.length ? labels : [node.value]
    }
    data[fields[node.depth]] = node.value
    // 组行标题走被分组列的 formatter：否则客户端分组显示的是原始字典值（「1(60)」），
    // 而同一行的单元格却显示 目录/菜单/按钮，自相矛盾。服务端分组的 __groupLabels 由后端
    // 直接给显示文本，不经这条路。每一级标签用它自己那一列的口径，父级不会被子级列顶错。
    // 只改显示文本：__groupValue / 组键 / path 保持原始值，折叠态与持久化不受影响。
    if (opts.groupLabelOf) {
      const colOfField = (f: string | undefined) =>
        cols.find((c) => (f && c.field === f) || (!!f && colIdOf(c) === f))
      data.__groupLabels = ((data as any).__groupLabels as any[]).map((v, i) =>
        opts.groupLabelOf!(colOfField(fields[i]), v, data)
      )
    }
    return data
  }

  function flattenGroups(
    nodes: GroupNode[],
    out: RjDisplayRow[],
    cols: RjColumn[],
    fields: string[],
    parentKey: string | number,
    parentLabels: any[] = []
  ) {
    const dir = sortStates.value.find((s) => fields.includes(s.field))?.dir || 'asc'
    const ordered = dir === 'desc' ? nodes.slice().reverse() : nodes
    ordered.forEach((node) => {
      const labels = [...parentLabels, node.value]
      const groupRow = makeGroupRow(node, cols, fields, labels)
      const key = node.path
      const expanded = defaultExpandAll.value
        ? true
        : expandedGroups.value.has(key) || (!firstExpansionDone.value && true)
      out.push({
        key,
        type: 'group',
        data: groupRow,
        level: node.depth,
        parentKey,
        expanded,
        height: opts.rowHeight()
      })
      if (expanded) {
        if (node.children.length) flattenGroups(node.children, out, cols, fields, key, labels)
        else node.rows.forEach((r) => pushDataRow(out, r, node.depth + 1, key))
        if (opts.groupFooter?.())
          out.push({
            key: key + ':footer',
            type: 'group',
            data: groupRow,
            level: node.depth,
            parentKey: key,
            expanded: true,
            isFooter: true,
            height: opts.rowHeight()
          })
      }
    })
  }

  function pushDataRow(
    out: RjDisplayRow[],
    r: RjRowData,
    level: number,
    parentKey?: string | number
  ) {
    const key = rowKeyOf(r, opts.rowKey())
    out.push({ key, type: 'row', data: r, level: 0, parentKey, height: opts.rowHeight() })
    if (level > 0) out[out.length - 1].level = 0 // 数据行不缩进（组缩进已表达）
    if (opts.hasDetailSlot() && expandedDetails.value.has(key))
      out.push({
        key: `detail:${key}`,
        type: 'detail',
        data: r,
        level,
        parentKey: key,
        height: opts.detailHeight()
      })
    else if (opts.isFullWidthRow(r))
      out.push({
        key: `fw:${key}`,
        type: 'fullwidth',
        data: r,
        level,
        parentKey: key,
        height: opts.fullWidthHeight()
      })
  }

  // ---------------- 树数据 ----------------

  function buildTreeRows(rows: RjRowData[]): {
    roots: RjRowData[]
    childrenMap: Map<RjRowData, RjRowData[]>
  } {
    const childrenField = opts.childrenField()
    const parentField = opts.parentField()
    const childrenMap = new Map<RjRowData, RjRowData[]>()
    let roots: RjRowData[]
    if (parentField) {
      const byKey = new Map<any, RjRowData>()
      rows.forEach((r) => byKey.set(r[opts.rowKey() || 'id'], r))
      roots = []
      rows.forEach((r) => {
        const p = byKey.get(r[parentField])
        if (p && p !== r) {
          if (!childrenMap.has(p)) childrenMap.set(p, [])
          childrenMap.get(p)!.push(r)
        } else roots.push(r)
      })
    } else {
      roots = rows
    }
    // childrenField 模式：递归登记每一层节点的子节点，保证任意深度都能展开
    // （旧实现只遍历顶层 rows，导致第 3 层及更深的 children 未入 childrenMap，无法展开）
    if (!parentField) {
      const walk = (list: RjRowData[]) => {
        for (const r of list) {
          const kids = (r as any)[childrenField]
          if (Array.isArray(kids) && kids.length) {
            childrenMap.set(r, kids)
            walk(kids)
          }
        }
      }
      walk(rows)
    }
    return { roots, childrenMap }
  }

  function flattenTree(
    rows: RjRowData[],
    cols: RjColumn[],
    out: RjDisplayRow[],
    childrenMap: Map<RjRowData, RjRowData[]>,
    level: number
  ) {
    const sorted = sortRows(rows, cols)
    sorted.forEach((r) => {
      const key = rowKeyOf(r, opts.rowKey())
      const kids = childrenMap.get(r)
      out.push({
        key,
        type: 'row',
        data: r,
        level,
        expanded: kids?.length
          ? defaultExpandAll.value
            ? true
            : expandedTree.value.has(String(key))
          : undefined,
        height: opts.rowHeight()
      })
      if (kids?.length && out[out.length - 1].expanded)
        flattenTree(kids, cols, out, childrenMap, level + 1)
    })
  }

  function collectTreeKeys(
    rows: RjRowData[],
    childrenMap: Map<RjRowData, RjRowData[]>,
    out: Set<string>
  ) {
    rows.forEach((r) => {
      out.add(String(rowKeyOf(r, opts.rowKey())))
      const kids = childrenMap.get(r) || (r as any)[opts.childrenField()]
      if (Array.isArray(kids) && kids.length) collectTreeKeys(kids, childrenMap, out)
    })
  }

  // ---------------- 透视 ----------------

  /**
   * 透视列组合上限：高基数维度（物料编码/ID 等）会同时引爆列数与「组合数 × 行数」的聚合规模，
   * 不卡住主线程就永远看不到结果。超限按字典序保留前 N 个组合（透视本身就是分析型降级视图）。
   */
  const PIVOT_MAX_COMBOS = 200

  function buildPivotCols(cols: RjColumn[]): RjColumn[] {
    const { cols: pivotFields, values: valueFields, active } = pivotState.value
    if (!active || !pivotFields.length) return []
    const src = pivotDimCols(cols, pivotFields)
    if (!src.length) return []
    // 透视维度的唯一值组合
    const combos: any[][] = [[]]
    src.forEach((c) => {
      const vals = Array.from(
        new Set(
          sourceRows()
            .slice(0, 20000)
            .map((r) => cellRawValue(c, r))
            .filter((v) => v != null && v !== '')
            .map(String)
        )
      ).sort()
      for (let i = combos.length - 1; i >= 0; i--) {
        const base = combos.splice(i, 1)[0]
        vals.forEach((v) => combos.push([...base, v]))
      }
    })
    if (combos.length > PIVOT_MAX_COMBOS) combos.length = PIVOT_MAX_COMBOS
    const valueCols = pivotValueCols(cols, valueFields)
    if (!valueCols.length) return []
    // 行维标签列来自 rowGroupFields（行分组字段），与透视列维度(src)解耦；与 buildPivotRows 的 __pvrow 键对齐
    const rowDimFields = rowGroupFields.value
    const out: RjColumn[] = rowDimFields.map((f, i) => {
      const c = cols.find((x) => x.field === f || colIdOf(x) === f)
      return {
        field: `__pvrow${i}:${f}`,
        colId: `__pvrow${i}:${f}`,
        title: c?.title || f,
        width: 120,
        rowGroup: true
      }
    })
    combos.forEach((combo) => {
      const comboTitle = combo.join(' / ')
      const group: RjColumn = {
        colId: `__pv:${combo.join('_')}`,
        title: comboTitle,
        children: valueCols.map((vc) => ({
          field: `__pvv:${combo.join('_')}:${pivotValueKey(vc)}`,
          colId: `__pvv:${combo.join('_')}:${pivotValueKey(vc)}`,
          title: vc.title || pivotValueKey(vc),
          width: 100,
          // percent / money 必须原样透传：压成 num 会让透视格露出裸浮点（0.5072135976828828 而不是 50.72%）
          type: vc.type === 'money' || vc.type === 'percent' ? vc.type : ('num' as const),
          // 源度量列的 formatter 一并继承：否则同一列在透视前后口径不一致（普通格 7,878.04 / 透视格 ¥7,878.04）
          formatter: vc.formatter,
          align: 'right' as const,
          aggFunc: vc.aggFunc || 'sum'
        }))
      }
      out.push(group)
    })
    // 行总计列（跨全部透视列组合，按 value 指标聚合），仅当有多个组合时才有意义
    if (combos.length > 1 && valueCols.length) {
      const totalGroup: RjColumn = {
        colId: '__pvtotal',
        title: L().total,
        children: valueCols.map((vc) => ({
          field: `__pvt:${pivotValueKey(vc)}`,
          colId: `__pvt:${pivotValueKey(vc)}`,
          title: L().totalOf(vc.title || pivotValueKey(vc) || ''),
          width: 110,
          type: vc.type === 'money' || vc.type === 'percent' ? vc.type : ('num' as const),
          formatter: vc.formatter,
          align: 'right' as const,
          aggFunc: vc.aggFunc || 'sum'
        }))
      }
      out.push(totalGroup)
    }
    return out
  }

  function buildPivotRows(rows: RjRowData[], cols: RjColumn[]): RjDisplayRow[] {
    const out: RjDisplayRow[] = []
    const { cols: pivotFields, values: valueFields, active } = pivotState.value
    if (!active || !pivotFields.length) return out
    const srcCols = pivotDimCols(cols, pivotFields)
    const valueCols = pivotValueCols(cols, valueFields)
    const combos = Array.from(
      new Set(rows.map((r) => srcCols.map((c) => String(cellRawValue(c, r) ?? '')).join('\u0001')))
    )
      .sort()
      .slice(0, PIVOT_MAX_COMBOS)
    // 行维 = 分组字段（rowGroupFields）或总计单行
    const rowDims = rowGroupFields.value
    const hasTotalCol = combos.length > 1 && valueCols.length > 0
    // 对给定行集：按 combo 聚合每个 value 指标，并算跨 combo 的行总计
    const aggRowSet = (rowSet: RjRowData[]): Record<string, any> => {
      const agg: Record<string, any> = {}
      // 一次分桶代替「每个组合全表 filter」：后者是 O(组合数×行数)，高基数下会直接挂死主线程
      const buckets = new Map<string, RjRowData[]>()
      rowSet.forEach((r) => {
        const k = srcCols.map((c) => String(cellRawValue(c, r) ?? '')).join('\u0001')
        const b = buckets.get(k)
        if (b) b.push(r)
        else buckets.set(k, [r])
      })
      combos.forEach((comboKey) => {
        const subset = buckets.get(comboKey) || []
        valueCols.forEach((vc) => {
          const id = `__pvv:${comboKey.replace(/\u0001/g, '_')}:${pivotValueKey(vc)}`
          agg[id] = runAgg(
            vc.aggFunc || 'sum',
            subset,
            subset.map((r) => cellRawValue(vc, r))
          )
        })
      })
      if (hasTotalCol)
        valueCols.forEach((vc) => {
          agg[`__pvt:${pivotValueKey(vc)}`] = runAgg(
            vc.aggFunc || 'sum',
            rowSet,
            rowSet.map((r) => cellRawValue(vc, r))
          )
        })
      return agg
    }
    const renderRow = (dimRows: RjRowData[], labelVals: any[], path: string) => {
      const agg = aggRowSet(dimRows)
      const data: RjRowData = {
        __group: true,
        __agg: agg,
        __pivot: true,
        __path: path,
        __level: 0,
        __count: dimRows.length,
        __groupValue: labelVals.length ? labelVals[labelVals.length - 1] : L().grandTotal,
        __groupLabels: labelVals.length ? labelVals : [L().grandTotal]
      }
      srcCols.forEach((c) => {
        data[c.field!] = undefined
      })
      labelVals.forEach((v, i) => {
        data[`__pvrow${i}:${rowDims[i]}`] = v
      })
      out.push({ key: path, type: 'group', data, level: 0, height: opts.rowHeight() })
    }
    if (rowDims.length) {
      const tree = buildGroupTree(rows, rowDims, cols)
      const walk = (nodes: GroupNode[], labels: any[], path: string) => {
        nodes.forEach((n) => {
          const np = `${path}|${n.depth}|${String(n.value)}`
          const nl = [...labels, n.value]
          if (!n.children.length) renderRow(n.rows, nl, np)
          else {
            renderRow(n.rows, nl, np)
            walk(n.children, nl, np)
          }
        })
      }
      walk(tree, [], '')
      // 列总计（跨全部行）——仅当存在多条数据行时追加总计行
      if (out.length > 1) {
        const totalAgg = aggRowSet(rows)
        const totalData: RjRowData = {
          __group: true,
          __agg: totalAgg,
          __pivot: true,
          __pivotTotal: true,
          __path: '__grandtotal',
          __level: 0,
          __count: rows.length,
          __groupValue: L().grandTotal
        }
        srcCols.forEach((c) => {
          totalData[c.field!] = undefined
        })
        if (rowDims[0]) totalData[`__pvrow0:${rowDims[0]}`] = L().grandTotal
        out.push({
          key: '__grandtotal',
          type: 'group',
          data: totalData,
          level: 0,
          height: opts.rowHeight()
        })
      }
    } else {
      renderRow(rows, [], '__total')
    }
    return out
  }

  function collectLeaf(cols: RjColumn[]): RjColumn[] {
    const out: RjColumn[] = []
    cols.forEach((c) => {
      if (c.children?.length) out.push(...collectLeaf(c.children))
      else out.push(c)
    })
    return out
  }

  /**
   * 透视列维度解析：必须下钻到叶子，否则声明在分组表头（children）下的维度会被整个丢掉，
   * 生成列与聚合行也会因此不同源。
   */
  function pivotDimCols(source: RjColumn[], fields: string[]): RjColumn[] {
    return collectLeaf(source).filter(
      (c) => fields.includes(c.field!) || fields.includes(colIdOf(c))
    )
  }

  /**
   * 透视度量列解析：默认态（未显式勾选值列）与显式态都由这一处给出，
   * buildPivotCols 与 buildPivotRows 共用，保证组合列 id 与 __agg 键严格同序同名。
   */
  function pivotValueCols(source: RjColumn[], valueFields: string[]): RjColumn[] {
    const leaves = collectLeaf(source)
    if (valueFields.length) {
      const picked = leaves.filter(
        (c) => valueFields.includes(c.field!) || valueFields.includes(colIdOf(c))
      )
      // 勾选集整体失效（例如陈旧持久化状态里存的是引擎生成列 id）时退回默认「全部指标」，
      // 否则透视会静默变成空表：表头有列、__agg 无键
      if (picked.length) return picked
    }
    return leaves.filter(isPivotValueCol)
  }

  // ---------------- 主管线 ----------------

  /** 原始（未透视）列快照，供透视行模型按真实字段取值/分组/聚合 */
  const sourceColsRef = ref<RjColumn[]>([])

  /** 透视生成列（供上层注入列源） */
  const pivotCols = (allCols: RjColumn[]): RjColumn[] => {
    // 记录原始列（含 children 的声明列），buildPivotRows 需按原始 field 定位维度/指标/行维
    sourceColsRef.value = allCols
    if (!pivotState.value.active) return []
    return buildPivotCols(allCols)
  }

  // ---------------- 公式引擎（列级 + 单元格级：依赖图/拓扑/循环检测/重算）----------------
  /** 上一轮写过影子的行（供下轮精确清理，避免全表写） */
  let fxApplied: RjRowData[] = []
  function clearFx() {
    for (let i = 0; i < fxApplied.length; i++) fxMap.delete(fxApplied[i])
    fxApplied = []
  }

  function applyFormulas(rows: RjRowData[], cols: RjColumn[]) {
    const n = rows.length
    const kf = opts.rowKey()
    const idxOf = new Map<string, number>()
    cols.forEach((c, i) => idxOf.set(colIdOf(c), i))
    const cfs = opts.cellFormulas ? opts.cellFormulas() : null
    const defaultFormula = cols.map((c) => c.formula || null)
    // 单元格级公式：ri:ci → 文本
    const cellTextMap = new Map<string, string>()
    if (cfs && cfs.size) {
      const keyToRi = new Map<string, number>()
      rows.forEach((r, ri) => keyToRi.set(String(rowKeyOf(r, kf)), ri))
      cfs.forEach((text, k) => {
        const sep = k.indexOf('::')
        if (sep < 0) return
        const ri = keyToRi.get(k.slice(0, sep))
        const ci = idxOf.get(k.slice(sep + 2))
        if (ri != null && ci != null) cellTextMap.set(ri + ':' + ci, text)
      })
    }
    // 计算列集合
    const hasCell = new Set<number>()
    cellTextMap.forEach((_t, key) => hasCell.add(parseInt(key.slice(key.indexOf(':') + 1), 10)))
    const computedCols: number[] = []
    cols.forEach((_c, i) => {
      if (defaultFormula[i] || hasCell.has(i)) computedCols.push(i)
    })
    if (!computedCols.length) {
      clearFx()
      return
    }
    // 依赖提取（列粒度）
    const depCtx: FormulaCtx = {
      columns: cols.map(colIdOf),
      rowCount: n,
      getValue: () => undefined
    }
    const astCache = new Map<string, AstNode | null>()
    const getAst = (t: string): AstNode | null => {
      if (!astCache.has(t)) astCache.set(t, parse(t))
      return astCache.get(t)!
    }
    const textsOfCol = (i: number): string[] => {
      const out: string[] = []
      if (defaultFormula[i]) out.push(defaultFormula[i] as string)
      cellTextMap.forEach((t, key) => {
        if (parseInt(key.slice(key.indexOf(':') + 1), 10) === i) out.push(t)
      })
      return out
    }
    const compSet = new Set(computedCols)
    const edgesFrom = new Map<number, number[]>()
    const inDeg = new Map<number, number>()
    computedCols.forEach((i) => {
      edgesFrom.set(i, [])
      inDeg.set(i, 0)
    })
    computedCols.forEach((i) => {
      const deps = new Set<number>()
      textsOfCol(i).forEach((t) => {
        const a = getAst(t)
        if (a)
          collectDeps(a, depCtx).forEach((d) => {
            for (let c = d.c1; c <= d.c2; c++) if (c >= 0 && c < cols.length) deps.add(c)
          })
      })
      let cnt = 0
      deps.forEach((j) => {
        if (compSet.has(j)) {
          cnt++
          edgesFrom.get(j)!.push(i)
        }
      })
      inDeg.set(i, cnt)
    })
    // Kahn 拓扑（含自环 → 归为循环）
    const order: number[] = []
    const indeg = new Map(inDeg)
    const queue = computedCols.filter((i) => indeg.get(i) === 0)
    while (queue.length) {
      const i = queue.shift()!
      order.push(i)
      edgesFrom.get(i)!.forEach((k) => {
        const v = indeg.get(k)! - 1
        indeg.set(k, v)
        if (v === 0) queue.push(k)
      })
    }
    const inOrder = new Set(order)
    const cyclic = computedCols.filter((i) => !inOrder.has(i))
    // 求值
    const res: Record<number, any[]> = {}
    const ok: Record<number, boolean[]> = {}
    computedCols.forEach((i) => {
      res[i] = new Array(n).fill(undefined)
      ok[i] = new Array(n).fill(false)
    })
    const evalCtx: FormulaCtx = {
      columns: cols.map(colIdOf),
      rowCount: n,
      getValue: (ci, ri) => {
        if (ci < 0 || ci >= cols.length || ri < 0 || ri >= n) return undefined
        if (ok[ci] && ok[ci][ri]) return res[ci][ri]
        return rawCellValue(cols[ci], rows[ri])
      }
    }
    const at = { col: 0, row: 0 }
    order.forEach((i) => {
      at.col = i
      const def = defaultFormula[i]
      for (let r = 0; r < n; r++) {
        const text = cellTextMap.get(r + ':' + i) ?? def
        if (!text) continue
        const ast = getAst(text)
        ok[i][r] = true
        if (!ast) {
          res[i][r] = '#NAME?'
          continue
        }
        at.row = r
        res[i][r] = evaluateAst(ast, evalCtx, at)
      }
    })
    cyclic.forEach((i) => {
      const def = defaultFormula[i]
      for (let r = 0; r < n; r++) {
        const text = cellTextMap.get(r + ':' + i) ?? def
        if (!text) continue
        ok[i][r] = true
        res[i][r] = '#CIRCULAR!'
      }
    })
    // 写回影子（仅触及有目标的行）
    clearFx()
    rows.forEach((r, ri) => {
      let fx: Record<string, any> | undefined
      for (let k = 0; k < computedCols.length; k++) {
        const i = computedCols[k]
        if (ok[i][ri]) {
          if (!fx) fx = {}
          fx[colIdOf(cols[i])] = res[i][ri]
        }
      }
      if (fx) {
        fxMap.set(r, fx)
        fxApplied.push(r)
      }
    })
  }

  const processed = computed(() => {
    if (typeof window !== 'undefined' && (window as any).__RJGRID_DRAG_DEBUG)
      console.log('[rj-drag] processed-run', { rev: rev.value, orderRev: orderRev.value })
    try {
      rev.value
      orderRev.value
      serverRev.value
      void quickFilter.value
      void [...filterModels.keys()]
      void [...floatFilters.keys()]
      void sortStates.value
      void rowGroupFields.value
      void rowLimit.value
      void pivotState.value
      void expandedGroups.value
      void serverGroupCollapsed.value
      void serverGroupKids.value
      void serverGroupLoading.value
      void serverGroupFailed.value
      void expandedTree.value
      void expandedDetails.value
      const cols = collectLeaf(leafColsRef.value)
      const mode = opts.dataMode()
      // 公式重算（非 SSRM）：先写影子，后续过滤/排序/展示统一读到计算值
      if (mode !== 'serverSide')
        applyFormulas(sourceRows(), opts.formulaColumns ? opts.formulaColumns() : cols)
      // SSRM：稠密展平块缓存（未加载槽 → 占位行），下标即绝对行号，供稠密虚拟化切片
      if (mode === 'serverSide') {
        const s = ssrmStore()
        const total = s.rowCount > 0 ? s.rowCount : 0
        if (opts.serverGrouping?.() && rowGroupFields.value.length) {
          // 服务端权威分组：按平铺序列（组行 + 内联/懒取子行 + 空洞占位）展平，行数为可见行而非 total
          const items: (RjRowData | undefined)[] = new Array(total)
          for (let i = 0; i < total; i++) items[i] = s.slots[i]
          return { displayRows: serverGroupRows(items), filteredCount: total }
        }
        const outSsr: RjDisplayRow[] = new Array(total)
        const slots = s.slots
        const rh = opts.rowHeight()
        const kf = opts.rowKey()
        for (let i = 0; i < total; i++) {
          const r = slots[i]
          outSsr[i] = r
            ? {
                key: kf && r[kf] != null ? r[kf] : rowKeyOf(r),
                type: 'row',
                data: r,
                level: 0,
                height: rh
              }
            : {
                key: 'ssrm:loading:' + i,
                type: 'row',
                data: { __ssrmLoading: true },
                level: 0,
                height: rh
              }
        }
        return { displayRows: outSsr, filteredCount: total }
      }
      // 服务端模式：排序/过滤由后端完成，客户端仅做分组/树/透视展示
      let rows = mode === 'client' ? passFilter(sourceRows(), cols) : sourceRows()
      if (mode === 'client') rows = sortRows(rows, cols)
      // NLQ TopN：排序/过滤之后截断为前 N 行（limit=0 时原样），使「取前N」真正生效
      rows = applyRowLimit(rows, rowLimit.value)

      const out: RjDisplayRow[] = []
      if (pivotState.value.active && pivotState.value.cols.length) {
        return {
          displayRows: buildPivotRows(rows, sourceColsRef.value),
          filteredCount: rows.length
        }
      }
      if (opts.treeData()) {
        const { roots, childrenMap } = buildTreeRows(rows)
        flattenTree(roots, cols, out, childrenMap, 0)
      } else if (rowGroupFields.value.length) {
        if (mode !== 'client' && opts.serverGrouping?.()) {
          // 服务端权威分组：后端已返回带 __group 的平铺序列，按折叠态展平；
          // 子行未内联的组登记 type:'group' 子块请求（由 watch(sgNeedTick) 在展平后取回，合并再展平）
          out.push(...serverGroupRows(rows))
        } else {
          const tree = buildGroupTree(rows, rowGroupFields.value, cols)
          if (!firstExpansionDone.value) firstExpansionDone.value = true
          flattenGroups(tree, out, cols, rowGroupFields.value, 'root')
        }
      } else {
        // 平铺热点分支(无分组/无树/无透视): 把行循环不变的选项调用与响应式 Set 引用提到循环外，
        // 避免 8000 次函数调用与响应式属性查找(这些在 proxy get 上代价明显)。与 pushDataRow(r,0) 语义一一对应。
        const kf = opts.rowKey()
        const rh = opts.rowHeight()
        const hasDetail = opts.hasDetailSlot()
        const dh = opts.detailHeight()
        const fwh = opts.fullWidthHeight()
        const expDet = expandedDetails.value
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]
          const key = rowKeyOf(r, kf)
          out.push({ key, type: 'row', data: r, level: 0, parentKey: undefined, height: rh })
          if (hasDetail && expDet.has(key))
            out.push({
              key: `detail:${key}`,
              type: 'detail',
              data: r,
              level: 0,
              parentKey: key,
              height: dh
            })
          else if (opts.isFullWidthRow(r))
            out.push({
              key: `fw:${key}`,
              type: 'fullwidth',
              data: r,
              level: 0,
              parentKey: key,
              height: fwh
            })
        }
      }
      return { displayRows: out, filteredCount: out.length }
    } catch (e) {
      console.error('[rj-drag] processed-throw', e)
      throw e
    }
  })

  /** 列引用（含透视替换后的列，由主组件注入） */
  const leafColsRef = ref<RjColumn[]>([])
  function setPipelineColumns(cols: RjColumn[]) {
    leafColsRef.value = cols
  }

  // 行偏移（变高行支持：detail/fullwidth）——单趟直接取 displayRow.height，
  // 不再先 map 出 rowHeights 数组（重排时省一趟 8000 级遍历与一个等长数组）
  const offsets = computed(() => {
    const dr = processed.value.displayRows
    const n = dr.length
    const offs = new Array<number>(n)
    let acc = 0
    for (let i = 0; i < n; i++) {
      offs[i] = acc
      acc += dr[i].height
    }
    return offs
  })
  const totalHeight = computed(() => {
    const offs = offsets.value
    const dr = processed.value.displayRows
    const n = dr.length
    return n ? offs[n - 1] + dr[n - 1].height : 0
  })

  // 合计行（基于过滤后全量数据）
  const summaryRow = computed(() => {
    rev.value
    void [...filterModels.keys()]
    void [...floatFilters.keys()]
    void quickFilter.value
    void sortStates.value
    const cols = collectLeaf(leafColsRef.value)
    const rows = passFilter(sourceRows(), cols)
    const data: RjRowData = { __summary: true }
    let has = false
    cols.forEach((c) => {
      if (!c.aggFunc) return
      has = true
      data[colIdOf(c)] = runAgg(
        c.aggFunc,
        rows,
        rows.map((r) => cellRawValue(c, r))
      )
    })
    return has ? data : null
  })

  // ---------------- 服务端权威分组（serverSideGrouping：折叠态 + 子块懒取） ----------------
  /** 被收起的组 path（默认全展开，与后端已内联返回子行的观感一致） */
  const serverGroupCollapsed = ref(new Set<string>())
  /** path → 懒取回来的子项平铺序列（子项本身可再含组行，递归懒展开） */
  const serverGroupKids = ref(new Map<string, RjRowData[]>())
  /** 正在取子项的组（去重，免同一组并发重请） */
  const serverGroupLoading = ref(new Set<string>())
  /** 本代放弃取数的组（连续失败到上限）：不再渲染子行，重取数/改分组/清缓存时清空恢复 */
  const serverGroupFailed = ref(new Set<string>())
  /** path → 本代已发次数，失败即重试也要有个顶（否则一次抖动就变成展平↔请求的死循环） */
  const sgAttempts = new Map<string, number>()
  /** 子块取数上限（含首请）：取不到就认输置失败态，不靠缓存空数组掩盖 */
  const SG_MAX_ATTEMPTS = 3
  /** 取数代次：重置/清缓存时推进，使在途旧响应作废（不写回已失效的 path） */
  let sgEpoch = 0
  /** 最近一次展平登记出的待取子块（在 computed 外统一发请求，避免派生计算里做副作用） */
  let sgNeedLoad: SgNeedLoad[] = []
  /** 子块待取计次：只给下游 watch 当触发信号用。
   *  直接 watch(processed) 会在 setup 注册时求值一次 processed（其内部要读宿主尚未初始化的列定义），故监听这个轻量 ref */
  const sgNeedTick = ref(0)
  /** 显示行下标 → SSRM 稠密槽绝对下标（-1=懒取行）：分组视图下两者不等长，块调度需换算 */
  let sgAbsAt: number[] = []

  /** 是否走服务端权威分组视图（非客户端模式 + 开关 + 已拖入分组字段） */
  function isServerGroupView(): boolean {
    return (
      opts.dataMode() !== 'client' && !!opts.serverGrouping?.() && !!rowGroupFields.value.length
    )
  }

  function sgChildMap(): Map<string, SgChildState> {
    const m = new Map<string, SgChildState>()
    serverGroupKids.value.forEach((kids, p) => m.set(p, { kids }))
    serverGroupFailed.value.forEach((p) => {
      const s = m.get(p)
      if (s) s.error = true
      else m.set(p, { error: true })
    })
    serverGroupLoading.value.forEach((p) => {
      const s = m.get(p)
      if (s) s.loading = true
      else m.set(p, { loading: true })
    })
    return m
  }

  /** 平铺行序列（可含 SSRM 未加载空洞）→ 组行/数据行显示序列 */
  function serverGroupRows(items: (RjRowData | undefined)[]): RjDisplayRow[] {
    const k = opts.rowKey()
    const r = flattenServerGroups(items, {
      fields: rowGroupFields.value.slice(),
      keyOf: (row) => (k && row[k] != null ? row[k] : rowKeyOf(row)),
      rowHeight: opts.rowHeight(),
      collapsed: serverGroupCollapsed.value,
      childMap: sgChildMap(),
      isExpandable: opts.isServerSideGroup ? (row) => !!opts.isServerSideGroup!(row) : undefined
    })
    sgNeedLoad = r.needLoad
    sgAbsAt = r.absAt
    if (sgNeedLoad.length) sgNeedTick.value++
    return r.rows
  }

  /** 取某组的子块：p.type='group' + p.group={rowGroupKey,level,path} */
  async function loadServerGroupChildren(info: SgNeedLoad) {
    if (!opts.loadData) return
    const path = info.path
    if (
      serverGroupKids.value.has(path) ||
      serverGroupLoading.value.has(path) ||
      serverGroupFailed.value.has(path)
    )
      return
    const attempt = (sgAttempts.get(path) || 0) + 1
    sgAttempts.set(path, attempt)
    // 代次锚点：回包前若发生过重置/清缓存，这份旧条件下的子行不得写回新缓存
    const epoch = sgEpoch
    serverGroupLoading.value = new Set(serverGroupLoading.value).add(path)
    serverRev.value++ // 先出占位行
    const pageSize = Math.max(
      opts.ssrmBlockSize ? opts.ssrmBlockSize() : 0,
      opts.pageSize() || 0,
      100
    )
    const loadOpts = {
      start: 0,
      end: pageSize - 1,
      page: 1,
      pageSize,
      sort: loadCtx.sort,
      filters: loadCtx.filters,
      quickFilterText: loadCtx.quickFilterText,
      floatFilters: loadCtx.floatFilters || [],
      rowGroup: loadCtx.rowGroup || [],
      advancedFilter: loadCtx.advancedFilter || null,
      queryConditions: queryConditions.value.slice(),
      type: 'group' as const,
      group: { rowGroupKey: info.field, level: info.level, path: info.values.slice() }
    }
    let list: RjRowData[] | undefined
    let failed = false
    try {
      const res = await opts.loadData(loadOpts)
      list = (res.rows || res.list || []) as RjRowData[]
    } catch {
      failed = true
    }
    if (epoch !== sgEpoch) return
    const l = new Set(serverGroupLoading.value)
    l.delete(path)
    serverGroupLoading.value = l
    if (failed) {
      // 不写空子集（那是「后端确认无子行」）：未超上限就重算触发下一轮登记重试，超限则认输置失败态
      if (attempt >= SG_MAX_ATTEMPTS) {
        serverGroupFailed.value = new Set(serverGroupFailed.value).add(path)
        console.warn('[rj-grid] 服务端分组子块取数失败，本代放弃：' + path)
      }
    } else {
      const next = new Map(serverGroupKids.value)
      next.set(path, list || [])
      serverGroupKids.value = next
    }
    serverRev.value++
  }

  /** 组行展开/收起（收起=隐藏其内联子行与其页脚小计；展开且子行未内联=触发子块请求） */
  function setServerGroupCollapsed(path: string, isCollapsed: boolean) {
    const s = new Set(serverGroupCollapsed.value)
    if (isCollapsed) s.add(path)
    else s.delete(path)
    serverGroupCollapsed.value = s
  }

  /** 清懒取子项（可选连折叠态一起清）：重取数/改分组定义/清块缓存时调用 */
  function resetServerGroupView(clearCollapsed = true) {
    sgEpoch++ // 在途子块响应由此作废（旧筛选条件的子行不能写回新缓存）
    sgAttempts.clear()
    serverGroupKids.value = new Map()
    serverGroupLoading.value = new Set()
    serverGroupFailed.value = new Set()
    sgNeedLoad = []
    if (clearCollapsed) serverGroupCollapsed.value = new Set()
  }

  // 展平后统一发起子块请求（flush post：派生计算已完成）
  watch(
    sgNeedTick,
    () => {
      if (!sgNeedLoad.length) return
      const list = sgNeedLoad
      sgNeedLoad = []
      list.forEach((info) => void loadServerGroupChildren(info))
    },
    { flush: 'post' }
  )
  // 分组定义变化：旧 path 失效，折叠态与子项一并作废
  watch(rowGroupFields, () => resetServerGroupView())

  function expandGroup(path: string, expand: boolean) {
    const s = new Set(expandedGroups.value)
    if (expand) s.add(path)
    else {
      s.delete(path)
      // 折叠父级时联动折叠子孙
      Array.from(s).forEach((k) => {
        if (k.startsWith(path + '|')) s.delete(k)
      })
    }
    expandedGroups.value = s
  }

  function toggleTree(key: string) {
    const s = new Set(expandedTree.value)
    if (s.has(key)) s.delete(key)
    else s.add(key)
    expandedTree.value = s
  }

  function toggleDetail(key: string | number) {
    const s = new Set(expandedDetails.value)
    if (s.has(key)) s.delete(key)
    else s.add(key)
    expandedDetails.value = s
  }

  function expandAll() {
    defaultExpandAll.value = true
    expandedGroups.value = new Set()
    expandedTree.value = new Set()
    serverGroupCollapsed.value = new Set()
  }

  function collapseAll() {
    defaultExpandAll.value = false
    const allKeys = new Set<string>()
    // 全量登记当前可见 key 后取反：简单实现——重建时判断
    processed.value.displayRows.forEach((r) => {
      if (r.type === 'group') allKeys.add(String(r.key))
    })
    const treeKeys = new Set<string>()
    if (opts.treeData()) {
      const { roots, childrenMap } = buildTreeRows(sourceRows())
      collectTreeKeys(roots, childrenMap, treeKeys)
    }
    // 服务端权威分组：把当前可见组全部登记为收起（其子块缓存保留，展开不需重取）
    if (isServerGroupView()) {
      const sg = new Set<string>()
      processed.value.displayRows.forEach((r) => {
        if (r.type === 'group' && !r.isFooter) sg.add(String(r.key))
      })
      serverGroupCollapsed.value = sg
    }
    // 折叠 = 显式登记"全展开集合为空"+ firstExpansionDone 置真
    firstExpansionDone.value = true
    expandedGroups.value = new Set()
    expandedTree.value = new Set()
    void allKeys
    void treeKeys
    defaultExpandAll.value = false
  }

  return {
    rev,
    // 状态
    quickFilter,
    filterModels,
    floatFilters,
    advancedFilter,
    queryConditions,
    sortStates,
    rowGroupFields,
    rowLimit,
    pivotState,
    expandedGroups,
    expandedTree,
    expandedDetails,
    serverGroupCollapsed,
    defaultExpandAll,
    flashRows,
    // 派生
    processed,
    offsets,
    totalHeight,
    summaryRow,
    pivotCols,
    setPipelineColumns,
    sourceRows,
    // 操作
    applyTransaction,
    setRowValue,
    setRowData,
    touch,
    touchOrder,
    expandGroup,
    toggleTree,
    toggleDetail,
    expandAll,
    collapseAll,
    // 服务端权威分组
    isServerGroupView,
    setServerGroupCollapsed,
    resetServerGroupView,
    loadServerGroupChildren,
    filterTypeOf,
    comparatorOf,
    // 服务端
    serverRows,
    serverTotal,
    serverLoading,
    loadingMore,
    fetchMore,
    fetchPage,
    reloadServer,
    setLoadCtx,
    allServerLoaded,
    firstExpansionDone,
    // SSRM
    ssrmStore,
    ensureServerBlocks,
    refreshServerSide,
    purgeServerSideCache,
    ssrmBatcher
  }
}
