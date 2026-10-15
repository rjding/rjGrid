// rj-grid 统一选项载体：一处数据源（options / dict）归一为 {label,value}[]，
// 由网格解析 + 按源缓存，同源喂给 显示 / select 筛选 / select 编辑器 / NLQ。
// 纯函数层（无 Vue 依赖，可单测）；解析缓存与 provide 装配在 RjGrid.vue。
import type { InjectionKey } from 'vue'
import type { RjColumn, RjEditorOption, RjOptionSource } from './types'
import { colIdOf } from './utils'

/** 列字段归一选项（对象式源携带 map/labelKey/valueKey/childrenKey 时生效） */
interface RjOptionShape {
  map?: (item: any) => RjEditorOption
  labelKey?: string
  valueKey?: string
  childrenKey?: string
}

/** 网格注入给子组件（RjEditor / RjFilterMenu）的只读访问器 */
export interface RjOptionsAccessor {
  /** 该列解析出的候选；未就绪或未声明时 undefined */
  list: (col: RjColumn) => RjEditorOption[] | undefined
  /** 该列 value→label；未命中时 undefined */
  label: (col: RjColumn, value: any) => string | undefined
}

/** 注入键：网格根 provide 访问器，子组件 inject 消费（仿 RJ_LOCALE_KEY / RJ_ICONS_KEY） */
export const RJ_OPTIONS_KEY: InjectionKey<RjOptionsAccessor> = Symbol('rj-options')

/** 子组件默认访问器（单独使用、未 inject 到时回退，全部返回 undefined 不影响原行为） */
export const defaultOptionsAccessor: RjOptionsAccessor = {
  list: () => undefined,
  label: () => undefined
}

/** 从接口单项里取 value：显式 key 优先，再退 value/id/code/key */
function pickValue(item: any, valueKey?: string): any {
  if (valueKey) return item[valueKey]
  if (item.value !== undefined) return item.value
  if (item.id !== undefined) return item.id
  if (item.code !== undefined) return item.code
  if (item.key !== undefined) return item.key
  return undefined
}

/** 从接口单项里取 label：显式 key 优先，再退 label/name/text，最后回落 value 本身 */
function pickLabel(item: any, labelKey: string | undefined, value: any): string {
  if (labelKey) return String(item[labelKey] ?? value)
  if (item.label !== undefined) return String(item.label)
  if (item.name !== undefined) return String(item.name)
  if (item.text !== undefined) return String(item.text)
  return String(value)
}

/**
 * 把任意接口返回归一成 RjEditorOption[]：
 * - map 命中优先（完全自定义）；
 * - 否则按 labelKey/valueKey（或默认字段）取；
 * - childrenKey（默认 'children'）命中数组即保留为 children，递归归一（不再拍平），供下拉按层级渲染。
 */
export function normalizeOptions(raw: unknown, shape: RjOptionShape = {}): RjEditorOption[] {
  if (!Array.isArray(raw)) return []
  const ck = shape.childrenKey ?? 'children'
  const walk = (arr: unknown[]): RjEditorOption[] => {
    const res: RjEditorOption[] = []
    for (const it of arr) {
      if (it == null || typeof it !== 'object') {
        // 纯标量项（如 ['a','b'] 或 [1,2]）：value=label=该标量
        if (it !== null && it !== undefined) res.push({ label: String(it), value: it })
        continue
      }
      const item = it as Record<string, any>
      let opt: RjEditorOption
      if (shape.map) {
        opt = shape.map(item)
      } else {
        const value = pickValue(item, shape.valueKey)
        const label = pickLabel(item, shape.labelKey, value)
        opt = { label, value }
      }
      const kids = Array.isArray(item[ck]) ? walk(item[ck] as unknown[]) : undefined
      if (kids && kids.length) opt.children = kids
      res.push(opt)
    }
    return res
  }
  return walk(raw)
}

/** 深度优先拍平选项树（丢弃 children 引用），供 value→label 映射 / 枚举候选等需要扁平列表的消费点 */
export function flattenOptions(options: RjEditorOption[]): RjEditorOption[] {
  const out: RjEditorOption[] = []
  const walk = (arr: RjEditorOption[]) => {
    for (const o of arr || []) {
      out.push({ label: o.label, value: o.value })
      if (o.children && o.children.length) walk(o.children)
    }
  }
  walk(options || [])
  return out
}

/**
 * 按搜索词剪枝选项树（大小写不敏 contains）：
 * - 节点自身命中 → 保留该节点及其完整子树（可继续下钻）；
 * - 自身未命中但有后代命中 → 作为祖先路径保留（children 为剪枝后的子集）；
 * - 空查询原样返回。返回全新节点对象，不污染缓存。
 */
