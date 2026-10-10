// rj-grid 纯函数工具集
import type {
  RjAgg,
  RjAggCustom,
  RjAggFunc,
  RjColumn,
  RjExportScope,
  RjExportScopeResolved,
  RjRowData
} from './types'

/** a.b.c 路径取值 */
export function getValueByPath(obj: any, path?: string): any {
  if (!path) return undefined
  if (obj == null) return undefined
  if (!path.includes('.')) return obj[path]
  let cur = obj
  for (const p of path.split('.')) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

/** a.b.c 路径写值（沿途对象不存在则忽略） */
export function setValueByPath(obj: any, path: string, value: any): boolean {
  const parts = path.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null || typeof cur !== 'object') return false
    cur = cur[parts[i]]
  }
  if (cur == null || typeof cur !== 'object') return false
  cur[parts[parts.length - 1]] = value
  return true
}

/** 深拷贝（数据友好型，跳过函数/DOM） */
export function cloneValue<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(cloneValue) as any
  if (v instanceof Date) return new Date(v.getTime()) as any
  const out: Record<string, any> = {}
  for (const k in v) out[k] = cloneValue((v as any)[k])
  return out as T
}

/** 列唯一 id */
export function colIdOf(col?: RjColumn | null): string {
  if (!col) return ''
  return col.colId || col.field || ''
}

/** 收集叶子列（展开多级表头） */
export function collectLeaves(cols: RjColumn[]): RjColumn[] {
  const out: RjColumn[] = []
  const walk = (list: RjColumn[]) => {
    list.forEach((c) => {
      if (c.children?.length) walk(c.children)
      else out.push(c)
    })
  }
  walk(cols)
  return out
}

/**
 * 组装公式求值上下文的列清单：当前布局列（可见列 / 透视生成列）在前，
 * 被隐藏的声明列追加在后。
 *
 * 公式引用的是数据字段，不该受列显隐影响：只喂可见列时，
 * `=usedVolume / capacityVolume` 在依赖列隐藏时标识符解析不到，单元格只能降级 #NAME?。
 * 隐藏列必须追加在尾部：A1/B2 这类字母引用按上下文下标映射，
 * 插在中间会让历史单元格公式整体错位。
 * pivot=true 时列源已被引擎生成的 __pv* 列顶替（既有守卫），原样返回不掺声明列。
 */
export function formulaColumnContext(
  shown: RjColumn[],
  declared: RjColumn[],
  isHidden: (colId: string) => boolean,
  pivot = false
): RjColumn[] {
  if (pivot) return shown
  const known = new Set(shown.map(colIdOf))
  const extra = declared.filter((c) => {
    if (c.checkbox || c.rowDrag) return false
    const id = colIdOf(c)
    return !known.has(id) && isHidden(id)
  })
  return extra.length ? [...shown, ...extra] : shown
}

// ---------------- 导出范围 ----------------

/** 行集合来源（由主组件按当前状态交进来，本层不做任何副作用） */
export interface RjExportRowSource {
  /** 选中行（含跨页保留） */
  selected: RjRowData[]
  /** 展示行（含分组/页脚，按屏上顺序） */
  display: { type: string; isFooter?: boolean; data: RjRowData }[]
  /** 源数据全集（未过滤/排序） */
  source: RjRowData[]
}

/**
 * auto 落地：有选中就导选中，否则导当前视图；其余档原样返回。
 * 没选中时不得落成 selected，否则用户得到一份只有表头的空文件。
 */
export function resolveExportScope(
  scope: RjExportScope | undefined,
  selCount: number
): RjExportScopeResolved {
  if (!scope || scope === 'auto') return selCount > 0 ? 'selected' : 'view'
  return scope
}

/**
 * 范围 → 行集合（CSV / Excel / 打印 / PDF 共用一套判定，不再各写一分支）。
 * withGroups：CSV 与打印把分组行也写进文档（分组的「数据」与「分组」两个口径都在同一张表里）；
 * Excel 有独立「分组」sheet，数据 sheet 只要干细行，故传 false。
 */
export function pickExportRows(
  scope: RjExportScopeResolved,
  src: RjExportRowSource,
  withGroups: boolean
): RjRowData[] {
  if (scope === 'selected') return src.selected.slice()
  if (scope === 'all') return src.source.slice()
  const out: RjRowData[] = []
  src.display.forEach((d) => {
    if (d.type === 'row') out.push(d.data)
    else if (withGroups && d.type === 'group' && !d.isFooter) out.push(d.data)
  })
  return out
}

