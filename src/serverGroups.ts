// RJGrid 服务端权威分组（serverSideGrouping）展平纯引擎。
// 后端把分组结果按【平铺】序列返回：组行带 __group + __level（+ 可选 __path/__groupValue/__count/__footer），
//  ① 子行内联紧随其后；或 ② 只给组行、子行待懒取（其后再无更深行）。
// 本模块负责：补齐组行契约字段、按折叠态隐藏其子区间、对 ② 登记「需发 type:'group' 子块请求」，
// 并产出与客户端分组完全一致的显示行结构（type:'group' 锚行 / group-footer / 数据行），渲染层零差别复用。
// absAt：显示行下标 → 输入序列（SSRM 稠密槽）绝对下标；懒取子行/组内占位为 -1，供块调度换算。
// 与 Vue/渲染无关，纯数据操作，便于单测与在任意服务端行源上复用。
import type { RjRowData } from './types'
import type { RjDisplayRow } from './useRowModel'

/** 某组的懒取子项状态（由行模型持有，避免在纯函数里发请求） */
export interface SgChildState {
  /** 已取回的子项平铺序列（空数组 = 后端确认无子行；与「取数失败」不同一状态） */
  kids?: RjRowData[]
  /** 正在取 */
  loading?: boolean
  /** 本代取数连续失败到上限：不再渲染子行、也不再登记请求（重取数/改分组/清缓存后自然恢复） */
  error?: boolean
}

/** 组元信息（按 path 索引，供子块取数参数复用，免去反解 path） */
export interface SgGroupMeta {
  level: number
  /** 该层级的分组字段 */
  field: string
  /** 从根到本组的组值路径 */
  values: any[]
}

/** 待取子块的组 */
export interface SgNeedLoad extends SgGroupMeta {
  path: string
}

export interface SgFlattenOptions {
  /** 分组字段，按层级顺序（与后端 __level 对应） */
  fields: string[]
  /** 行主键 */
  keyOf: (row: RjRowData) => string | number
  rowHeight: number
  /** 被收起的组 path（默认全部展开，与后端已内联返回子行的观感一致） */
  collapsed?: Set<string>
  /** path → 懒取子项状态 */
  childMap?: Map<string, SgChildState>
  /** 宿主判定某组行是否可展开（对应 isServerSideGroup）；缺省时按「有子行就可展开」推断 */
  isExpandable?: (row: RjRowData) => boolean
}

export interface SgFlattenResult {
  rows: RjDisplayRow[]
  /** 需要发起 type:'group' 子块请求的组（调用方去重后取数，回填 childMap） */
  needLoad: SgNeedLoad[]
  /** 本次出现过的全部组（path → 元信息） */
  metas: Map<string, SgGroupMeta>
  /** 与 rows 等长：显示下标 → 输入序列绝对下标（-1 = 非输入序列行，如懒取子行/组占位） */
  absAt: number[]
}

const NO_COLLAPSE: Set<string> = new Set()
const EMPTY_SET: Set<string> = new Set()
/** 懒取递归深度上限：子项回包带环（A→B→A）或病态深链时兜底，正常分组层级远小于此 */
const MAX_WALK_DEPTH = 64
/** 页脚行 key 后缀：页脚与所属组行 path 相同（同层同值），不加后缀就会撞 v-for 重复键 */
const FOOTER_SUFFIX = ':footer'
/** 派生组行缓存：保持显示行 data 引用稳定（源行不变 + 同 path 命中即复用） */
const decoCache = new WeakMap<RjRowData, { path: string; row: RjRowData }>()

const isGroupRow = (r: RjRowData) => !!(r as any).__group
const levelOf = (r: RjRowData): number =>
  typeof (r as any).__level === 'number' ? ((r as any).__level as number) : 0

/**
 * 补齐组行契约字段（__path/__level/__groupField/__groupValue/__groupLabels）。
 * 后端给全就原样返回；缺则浅拷贝补齐，不修改源对象。
 */
export function decorateGroupRow(
  row: RjRowData,
  path: string,
  level: number,
  field: string,
  value: any,
  labels: any[]
): RjRowData {
  if ((row as any).__path === path && (row as any).__groupValue !== undefined) return row
  const hit = decoCache.get(row)
  if (hit && hit.path === path) return hit.row
  const d: RjRowData = Object.assign({}, row, {
    __group: true,
    __path: path,
    __level: level,
    __groupField: (row as any).__groupField || field,
    __groupValue: value,
    __groupLabels: labels.length ? labels.slice() : [value]
  })
  if (field && d[field] == null) d[field] = value
  decoCache.set(row, { path, row: d })
  return d
}

