// rj-grid 查询条件栏：字段派生 / 运算符 / 匹配（纯函数，便于单测，零依赖）
import type {
  RjColumn,
  RjEditorOption,
  RjQueryCondition,
  RjQueryFieldDef,
  RjQueryFieldKind,
  RjQueryOperator
} from './types'
import { collectLeaves, getValueByPath } from './utils'

/** 内部生成列（复选/拖拽/透视）：field 以 __ 开头，不作为查询字段 */
function isInternalField(f: string): boolean {
  return !f || f.startsWith('__')
}

/** 由列类型/筛选/编辑器推导查询字段类别 */
export function kindOfColumn(col: RjColumn): RjQueryFieldKind {
  const t = col.type
  if (t === 'num' || t === 'money' || t === 'percent') return 'number'
  if (t === 'date' || t === 'datetime') return 'date'
  if (optionsOfColumn(col).length) return 'select'
  if (typeof col.filter === 'string') {
    if (col.filter === 'number') return 'number'
    if (col.filter === 'date') return 'date'
    if (col.filter === 'select') return 'select'
  }
  return 'text'
}

/** 取列的下拉候选：editor.options（静态）或 filterValueMap（枚举映射） */
export function optionsOfColumn(col: RjColumn): RjEditorOption[] {
  const ed: any = typeof col.editor === 'string' ? { type: col.editor } : col.editor
  if (ed && Array.isArray(ed.options) && ed.options.length) {
    return ed.options as RjEditorOption[]
  }
  if (col.filterValueMap) {
    return Object.entries(col.filterValueMap).map(([v, label]) => ({
      value: coerceOptionValue(v),
      label: String(label)
    }))
  }
  return []
}

// filterValueMap 的 key 恒为字符串，若原值是数字则还原，避免与行内数字比较不上
function coerceOptionValue(v: string): any {
  if (v !== '' && !Number.isNaN(Number(v))) return Number(v)
  return v
}

/**
 * 从列定义派生查询字段候选池：
 * - 跳过无 field / 内部列 / 显式 filter:false 的列；
 * - 用 override 覆盖标题、类别或候选（宿主可为枚举列补 options）。
 */
export function deriveQueryFields(
  columns: RjColumn[],
  override?: RjQueryFieldDef[]
): RjQueryFieldDef[] {
  const ov = new Map((override || []).map((f) => [f.field, f]))
  const out: RjQueryFieldDef[] = []
  const seen = new Set<string>()
  for (const col of collectLeaves(columns)) {
    const field = col.field
    if (!field || isInternalField(field) || col.filter === false) continue
    if (seen.has(field)) continue
    seen.add(field)
    const o = ov.get(field)
    out.push({
      field,
      title: o?.title || col.title || field,
      kind: o?.kind || kindOfColumn(col),
      options: o?.options?.length ? o.options : optionsOfColumn(col)
    })
  }
  return out
}

/**
 * 把统一选项载体（异步解析出的候选）并入查询字段池：仅在该字段自身无候选
 * （editor.options / filterValueMap / override 都缺位）时，用载体候选填充并升级为 select 类别。
 * 向后兼容：已有 options 的字段原样保留；carrier 未命中/为空不动。carrier 以 colIdOf 为键。
 */
export function withCarrierOptions(
  fields: RjQueryFieldDef[],
  carrier: Map<string, { list: RjEditorOption[] }>
): RjQueryFieldDef[] {
  if (!fields.length || !carrier || !carrier.size) return fields
  return fields.map((f) => {
    if (f.options && f.options.length) return f
    const hit = carrier.get(f.field)
    if (!hit || !hit.list || !hit.list.length) return f
    return {
      ...f,
      kind: 'select' as RjQueryFieldKind,
      // 直接透传载体列表（可能为树，带 children），供查询栏下拉按层级渲染 + 搜索
      options: hit.list
    }
  })
}

/** 各类别对应的合理运算符集合 */
export function queryOpsOfKind(kind: RjQueryFieldKind): RjQueryOperator[] {
  if (kind === 'number') return ['eq', 'gt', 'gte', 'lt', 'lte', 'between']
  if (kind === 'date') return ['between', 'gte', 'lte']
  if (kind === 'select') return ['eq', 'ne', 'in']
  return ['contains', 'eq', 'ne']
}