let uidSeed = 0
export function uid(prefix = 'rj'): string {
  return `${prefix}${++uidSeed}`
}

/** 列宽限幅 */
export function clampWidth(w: number, col?: RjColumn): number {
  const min = col?.minWidth ?? 40
  const max = col?.maxWidth ?? 10000
  return Math.min(Math.max(Math.round(w), min), max)
}

/**
 * 按内容估算列宽（字符估算，零依赖、可单测）：取标题与样本文本的“加权宽度”最大值 × 字宽 + 内边距，
 * 限幅到 [min,max]。中文/全角按 2 个单位、ASCII 按 1 个单位，避免中文列被截断、数字列被撑得过宽。
 * 内边距预留了左右 padding + 表头排序/筛选等图标位。
 * 主组件传入的 texts 为该列采样行（displayOf 后的显示文本），不是原始值，保证与屏上一致。
 */
const FULLWIDTH = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/
/** 字符串的加权显示宽度（全角计 2，半角计 1） */
export function textWidthUnits(s: string): number {
  let u = 0
  for (const ch of String(s == null ? '' : s)) u += FULLWIDTH.test(ch) ? 2 : 1
  return u
}
export function measureColWidth(
  title: string,
  texts: string[],
  opt?: { unitW?: number; padPx?: number; min?: number; max?: number }
): number {
  const unitW = opt?.unitW ?? 8
  const padPx = opt?.padPx ?? 34
  const min = opt?.min ?? 60
  const max = opt?.max ?? 640
  let maxU = textWidthUnits(title) || 4
  for (const t of texts) {
    const w = textWidthUnits(t)
    if (w > maxU) maxU = w
  }
  return Math.min(Math.max(maxU * unitW + padPx, min), max)
}

// ---------------- 格式化 ----------------

