// RJGrid 自然语言查询引擎（NLQ）—— 对标 AG Grid 无内置、作为旗舰差异化能力
// ---------------------------------------------------------------------------
// 完全离线、零依赖、零网络、确定性可测：把一句中文/英文查询解析成结构化的
// 「列筛选 + 排序 + 分组 + 取前N + 全局搜索」。不接入大模型，靠列感知的规则/词典解析。
//
// 支持示例：
//   数量大于100 且 状态为在库 按金额降序 前10
//   金额 1000 到 5000，类别包含电子
//   price > 10 and name contains bolt  sort by price desc
//   日期在2024-01-01到2024-03-01之间，按仓库分组
// ---------------------------------------------------------------------------
import type { RjFilterModel, RjSortState } from './types'
import type { RjLang } from './locale'

export type RjNlqFilterType = 'text' | 'number' | 'date' | 'select'

/** 参与解析的列描述（由网格从列定义构建） */
export interface RjNlqColumn {
  colId: string
  field?: string
  title?: string
  filterType: RjNlqFilterType
  /** 额外可识别的别名（不含 title/field） */
  aliases?: string[]
  /** select / 低基数列的候选值，用于把口语值映射到真实值 */
  options?: string[]
  /** options 来自列定义（权威枚举）：此时拒绝候选之外的口语值；数据采样的 options 不拒绝 */
  strictOptions?: boolean
}

/** 单条解析出的列筛选条件 */
export interface RjNlqClause {
  colId: string
  field?: string
  title?: string
  filterType: RjNlqFilterType
  op: string
  value1?: any
  value2?: any
  /** 与前一条件是否 OR 连接 */
  or: boolean
  raw: string
}

/** 解析结果 */
export interface RjNlqResult {
  ok: boolean
  /** 空查询 / 无法识别 时的说明键（交由 i18n 展示） */
  message?: 'empty' | 'unrecognized'
  /** 按列聚合后的筛选模型（跨列 AND，与网格既有语义一致） */
  filters: { colId: string; field?: string; title?: string; model: RjFilterModel }[]
  sort?: RjSortState
  /** 排序列展示名（title，供 explainNLQ 本地化回显） */
  sortTitle?: string
  groupBy?: string
  groupColId?: string
  /** 分组列展示名（title，供 explainNLQ 本地化回显） */
  groupTitle?: string
  limit?: number
  search?: string
  clauses: RjNlqClause[]
}

// ---------------- 词典 ----------------

type Cand = { k: string; op: string }