/** 新增字段时的默认运算符（取该类别最常用的一项） */
export function defaultQueryOperator(kind: RjQueryFieldKind): RjQueryOperator {
  return queryOpsOfKind(kind)[0]
}

function hasOne(v: any): boolean {
  return v !== undefined && v !== null && v !== ''
}

/** 条件是否已填值（刚挂字段还没输入的不参与过滤） */
export function queryHasValue(c: RjQueryCondition): boolean {
  if (c.operator === 'between') {
    if (Array.isArray(c.value)) return c.value.some(hasOne)
    return hasOne(c.value1) || hasOne(c.value2)
  }
  if (Array.isArray(c.value)) return c.value.length > 0
  return hasOne(c.value)
}

/** 生效（已填值）的条件集合 */
export function activeQueryConditions(list: RjQueryCondition[]): RjQueryCondition[] {
  return (list || []).filter(queryHasValue)
}

const looseEq = (a: any, b: any) => a === b || String(a) === String(b)
const toNum = (v: any) => {
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}
const toTime = (v: any) => {
  if (!hasOne(v)) return undefined
  if (typeof v === 'number') return v
  const t = new Date(String(v).replace(' ', 'T')).getTime()
  return Number.isNaN(t) ? undefined : t
}

/**
 * 单元格原始值与单个条件比对（纯函数：调用方负责取值）。
 * 日期类走时间戳、数值类走 Number、其余走字符串宽松比较。
 */
export function matchQueryValue(
  rawValue: any,
  c: RjQueryCondition,
  kind: RjQueryFieldKind = 'text'
): boolean {
  const rv = rawValue
  switch (c.operator) {
    case 'contains':
      return String(rv ?? '')
        .toLowerCase()
        .includes(String(c.value ?? '').trim().toLowerCase())
    case 'eq':
      return looseEq(rv, c.value)
    case 'ne':
      return !looseEq(rv, c.value)
    case 'in':
      return (Array.isArray(c.value) ? c.value : [c.value]).some((x) => looseEq(rv, x))
    case 'gt':
      return numCmp(rv, c.value, (a, b) => a > b)
    case 'gte':
      return numCmp(rv, c.value, (a, b) => a >= b)
    case 'lt':
      return numCmp(rv, c.value, (a, b) => a < b)
    case 'lte':
      return numCmp(rv, c.value, (a, b) => a <= b)
    case 'between': {
      const isDate = kind === 'date'
      const pair = Array.isArray(c.value) ? c.value : []
      const lo = c.value1 ?? pair[0]
      const hi = c.value2 ?? pair[1]
      if (isDate) {
        const t = toTime(rv)
        if (t === undefined) return false
        const loT = toTime(lo)
        const hiT = toTime(hi)
        if (loT !== undefined && t < loT) return false
        return !(hiT !== undefined && t > hiT)
      }
      const v = toNum(rv)
      if (v === undefined) return false
      const loN = toNum(lo)
      const hiN = toNum(hi)
      if (loN !== undefined && v < loN) return false
      return !(hiN !== undefined && v > hiN)
    }
    default:
      return true
  }
}

function numCmp(rv: any, cv: any, ok: (a: number, b: number) => boolean): boolean {
  const a = toNum(rv)
  const b = toNum(cv)
  if (a === undefined || b === undefined) return false
  return ok(a, b)
}

/** 行是否通过全部生效条件（AND）；colOf 提供该列定义以决定取值口径与类别 */
export function rowPassesQuery(
  row: RjRowDataLike,
  conds: RjQueryCondition[],
  colOf: (field: string) => RjColumn | undefined
): boolean {
  for (const c of conds) {
    const col = colOf(c.field)
    const raw = col?.filterValueGetter ? col.filterValueGetter(row as any) : getValueByPath(row, c.field)
    if (!matchQueryValue(raw, c, col ? kindOfColumn(col) : 'text')) return false
  }
  return true
}

type RjRowDataLike = Record<string, any>