const thousands = (n: number, digits?: number) => {
  // 显式指定位数时四舍五入到该位数（消除浮点噪声，如 0.1256*100=12.559999999999999 → "12.56"）；
  // 未指定位数时按数值自然小数位展示。
  const natural = String(n).split('.')[1]?.length ?? 0
  const d = Math.max(0, Math.min(digits ?? natural, 20))
  return n.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d })
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatDate(v: any, datetime?: boolean): string {
  if (v == null || v === '') return ''
  const d =
    v instanceof Date ? v : new Date(typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v)
  if (isNaN(d.getTime())) return String(v)
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (!datetime) return date
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 图片值转可读文本（导出 / 剪贴板 / 拖拽浮影 / tooltip 共用）：
 * 取 URL 文件名，多值用 ", " 连接；data: 内联图无文件名，跳过以免把巨长 URI 写进单元格。
 */
export function imageText(value: any): string {
  const list = Array.isArray(value) ? value : value == null || value === '' ? [] : [value]
  const names: string[] = []
  for (const v of list) {
    const s = typeof v === 'string' ? v : String(v?.src ?? v?.url ?? '')
    if (!s || s.startsWith('data:')) continue
    const base = s.split(/[?#]/)[0].split('/').pop() || ''
    let name = base
    try {
      name = decodeURIComponent(base)
    } catch {
      // 非法定位串（含孤立 %）保持原样，不让展示链路报错
    }
    if (name) names.push(name)
  }
  return names.join(', ')
}

/** 按列预设类型格式化单元格值（导出与默认渲染共用）；布尔列文案由调用端按语言传入 */
export function formatByType(
  col: RjColumn,
  value: any,
  boolLabels: [string, string] = ['是', '否']
): string {
  if (value == null) return ''
  switch (col.type) {
    case 'num':
      return typeof value === 'number' ? thousands(value) : String(value)
    case 'money':
      return typeof value === 'number' ? '¥' + thousands(value, 2) : String(value)
    case 'percent':
      return typeof value === 'number' ? thousands(value * 100, 2) + '%' : String(value)
    case 'date':
      return formatDate(value)
    case 'datetime':
      return formatDate(value, true)
    case 'boolean':
      return value ? boolLabels[0] : boolLabels[1]
    case 'image':
      return imageText(value)
    default:
      return String(value)
  }
}

// ---------------- 编辑输入解析 ----------------

/**
 * 解析用户输入的数字串（会计/货币友好），供数字编辑器提交前统一转换：
 * - 容忍千分位逗号 / 空格 / 下划线、货币符号（¥ $ € £ ₹）、前后正负号
 * - 会计负数括号：`(1,234.50)` → -1234.5
 * - 无法解析（空串、纯符号、乱码）返回 null
 */
export function parseNumericInput(raw: any): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return isNaN(raw) ? null : raw
  let s = String(raw).trim()
  if (s === '') return null
  // 先剥离装饰字符：货币符号 / 千分位逗号 / 空格 / 下划线
  s = s.replace(/[¥$€£₹,\s_]/g, '')
  if (s === '') return null
  let sign = 1
  // 反复剥离合适括号（会计负数）与显式符号，二者可叠加
  let changed = true
  while (changed) {
    changed = false
    if (s.length > 1 && s.startsWith('(') && s.endsWith(')')) {
      s = s.slice(1, -1)
      sign *= -1
      changed = true
    }
    if (s.startsWith('-')) {
      s = s.slice(1)
      sign *= -1
      changed = true
    } else if (s.startsWith('+')) {
      s = s.slice(1)
      changed = true
    }
  }
  if (s === '' || !/^(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null
  const n = Number(s)
  return isFinite(n) ? sign * n : null
}

/**
 * 选项打字匹配排序（RichSelect 型前：前缀匹配优先于包含匹配，保持各档原相对顺序）。
 * 空查询原样返回；无任何命中返回空数组（供 UI 显示"无匹配项"）。
 */
export function rankOptions<T extends { label?: any; value?: any }>(
  options: T[],
  query: string
): T[] {
  const q = (query || '').trim().toLowerCase()
  if (!q) return options
  const starts: T[] = []
  const contains: T[] = []
  for (const o of options) {
    const label = String(o.label ?? o.value ?? '').toLowerCase()
    if (label.startsWith(q)) starts.push(o)
    else if (label.includes(q)) contains.push(o)
  }
  return [...starts, ...contains]
}

// ---------------- 排序比较 ----------------

// 中文拼音排序器（惰性构造 + 多级回落）；部分运行时的 ICU 不含 pinyin collation，
// 直接传 locale 会抛 RangeError，这里缓存并逐次降级，确保排序/分组/透视永不崩。
let zhCollator: Intl.Collator | null | undefined
function getZhCollator(): Intl.Collator | null {
  if (zhCollator !== undefined) return zhCollator
  const tags = ['zh-Hans-CN-u-co-pinyin', 'zh-CN', 'zh']
  for (const tag of tags) {
    try {
      const c = new Intl.Collator(tag, { sensitivity: 'variant', numeric: true })
      if (c.compare('a', 'b') !== 0 || c.compare('阿', '装') !== 0) {
        zhCollator = c
        return c
      }
      zhCollator = c
    } catch {
      /* 尝试下一个 tag */
    }
  }
  zhCollator = zhCollator ?? null
  return zhCollator
}

/** 智能比较：数字/日期/中文字符串 */
export function defaultComparator(a: any, b: any): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0)
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  const na = Number(a)
  const nb = Number(b)
  if (!isNaN(na) && !isNaN(nb) && a !== '' && b !== '') return na - nb
  const sa = String(a)
  const sb = String(b)
  const col = getZhCollator()
  if (col) return col.compare(sa, sb)
  try {
    return sa.localeCompare(sb)
  } catch {
    return sa < sb ? -1 : sa > sb ? 1 : 0
  }
}

// ---------------- 聚合 ----------------

export const AGG_FUNCS: Record<RjAggFunc, (rows: RjRowData[], values: any[]) => any> = {
  sum: (_r, v) => v.reduce((s, x) => s + (Number(x) || 0), 0),
  avg: (_r, v) => {
    const nums = v.map(Number).filter((x) => !isNaN(x))
    return nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : null
  },
  min: (_r, v) => {
    const nums = v.map(Number).filter((x) => !isNaN(x))
    return nums.length ? Math.min(...nums) : null
  },
  max: (_r, v) => {
    const nums = v.map(Number).filter((x) => !isNaN(x))
    return nums.length ? Math.max(...nums) : null
  },
  count: (rows) => rows.length,
  first: (_r, v) => v[0],
  last: (_r, v) => v[v.length - 1]
}

export function runAgg(func: RjAgg | undefined, rows: RjRowData[], values: any[]): any {
  if (!func) return undefined
  if (typeof func === 'function') return (func as RjAggCustom)(rows)
  return AGG_FUNCS[func](rows, values)
}

/** 聚合函数 → 文案 key（由调用端经 t() 取词，保证语言切换时聚合标签同步） */
export const AGG_LABELS: Record<RjAggFunc, string> = {
  sum: 'aggSum',
  avg: 'aggAvg',
  min: 'aggMin',
  max: 'aggMax',
  count: 'aggCount',
  first: 'aggFirst',
  last: 'aggLast'
}

// ---------------- 虚拟滚动辅助 ----------------

/** 二分查找：有序数组 arr 中找第一个 >= target 的下标 */
export function lowerBound(
  arr: number[] | { length: number; [i: number]: number },
  target: number,
  key?: (i: number) => number
): number {
  const get = key || ((i: number) => (arr as number[])[i])
  let lo = 0
  let hi = (arr as any).length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (get(mid) < target) lo = mid + 1
    else hi = mid - 1
  }
  return lo
}

/**
 * 行拖拽落位换算：把「被拖行从显示槽 from 移到显示槽 to」换算为
 * 「从源数据数组移除被拖行后，应把被拖行插入的下标」。
 * - rowCount：显示行总数
 * - isData(i)：第 i 个显示行是否为参与重排的数据行（组行 / 页脚行等不计入）
 * - isMoved(i)：第 i 个显示行是否为被拖拽的那一行
 *
 * 落位后被拖行占据显示槽 to：排在它之前的数据行 = 显示下标 < to 的数据行（不含被拖行自身）。
 * 下移（from < to）时，原本位于槽 to 的那一行会因让位上移到 to-1，仍排在被拖行之前，故再 +1；
 * 上移（from > to）时被拖行本就不在 [0, to) 内，无需修正。
 * （行拖拽仅在无排序 / 分组 / 透视 / 树形态下开放，此时槽 to 必为数据行，+1 不会越界。）
 */
export function rowMoveInsertIndex(
  rowCount: number,
  isData: (i: number) => boolean,
  isMoved: (i: number) => boolean,
  from: number,
  to: number
): number {
  let before = 0
  for (let i = 0; i < rowCount; i++) {
    if (isData(i) && !isMoved(i) && i < to) before++
  }
  return Math.max(0, from < to ? before + 1 : before)
}

/**
 * 拖拽整行快照的宽度预算：按列宽顺序累计，达到 maxW 即止（至少保留 1 格），
 * 返回要渲染的单元格数量，使跟手浮影不会宽过视口。cells 为空返回 0。
 */
export function ghostCellCount<T extends { w: number }>(cells: T[], maxW: number): number {
  let used = 0
  for (let i = 0; i < cells.length; i++) {
    used += cells[i].w
    if (used >= maxW) return i + 1
  }
  return cells.length
}

/**
 * 自然语言「取前 N 行」(TopN) 的截断：limit<=0 或非有限数视为不限量，原样返回。
 * limit 落在 (0, len] 时截取前 limit 行；纯函数便于单测，调用点负责响应式。
 */
export function applyRowLimit<T>(rows: T[], limit: number): T[] {
  if (!Number.isFinite(limit) || limit <= 0) return rows
  return limit >= rows.length ? rows : rows.slice(0, limit)
}

// ---------------- DOM / 函数 ----------------

export function throttleRaf<T extends (...args: any[]) => void>(fn: T): T {
  let pending = false
  let lastArgs: any[] = []
  return function (this: any, ...args: any[]) {
    lastArgs = args
    if (pending) return
    pending = true
    requestAnimationFrame(() => {
      pending = false
      fn.apply(this, lastArgs)
    })
  } as T
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  wait = 200
): T & { cancel: () => void } {
  let t: ReturnType<typeof setTimeout> | null = null
  const wrapped = function (this: any, ...args: any[]) {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn.apply(this, args), wait)
  } as any
  wrapped.cancel = () => t && clearTimeout(t)
  return wrapped
}

/** 是否 Mac（Ctrl/Cmd 适配） */
export const isMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** 触发下载 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

/** 取元素在容器内的相对坐标 */
export function inRect(el: Element | null, rect: DOMRect): { x: number; y: number } | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left - rect.left, y: r.top - rect.top }
}

export const stop = (e: Event) => e.stopPropagation()