/** 平铺（可含未加载空洞）→ 显示行序列 + 待取子块 + 下标映射 */
export function flattenServerGroups(
  items: (RjRowData | undefined)[],
  opts: SgFlattenOptions
): SgFlattenResult {
  const fields = opts.fields
  const collapsed = opts.collapsed || NO_COLLAPSE
  const childMap = opts.childMap
  const rh = opts.rowHeight
  const rows: RjDisplayRow[] = []
  const absAt: number[] = []
  const needLoad: SgNeedLoad[] = []
  const metas = new Map<string, SgGroupMeta>()
  let holeSeq = 0

  const emit = (row: RjDisplayRow, abs: number) => {
    rows.push(row)
    absAt.push(abs)
  }
  // 块未加载空洞：与 SSRM 稠密路径同款占位行
  const holeRow = (abs: number): RjDisplayRow => ({
    key: 'sg:hole:' + abs + ':' + holeSeq++,
    type: 'row',
    data: { __ssrmLoading: true } as RjRowData,
    level: 0,
    height: rh
  })
  // 子块在取：一行占位（不属于输入序列，abs=-1）
  const pendingRow = (path: string): RjDisplayRow => ({
    key: 'sg:loading:' + path,
    type: 'row',
    data: { __ssrmLoading: true, __groupChildren: path } as RjRowData,
    level: 0,
    height: rh
  })
  const dataRow = (r: RjRowData, parentKey: string | number): RjDisplayRow => ({
    key: opts.keyOf(r),
    type: 'row',
    data: r,
    level: 0,
    parentKey,
    height: rh
  })

  /**
   * @param baseAbs 该列表在输入序列中的起始绝对下标；null = 来自懒取子项（无绝对下标）
   * @param ctx     外层组上下文（懒取递归时为其父组）
   * @param seen    本条递归链上已展开过的组 path（防子项回包自引用/互引用把栈打爆）
   */
  function walk(
    list: (RjRowData | undefined)[],
    baseAbs: number | null,
    ctx: { parentKey: string | number; parentPath: string; parentValues: any[] },
    seen: Set<string> = EMPTY_SET
  ) {
    // 各层级当前打开的组：内联序列里父级就是「最近一次更浅的组」，无需先建树
    const pathAt: string[] = []
    const keyAt: (string | number)[] = []
    const valuesAt: any[][] = []
    let i = 0
    // 收起组的层级：其区间内（更深组 + 数据行）不输出，直到遇到同级或更浅的组
    let skipping: number | null = null

    while (i < list.length) {
      const raw = list[i]
      const abs = baseAbs === null ? -1 : baseAbs + i
      if (raw === undefined) {
        if (skipping === null) emit(holeRow(abs), abs)
        i++
        continue
      }
      if (!isGroupRow(raw)) {
        if (skipping === null) {
          const deep = keyAt.length ? keyAt[keyAt.length - 1] : ctx.parentKey
          emit(dataRow(raw, deep), abs)
        }
        i++
        continue
      }
      const level = levelOf(raw)
      if (skipping !== null) {
        if (level > skipping) {
          i++
          continue
        }
        // 同层页脚属于刚被收起的那个组：小计行跟着一起收，不能留在原位
        if (level === skipping && (raw as any).__footer) {
          i++
          continue
        }
        skipping = null
      }
      const field = fields[level] || (raw as any).__groupField || ''
      const value =
        (raw as any).__groupValue !== undefined
          ? (raw as any).__groupValue
          : field
            ? (raw as any)[field]
            : ''
      const parentPath = level > 0 ? (pathAt[level - 1] ?? ctx.parentPath) : ctx.parentPath
      const parentValues = level > 0 ? (valuesAt[level - 1] ?? ctx.parentValues) : ctx.parentValues
      const path =
        typeof (raw as any).__path === 'string' && (raw as any).__path
          ? (raw as any).__path
          : parentPath + '|' + level + '|' + encodeURIComponent(String(value ?? ''))
      const values = parentValues.concat([value])
      const isFooter = !!(raw as any).__footer
      metas.set(path, { level, field, values })
      pathAt.length = level + 1
      valuesAt.length = level + 1
      keyAt.length = level + 1
      pathAt[level] = path
      valuesAt[level] = values
      keyAt[level] = path
      const expandable = isFooter
        ? false
        : opts.isExpandable
          ? !!opts.isExpandable(raw)
          : (raw as any).__count === undefined || (raw as any).__count > 0
      const expanded = !isFooter && expandable && !collapsed.has(path)
      const data = decorateGroupRow(
        raw,
        path,
        level,
        field,
        value,
        (raw as any).__groupLabels && (raw as any).__groupLabels.length
          ? ((raw as any).__groupLabels as any[])
          : values
      )
      emit(
        {
          key: isFooter ? path + FOOTER_SUFFIX : path,
          type: 'group',
          data,
          level,
          parentKey: level > 0 ? (keyAt[level - 1] ?? ctx.parentKey) : ctx.parentKey,
          expanded,
          expandable,
          isFooter,
          height: rh
        },
        abs
      )

      i++
      if (isFooter || !expanded || !expandable) {
        if (!expanded && !isFooter && expandable) skipping = level
        continue
      }
      // 内联子行：下一个条目是数据行，或更深的组
      const hasNextSlot = i < list.length
      const next = hasNextSlot ? list[i] : undefined
      if (hasNextSlot && next === undefined) {
        // 块空洞：子行是否内联尚不可判，等该块补齐后自然判出（不抢跑懒取，免与内联子行双份）
        continue
      }
      const inline = hasNextSlot
        ? !isGroupRow(next as RjRowData) || levelOf(next as RjRowData) > level
        : false
      if (inline) continue
      // 子行待懒取（若后续内联子行才到达，上面 inline 分支优先，不会双份）
      const st = childMap && childMap.get(path)
      if (st && st.kids) {
        if (seen.has(path) || seen.size >= MAX_WALK_DEPTH) {
          // 子项里又出现同 path 的组行（后端把组行本身回灌）或异常深链：只渲染组行，不再递归
          console.warn('[rj-grid] 服务端分组子项自引用，跳过递归：' + path)
        } else {
          const next = new Set(seen)
          next.add(path)
          walk(st.kids, null, { parentKey: path, parentPath: path, parentValues: values }, next)
        }
      } else if (st && st.error) {
        // 本代取数已放弃：不出子行也不重登请求（重取数/改分组/清缓存会清掉失败态，那时恢复）
      } else {
        if (!st || !st.loading) needLoad.push({ path, level, field, values }) // 交调用方发 type:'group' 请求
        emit(pendingRow(path), -1)
      }
    }
  }

  walk(items, 0, { parentKey: '', parentPath: '', parentValues: [] })
  return { rows, needLoad, metas, absAt }
}