export function filterOptionTree(options: RjEditorOption[], query: string): RjEditorOption[] {
  const q = (query || '').trim().toLowerCase()
  if (!q) return options
  const walk = (arr: RjEditorOption[]): RjEditorOption[] => {
    const res: RjEditorOption[] = []
    for (const o of arr || []) {
      const kids = o.children && o.children.length ? walk(o.children) : []
      const self = String(o.label ?? o.value ?? '').toLowerCase().includes(q)
      if (self) res.push({ ...o })
      else if (kids.length) res.push({ label: o.label, value: o.value, children: kids })
    }
    return res
  }
  return walk(options)
}

/** 树渲染行：option + 层级深度 + 是否可展开 + 当前是否已展开 */
export interface RjOptionRow {
  option: RjEditorOption
  depth: number
  hasChildren: boolean
  expanded: boolean
}

/**
 * 按展开集合把（已剪枝的）选项树铺成可渲染的可见行（深度优先）。
 * expanded 以 String(value) 为键；未展开节点的子树不进入可见行。
 */
export function flattenTreeForRender(
  options: RjEditorOption[],
  expanded: Set<string>
): RjOptionRow[] {
  const rows: RjOptionRow[] = []
  const walk = (arr: RjEditorOption[], depth: number) => {
    for (const o of arr || []) {
      const hasChildren = !!(o.children && o.children.length)
      const exp = hasChildren && expanded.has(String(o.value))
      rows.push({ option: o, depth, hasChildren, expanded: exp })
      if (hasChildren && exp) walk(o.children as RjEditorOption[], depth + 1)
    }
  }
  walk(options || [], 0)
  return rows
}

/** 收集树中所有“有子节点”的 value（String 化），用于默认展开全部 */
export function collectParentKeys(options: RjEditorOption[], acc: Set<string> = new Set()): Set<string> {
  for (const o of options || []) {
    if (o.children && o.children.length) {
      acc.add(String(o.value))
      collectParentKeys(o.children, acc)
    }
  }
  return acc
}

/** 解析选项源所需的网格级加载器 */
export interface RjOptionLoaders {
  dictLoader?: (key: string) => unknown | Promise<unknown>
  optionsLoader?: (name: string) => unknown | Promise<unknown>
}

/** 解析一个列的选项源为候选数组（异步；失败静默回落空数组 → 显示原样回落原始值） */
export async function resolveOptions(
  source: RjOptionSource | undefined,
  dict: string | undefined,
  loaders: RjOptionLoaders
): Promise<RjEditorOption[]> {
  try {
    if (dict) return normalizeOptions(await loaders.dictLoader?.(dict))
    if (!source) return []
    if (Array.isArray(source)) return normalizeOptions(source)
    if (typeof source === 'function') return normalizeOptions(await source())
    // 对象式源：把 map/labelKey/valueKey/childrenKey 作为归一 shape
    const shape = source as RjOptionShape
    if (source.items) return normalizeOptions(source.items, shape)
    if (source.dict) return normalizeOptions(await loaders.dictLoader?.(source.dict), shape)
    if (source.ref) return normalizeOptions(await loaders.optionsLoader?.(source.ref), shape)
    if (source.load) return normalizeOptions(await source.load(), shape)
  } catch {
    /* 数据源加载失败：回落空候选，各消费点自动退回原始值显示/行为 */
  }
  return []
}

// 函数引用 → 稳定缓存键（同一 load/工厂函数只解析一次）
let _fnSeq = 0
const fnKeys = new WeakMap<Function, string>()
function fnKey(fn: Function, prefix: string): string {
  let k = fnKeys.get(fn)
  if (!k) {
    k = `${prefix}:${++_fnSeq}`
    fnKeys.set(fn, k)
  }
  return k
}

/**
 * 计算列选项源的缓存键：dict/ref 按 key 归并（两列同字典只加载一次），
 * 静态数组 / 函数按列或函数身份。返回 null 表示该列无选项载体。
 */
export function sourceCacheKey(col: RjColumn): string | null {
  if (col.dict) return 'dict:' + col.dict
  const s = col.options
  if (!s) return null
  if (Array.isArray(s)) return 'static:' + colIdOf(col)
  if (typeof s === 'function') return fnKey(s, 'fn')
  if (s.dict) return 'dict:' + s.dict
  if (s.ref) return 'ref:' + s.ref
  if (s.load) return fnKey(s.load, 'load')
  if (s.items) return 'static:' + colIdOf(col)
  return null
}

/** 递归收集声明了 options/dict 的列（含多级表头子列） */
export function collectOptionCols(cols: RjColumn[], out: RjColumn[] = []): RjColumn[] {
  for (const c of cols || []) {
    if (c.dict || c.options) out.push(c)
    if (c.children && c.children.length) collectOptionCols(c.children, out)
  }
  return out
}