// 数值比较（含符号）
// 英文同义词按「同位置取最长」规则参与匹配（见 matchOp），故长短语与短式可共存
const NUM_OPS: Cand[] = [
  { k: 'greater than or equal to', op: 'gte' },
  { k: 'more than or equal to', op: 'gte' },
  { k: 'less than or equal to', op: 'lte' },
  { k: 'fewer than or equal to', op: 'lte' },
  { k: 'not equal to', op: 'ne' },
  { k: 'not equals to', op: 'ne' },
  { k: 'greater than', op: 'gt' },
  { k: 'more than', op: 'gt' },
  { k: 'higher than', op: 'gt' },
  { k: 'less than', op: 'lt' },
  { k: 'fewer than', op: 'lt' },
  { k: 'lower than', op: 'lt' },
  { k: 'no less than', op: 'gte' },
  { k: 'no more than', op: 'lte' },
  { k: 'at least', op: 'gte' },
  { k: 'at most', op: 'lte' },
  { k: 'equal to', op: 'eq' },
  { k: 'equals to', op: 'eq' },
  { k: 'above', op: 'gt' },
  { k: 'over', op: 'gt' },
  { k: 'below', op: 'lt' },
  { k: 'under', op: 'lt' },
  { k: '大于等于', op: 'gte' },
  { k: '不低于', op: 'gte' },
  { k: '不少于', op: 'gte' },
  { k: '至少', op: 'gte' },
  { k: '>=', op: 'gte' },
  { k: '小于等于', op: 'lte' },
  { k: '不超过', op: 'lte' },
  { k: '不大于', op: 'lte' },
  { k: '最多', op: 'lte' },
  { k: '<=', op: 'lte' },
  { k: '大于', op: 'gt' },
  { k: '高于', op: 'gt' },
  { k: '超过', op: 'gt' },
  { k: '多于', op: 'gt' },
  { k: '>', op: 'gt' },
  { k: 'gte', op: 'gte' },
  { k: 'gt', op: 'gt' },
  { k: '小于', op: 'lt' },
  { k: '低于', op: 'lt' },
  { k: '少于', op: 'lt' },
  { k: '不足', op: 'lt' },
  { k: '<', op: 'lt' },
  { k: 'lte', op: 'lte' },
  { k: 'lt', op: 'lt' },
  { k: '不等于', op: 'ne' },
  { k: '!=', op: 'ne' },
  { k: '<>', op: 'ne' },
  { k: 'ne', op: 'ne' },
  { k: '等于', op: 'eq' },
  { k: '=', op: 'eq' },
  { k: 'eq', op: 'eq' }
]
// 日期比较
const DATE_OPS: Cand[] = [
  { k: 'earlier than', op: 'lt' },
  { k: 'later than', op: 'gt' },
  { k: 'on or before', op: 'lte' },
  { k: 'on or after', op: 'gte' },
  { k: 'not before', op: 'gte' },
  { k: 'not after', op: 'lte' },
  { k: 'before', op: 'lt' },
  { k: 'after', op: 'gt' },
  { k: '早于', op: 'lt' },
  { k: '之前', op: 'lt' },
  { k: '不晚于', op: 'lte' },
  { k: '<', op: 'lt' },
  { k: '晚于', op: 'gt' },
  { k: '之后', op: 'gt' },
  { k: '不早于', op: 'gte' },
  { k: '>', op: 'gt' },
  { k: '不等于', op: 'ne' },
  { k: '等于', op: 'eq' },
  { k: '是', op: 'eq' },
  { k: '为', op: 'eq' },
  { k: '=', op: 'eq' }
]
// 文本比较
const TEXT_OPS: Cand[] = [
  { k: 'does not contain', op: 'ne' },
  { k: 'does not include', op: 'ne' },
  { k: 'is not equal to', op: 'ne' },
  { k: 'is not', op: 'ne' },
  { k: 'is equal to', op: 'eq' },
  { k: 'is', op: 'eq' },
  { k: '不包含', op: 'ne' },
  { k: '不含', op: 'ne' },
  { k: 'not contains', op: 'ne' },
  { k: 'not equals', op: 'ne' },
  { k: '开头是', op: 'startsWith' },
  { k: '开头为', op: 'startsWith' },
  { k: '结尾是', op: 'endsWith' },
  { k: '结尾为', op: 'endsWith' },
  { k: '不为空', op: 'notBlank' },
  { k: '非空', op: 'notBlank' },
  { k: '为空', op: 'blank' },
  { k: 'startsWith', op: 'startsWith' },
  { k: 'endsWith', op: 'endsWith' },
  { k: 'notBlank', op: 'notBlank' },
  { k: 'blank', op: 'blank' },
  { k: 'starts with', op: 'startsWith' },
  { k: 'ends with', op: 'endsWith' },
  { k: '包含', op: 'contains' },
  { k: '含有', op: 'contains' },
  { k: '包括', op: 'contains' },
  { k: 'contains', op: 'contains' },
  { k: 'includes', op: 'contains' },
  { k: 'like', op: 'contains' },
  { k: '不等于', op: 'ne' },
  { k: '不是', op: 'ne' },
  { k: '不为', op: 'ne' },
  { k: 'ne', op: 'ne' },
  { k: '等于', op: 'eq' },
  { k: 'equals', op: 'eq' },
  { k: '是', op: 'eq' },
  { k: '为', op: 'eq' },
  { k: 'eq', op: 'eq' }
]
// 枚举（select）
const SELECT_OPS: Cand[] = [
  { k: 'does not contain', op: 'notIn' },
  { k: 'does not include', op: 'notIn' },
  { k: 'is not equal to', op: 'notIn' },
  { k: 'is not', op: 'notIn' },
  { k: 'is one of', op: 'in' },
  { k: 'equal to', op: 'in' },
  { k: 'contains', op: 'in' },
  { k: 'includes', op: 'in' },
  { k: '不包含', op: 'notIn' },
  { k: '不含', op: 'notIn' },
  { k: '不属于', op: 'notIn' },
  { k: '排除', op: 'notIn' },
  { k: '不是', op: 'notIn' },
  { k: '不为', op: 'notIn' },
  { k: '不等于', op: 'notIn' },
  { k: 'not in', op: 'notIn' },
  { k: '包括', op: 'in' },
  { k: '包含', op: 'in' },
  { k: '属于', op: 'in' },
  { k: 'is', op: 'in' },
  { k: '是', op: 'in' },
  { k: '为', op: 'in' },
  { k: '等于', op: 'in' }
]
const NIL_OPS = new Set(['blank', 'notBlank'])

function opList(type: RjNlqFilterType): Cand[] {
  if (type === 'number') return NUM_OPS
  if (type === 'date') return DATE_OPS
  if (type === 'select') return SELECT_OPS
  return TEXT_OPS
}

// ---------------- 正则工具 ----------------

// 首尾连接词（含可选分隔符），全局匹配后由后续 SEP/trim 兵底
const CONJ_EDGE =
  /^[\s，,、;；]*(?:或|或者|且|并且|和|与|及|or|and)[\s，,、;；]*|[\s，,、;；]*(?:或|或者|且|并且|和|与|及|or|and)[\s，,、;；]*$/gi
const SEP = /[，,、;；\s]+/
// 数值（支持 万/亿/%/千分位）
const NUM_RE = /(-?\d[\d,]*(?:\.\d+)?)\s*(万|亿|%)?/g
// 日期：ISO / 斜杠 / 中文 / 仅月日
const DATE_RE =
  /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?|(\d{4})[-/](\d{1,2})|(\d{1,2})[-/月](\d{1,2})日?/g

function toNumber(raw: string, unit?: string): number {
  let n = parseFloat(raw.replace(/,/g, ''))
  if (unit === '万') n *= 10000
  else if (unit === '亿') n *= 100000000
  return n
}
function extractNumbers(s: string): number[] {
  const out: number[] = []
  let m: RegExpExecArray | null
  NUM_RE.lastIndex = 0
  while ((m = NUM_RE.exec(s))) out.push(toNumber(m[1], m[2]))
  return out
}
function extractDates(s: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  DATE_RE.lastIndex = 0
  while ((m = DATE_RE.exec(s))) {
    if (m[1]) out.push(`${m[1]}-${pad(m[2])}-${pad(m[3])}`)
    else if (m[4]) out.push(`${m[4]}-${pad(m[5])}`)
    else if (m[6]) out.push(`${new Date().getFullYear()}-${pad(m[6])}-${pad(m[7])}`)
  }
  return out
}
const pad = (n: string) => (n.length < 2 ? '0' + n : n)
const stripQuotes = (s: string) => s.replace(/^["'“「『]|["'」』”]$/g, '').trim()

// ---------------- 主解析 ----------------

/** 解析自然语言查询 */
export function parseNLQ(text: string, columns: RjNlqColumn[]): RjNlqResult {
  const raw = (text || '').trim()
  const empty: RjNlqResult = { ok: false, filters: [], clauses: [] }
  if (!raw) return { ...empty, message: 'empty' }

  const result: RjNlqResult = { ok: false, filters: [], clauses: [] }

  // 用一个「遮蔽缓冲」把已消费的片段替换为空格，避免排序/分组里的列名被误当成筛选锚点
  let buf = raw
  // 位置无关的整体指令：limit（中：前/取/返回/最多；英：top/first/limit/show me/give me）
  const lim = buf.match(
    /(?:前|取|返回|最多|top|first|limit|show(?:\s+me)?|give\s+me)\s*(?:the\s+)?(\d+)\s*(?:行|条|个|名|件|rows?|records?|items?|results?)?/i
  )
  if (lim) {
    result.limit = parseInt(lim[1], 10)
    buf = blank(buf, lim.index!, lim[0].length)
  }
  // 全局搜索短语：搜索X / 查找X / search X（先于列锚点提取并遮蔽，使其可与筛选/排序共存且不被误当列名）
  const sr = buf.match(
    /(?:搜索|检索|查找|查找到|find|search)\s*[：:]?\s*["'“「]?([^"'”」]+?)["'」”]?(?=$|[，,、;；\s])/i
  )
  if (sr && sr.index != null) {
    const kw = sr[1].trim()
    if (kw) {
      result.search = stripQuotes(kw)
      buf = blank(buf, sr.index, sr[0].length)
    }
  }
  // group by：按X分组 / 分组X / group by X
  const g = matchColumnPhrase(buf, [
    /按([^，,、;；]+?)(?:分组|归类|group\s*by)/i,
    /(?:分组|归类|group\s*by)[：:]?\s*([^，,、;；]+?)(?=$|[，,、;；\s])/i
  ])
  if (g) {
    const col = resolveColumn(g.name, columns)
    if (col) {
      result.groupBy = col.field || col.title || col.colId
      result.groupColId = col.colId
      result.groupTitle = col.title || col.field || col.colId
      buf = blank(buf, g.start, g.len)
    }
  }
  // sort：按X升序/降序/倒序 / X排序 / sort by X asc|desc / X最高(比较级)
  const s = matchColumnPhrase(buf, [
    /按([^，,、;；]+?)(?:升序|降序|倒序|从大到小|从小到大|排序|sort)/i,
    /sort\s*by\s+([^，,、;；]+)/i,
    /([^，,、;；\s]+?)(?:升序|降序|倒序|从大到小|从小到大)/i,
    // 比较级：X最高/最低/最大/最小/最贵/最便宜/最多/最少（可带尾随「的」一并消费，避免泄漏进相邻筛选值）
    /([^，,、;；\s]+?)最(?:高|低|大|小|贵|便宜|多|少)的?/i,
    // 英文比较级（后缀式）：X highest / X most expensive / X cheapest（不含裸 most/least，以免吞掉 at most/at least）
    /([a-z][a-z ]*?)\s+(?:the\s+)?(?:highest|lowest|largest|biggest|smallest|most expensive|least expensive|cheapest)\b/i,
    // 英文比较级（前缀式）：highest X / cheapest X
    /\b(?:highest|lowest|largest|biggest|smallest|most expensive|cheapest|least expensive)\s+(?:the\s+)?([a-z][a-z ]*?)(?=$|[，,、;；.]|\s+(?:and|by|of)\b)/i
  ])
  if (s) {
    const col = resolveColumn(s.name, columns)
    if (col) {
      const dirWord = (s.word || '').toLowerCase()
      const desc =
        /降序|倒序|从大到小|desc|最高|最大|最贵|最多|highest|largest|biggest|most expensive/.test(
          dirWord
        )
      result.sort = { field: col.field || col.colId, dir: desc ? 'desc' : 'asc' }
      result.sortTitle = col.title || col.field || col.colId
      buf = blank(buf, s.start, s.len)
    }
  }

  // 余下作为筛选锚点扫描
  const anchors = findAnchors(buf, columns)
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i]
    const regionEnd = i + 1 < anchors.length ? anchors[i + 1].start : buf.length
    let region = buf.slice(a.end, regionEnd)
    // 剩除区域首/尾的连接词与分隔符（连接词仅起子句分隔作用；or 语义靠锚点间隙判定，不受影响）
    region = region.replace(CONJ_EDGE, '').replace(SEP, ' ').trim()
    const clause = parseClause(region, a.col)
    if (clause) {
      clause.or = i > 0 && /或|\bor\b/i.test(buf.slice(anchors[i - 1].end, a.start))
      result.clauses.push(clause)
    }
  }

  // 裸枚举值兼底：整句无列锚点、无引号短语、无显式搜索时，把命中 select 候选值的独立词归到所属列（「在库」→ 状态 in 在库）
  const quoted = raw.match(/["'“「](.+?)["'」”]/)
  if (!anchors.length && !result.clauses.length && !result.search && !quoted) {
    for (const t of splitValues(buf)) {
      const hit = pickSelectColumn(t, columns)
      if (hit)
        result.clauses.push({
          colId: hit.col.colId,
          field: hit.col.field,
          title: hit.col.title,
          filterType: 'select',
          op: 'in',
          value1: [hit.opt],
          or: false,
          raw: t
        })
    }
  }

  result.filters = mergeClauses(result.clauses, columns)

  // 全局搜索：无显式「搜索X」时，把未消费的引号短语作为 quick filter
  if (!result.search && quoted && !result.clauses.length) result.search = quoted[1]
  result.ok = !!(
    result.filters.length ||
    result.sort ||
    result.groupBy ||
    result.limit ||
    result.search
  )
  if (!result.ok) result.message = 'unrecognized'
  return result
}

// 把 [start, start+len) 替换为等长空格，保持其余位置索引不变
function blank(s: string, start: number, len: number): string {
  return s.slice(0, start) + ' '.repeat(len) + s.slice(start + len)
}

// 在候选正则中捕获列名短语，返回其在 buf 中的位置与匹配串
function matchColumnPhrase(
  buf: string,
  regexes: RegExp[]
): { name: string; start: number; len: number; word: string } | null {
  for (const re of regexes) {
    const m = buf.match(re)
    if (m && m.index != null) {
      return { name: m[1], start: m.index, len: m[0].length, word: m[0] }
    }
  }
  return null
}

// 依据名称（title/field/alias）解析列
function resolveColumn(name: string, columns: RjNlqColumn[]): RjNlqColumn | null {
  const key = (name || '').trim().toLowerCase()
  if (!key) return null
  for (const c of columns) {
    const keys = [c.title, c.field, ...(c.aliases || [])].filter(Boolean) as string[]
    for (const k of keys) {
      const kk = k.toLowerCase()
      if (key === kk || key.includes(kk) || kk.includes(key)) return c
    }
  }
  return null
}

// 找出 buf 中所有出现的列引用（最长优先，不重叠）
function findAnchors(
  buf: string,
  columns: RjNlqColumn[]
): { start: number; end: number; col: RjNlqColumn }[] {
  const cands: { k: string; col: RjNlqColumn }[] = []
  for (const c of columns) {
    const keys = [c.title, c.field, ...(c.aliases || [])].filter(Boolean) as string[]
    for (const k of keys) cands.push({ k, col: c })
  }
  cands.sort((a, b) => b.k.length - a.k.length)
  const found: { start: number; end: number; col: RjNlqColumn }[] = []
  const low = buf.toLowerCase()
  const taken: boolean[] = new Array(buf.length).fill(false)
  for (const { k, col } of cands) {
    const kk = k.toLowerCase()
    let idx = low.indexOf(kk)
    while (idx >= 0) {
      let overlap = false
      for (let p = idx; p < idx + kk.length; p++) if (taken[p]) overlap = true
      if (!overlap) {
        for (let p = idx; p < idx + kk.length; p++) taken[p] = true
        found.push({ start: idx, end: idx + kk.length, col })
      }
      idx = low.indexOf(kk, idx + 1)
    }
  }
  found.sort((a, b) => a.start - b.start)
  return found
}

// 解析单条筛选区域 → clause
function parseClause(region: string, col: RjNlqColumn): RjNlqClause | null {
  if (!region) return null
  const base = {
    colId: col.colId,
    field: col.field,
    title: col.title,
    filterType: col.filterType,
    raw: region
  }

  // 空/非空（无需值）
  const nil = matchOp(region, NIL_CANDS)
  if (nil && NIL_OPS.has(nil.op)) {
    return { ...base, op: nil.op, or: false, value1: undefined }
  }

  // 先取比较词
  const o = matchOp(region, opList(col.filterType))
  let op = o.op
  const rest = o.rest

  // 区间：区域含「A到B」形态
  const rangeWords = /介于|之间|区间|范围|到|至|~|～|—|－|through|\bto\b/i.test(region)
  if (rangeWords) {
    if (col.filterType === 'number') {
      const nums = extractNumbers(rest || region)
      if (nums.length >= 2)
        return { ...base, op: 'inRange', value1: nums[0], value2: nums[1], or: false }
    } else if (col.filterType === 'date') {
      const ds = extractDates(region)
      if (ds.length >= 2) return { ...base, op: 'inRange', value1: ds[0], value2: ds[1], or: false }
    }
  }

  if (!op) {
    // 无显式比较词时的默认
    if (col.filterType === 'select') op = 'in'
    else if (col.filterType === 'number') op = 'eq'
    else if (col.filterType === 'date') op = 'eq'
    else op = 'contains'
  }

  // 值解析
  if (col.filterType === 'number') {
    const nums = extractNumbers(rest)
    if (!nums.length) return null
    if (op === 'inRange') {
      if (nums.length < 2) return null
      return { ...base, op, value1: nums[0], value2: nums[1], or: false }
    }
    return { ...base, op, value1: nums[0], or: false }
  }
  if (col.filterType === 'date') {
    const ds = extractDates(rest)
    if (!ds.length) return null
    return { ...base, op, value1: ds[0], or: false }
  }
  if (col.filterType === 'select') {
    const vals = splitValues(rest)
      .map((v) => matchOption(v, col))
      .filter(Boolean) as string[]
    if (!vals.length) return null
    // 网格 in/notIn 匹配要求 value1 为数组
    return { ...base, op, value1: vals, or: false }
  }
  // text
  const val = stripQuotes(rest.replace(/^(?:是|为|包含|含有|等于)\s*/, '')).trim()
  if (!val) return null
  return { ...base, op, value1: val, or: false }
}

const NIL_CANDS: Cand[] = [
  { k: 'is not empty', op: 'notBlank' },
  { k: 'not empty', op: 'notBlank' },
  { k: 'is empty', op: 'blank' },
  { k: '不为空', op: 'notBlank' },
  { k: '非空', op: 'notBlank' },
  { k: '为空', op: 'blank' },
  { k: 'notBlank', op: 'notBlank' },
  { k: 'blank', op: 'blank' }
]

// 在区域开头匹配比较词（优先取「值之前最近的比较词」：从 rest 起始扫描）
function matchOp(region: string, list: Cand[]): { op: string; rest: string } {
  let bestPos = -1
  let best: Cand | null = null
  const low = region.toLowerCase()
  for (const c of list) {
    if (!c.k) continue
    const idx = low.indexOf(c.k.toLowerCase())
    if (
      idx >= 0 &&
      (bestPos === -1 || idx < bestPos || (idx === bestPos && c.k.length > best!.k.length))
    ) {
      bestPos = idx
      best = c
    }
  }
  if (best && bestPos >= 0) return { op: best.op, rest: region.slice(bestPos + best.k.length) }
  return { op: '', rest: region }
}

function splitValues(s: string): string[] {
  return stripQuotes(s)
    .split(/[、,，\/\s]|或|和|与|及/)
    .map((x) => x.trim())
    .filter(Boolean)
}

/**
 * 口语值→真实候选项。无 options、或 options 来自数据采样（非权威）时尽量采纳；
 * 仅当 options 为列定义声明的权威枚举且包不住这个说法时返回 null，交给调用方当作未识别，
 * 以免产出一个必定位中 0 行的静默空筛选。
 */
function matchOption(v: string, col: RjNlqColumn): string | null {
  if (!v) return null
  if (!col.options || !col.options.length) return v
  const hit = col.options.find((o) => o === v || o.includes(v) || v.includes(o))
  if (hit) return hit
  return col.strictOptions ? null : v
}

/**
 * 裸枚举值→列：在一个独立词恰等于（忽略大小写）某 select 列的候选值时命中该列。
 * 要求精确相等（非包含），以免把文本列里的子串误当枚举。
 */
function pickSelectColumn(
  token: string,
  columns: RjNlqColumn[]
): { col: RjNlqColumn; opt: string } | null {
  const t = (token || '').trim().toLowerCase()
  if (!t) return null
  for (const col of columns) {
    if (col.filterType !== 'select' || !col.options) continue
    const opt = col.options.find((o) => o.toLowerCase() === t)
    if (opt) return { col, opt }
  }
  return null
}

// 同列多条件合并为 RjFilterModel；跨列各自独立（网格按列 AND）
function mergeClauses(clauses: RjNlqClause[], columns: RjNlqColumn[]): RjNlqResult['filters'] {
  const byCol = new Map<string, RjNlqClause[]>()
  for (const c of clauses) {
    const arr = byCol.get(c.colId) || []
    arr.push(c)
    byCol.set(c.colId, arr)
  }
  const out: RjNlqResult['filters'] = []
  for (const [colId, cs] of byCol) {
    const col = columns.find((c) => c.colId === colId)!
    const model: RjFilterModel = {
      type: col.filterType as any,
      operator: cs.some((c) => c.or) ? 'or' : 'and',
      conditions: cs.map((c) => ({ op: c.op, value1: c.value1, value2: c.value2 }))
    }
    out.push({ colId, field: col.field, title: col.title, model })
  }
  return out
}

/** 算子的本地化展示标签（供 explainNLQ 回显） */
const OP_LABEL: Record<RjLang, Record<string, string>> = {
  zh: {
    eq: '=',
    ne: '≠',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    contains: '包含',
    notContains: '不包含',
    startsWith: '开头是',
    endsWith: '结尾为',
    blank: '为空',
    notBlank: '非空',
    in: '属于',
    notIn: '不属于',
    inRange: '介于'
  },
  en: {
    eq: '=',
    ne: '≠',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    contains: 'contains',
    notContains: 'not contains',
    startsWith: 'starts with',
    endsWith: 'ends with',
    blank: 'is empty',
    notBlank: 'is not empty',
    in: 'is',
    notIn: 'not',
    inRange: 'between'
  }
}

/**
 * 生成人类可读的解析摘要（供 UI 回显）。传 lang 则随语言本地化：
 * 中文如「数量 > 100 · 按金额 降序 · 前5 · 搜索“轴承”」，英文如「qty > 100 · sort by amount desc · top 5 · search "bolt"」。
 */
export function explainNLQ(r: RjNlqResult, lang: RjLang = 'zh'): string {
  const en = lang === 'en'
  const labels = OP_LABEL[lang]
  const parts: string[] = []
  for (const c of r.clauses) {
    const opLabel = labels[c.op] || c.op
    const name = c.title || c.field || c.colId
    let val: string
    if (c.op === 'blank' || c.op === 'notBlank') val = ''
    else if (c.value2 != null) val = `${c.value1}~${c.value2}`
    else if (Array.isArray(c.value1)) val = c.value1.join(en ? ' / ' : '、')
    else val = String(c.value1 ?? '')
    // 中文无符号算子（包含/属于…）直接接值；符号算子两侧留空格
    const glue = en || /^[=<>≤≥≠]/.test(opLabel) ? ' ' : ''
    parts.push(`${name} ${opLabel}${glue}${val}`.trim())
  }
  if (r.sort)
    parts.push(
      en
        ? `sort by ${r.sortTitle || r.sort.field} ${r.sort.dir}`
        : `按${r.sortTitle || r.sort.field} ${r.sort.dir === 'desc' ? '降序' : '升序'}`
    )
  if (r.groupBy) parts.push(en ? `group by ${r.groupTitle || r.groupBy}` : `按${r.groupTitle || r.groupBy}分组`)
  if (r.limit) parts.push(en ? `top ${r.limit}` : `前${r.limit}`)
  if (r.search) parts.push(en ? `search "${r.search}"` : `搜索“${r.search}”`)
  return parts.join(' · ')
}
