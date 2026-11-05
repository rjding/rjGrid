// rj-grid 公式引擎：安全（无 eval / new Function）的 Excel 风格公式解析与求值。
// 设计目标：对标 AG Grid Formula（企业版）的单元格公式 / 依赖 / 循环检测，并做到零依赖、纯函数、可单测。
//
// 引用模型（混合，比 AG Grid 更易用）：
//  - A1 风格：单元格 `B2`、绝对 `$B$2`、区域 `B2:C10`、整列 `B:B`（列字母按当前有序列解析）。
//  - 字段名：`price`、`qty`（区分大小写不敏感，命中列 id/field）。作为标量 = 当前行该列的值；
//    整列聚合用 `qty:qty` 或 `B:B`。字段名允许含数字（`price2`），解析时优先精确匹配列名，避免被误判为单元格。
// 运算符优先级（低→高）：比较 = <> > < >= <= → 连接 & → 加减 → 乘除 → 幂 ^（右结合，一元负号更紧）→ 后缀 %。
// 函数：SUM/AVERAGE/MIN/MAX/COUNT/COUNTA/MEDIAN/PRODUCT/ROUND/... /IF/AND/OR/NOT/CONCAT/... 见 FUNCS。
// 错误以哨兵字符串传播：#REF! #VALUE! #NAME? #DIV/0! #NUM! #N/A #CIRCULAR!

// ---------------- 公共类型 ----------------

export type CellValue = number | string | boolean | null | undefined
export type FormulaValue = number | string | boolean

/** 求值上下文：列顺序 + 行数 + 取值器（0 基行列） */
export interface FormulaCtx {
  /** 有序列标识（colId 或 field），A/B/C 按索引映射 */
  columns: string[]
  /** 数据行数（用于整列/相对行的边界与 #REF! 判定） */
  rowCount: number
  /** 读取原始单元格值 */
  getValue: (col: number, row: number) => CellValue
}

/** 单元格坐标（0 基） */
export interface CellCoord {
  col: number
  row: number
}

/** 依赖项：某段列区间内的行范围（whole=true 表示整列跨所有行） */
export interface FormulaDep {
  c1: number
  c2: number
  r1: number
  r2: number
  whole: boolean
}

export const ERR = {
  REF: '#REF!',
  VALUE: '#VALUE!',
  NAME: '#NAME?',
  DIV0: '#DIV/0!',
  NUM: '#NUM!',
  NA: '#N/A',
  CIRC: '#CIRCULAR!'
} as const

/** 内部：以异常传播错误，evaluate 捕获后转哨兵字符串 */
class FError extends Error {
  constructor(public code: string) {
    super(code)
  }
}

/** 是否为公式文本（以 = 开头） */
export function isFormula(v: any): v is string {
  return typeof v === 'string' && v.length > 1 && v[0] === '='
}

// ---------------- 列字母 <-> 索引 ----------------

export function lettersToCol(s: string): number {
  let n = 0
  for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64)
  return n - 1
}

export function colToLetters(idx: number): string {
  let n = idx + 1
  let out = ''
  while (n > 0) {
    const m = (n - 1) % 26
    out = String.fromCharCode(65 + m) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

// ---------------- AST ----------------

type NumNode = { t: 'num'; v: number }
type StrNode = { t: 'str'; v: string }
type BoolNode = { t: 'bool'; v: boolean }
type RefNode = { t: 'ref'; token: string }
type FuncNode = { t: 'func'; name: string; args: AstNode[] }
type BinNode = { t: 'bin'; op: string; l: AstNode; r: AstNode }
type UnNode = { t: 'un'; op: string; e: AstNode }
type PctNode = { t: 'pct'; e: AstNode }
export type AstNode = NumNode | StrNode | BoolNode | RefNode | FuncNode | BinNode | UnNode | PctNode

// ---------------- 解析器 ----------------

const IDENT_CHARS = /[A-Za-z0-9_.$:]/
const WS = /[ \t\r\n]/

class Parser {
  private s: string
  private p = 0
  constructor(input: string) {
    // 去掉前导 = （公式标记）
    this.s = input[0] === '=' ? input.slice(1) : input
  }
  private skip() {
    while (this.p < this.s.length && WS.test(this.s[this.p])) this.p++
  }
  private peek(): string {
    this.skip()
    return this.p < this.s.length ? this.s[this.p] : ''
  }
  private eof() {
    this.skip()
    return this.p >= this.s.length
  }
  private readWhile(pred: (c: string) => boolean): string {
    let out = ''
    while (this.p < this.s.length && pred(this.s[this.p])) out += this.s[this.p++]
    return out
  }

  parse(): AstNode {
    const node = this.parseExpr()
    if (!this.eof()) throw new FError(ERR.NAME)
    return node
  }

  private parseExpr(): AstNode {
    return this.parseCompare()
  }

  private parseCompare(): AstNode {
    let l = this.parseConcat()
    for (;;) {
      const c = this.peek()
      let op = ''
      if (c === '=' || c === '<' || c === '>') {
        const two = this.s.slice(this.p, this.p + 2)
        if (two === '<>' || two === '>=' || two === '<=') op = two
        else if (c === '<' || c === '>') op = c
        else if (c === '=') op = '='
        else throw new FError(ERR.NAME)
        this.p += op.length
      } else break
      const r = this.parseConcat()
      l = { t: 'bin', op, l, r }
    }
    return l
  }

  private parseConcat(): AstNode {
    let l = this.parseAdd()
    while (this.peek() === '&') {
      this.p++
      const r = this.parseAdd()
      l = { t: 'bin', op: '&', l, r }
    }
    return l
  }

  private parseAdd(): AstNode {
    let l = this.parseMul()
    for (;;) {
      const c = this.peek()
      if (c === '+' || c === '-') {
        this.p++
        const r = this.parseMul()
        l = { t: 'bin', op: c, l, r }
      } else break
    }
    return l
  }

  private parseMul(): AstNode {
    let l = this.parsePow()
    for (;;) {
      const c = this.peek()
      if (c === '*' || c === '/') {
        this.p++
        const r = this.parsePow()
        l = { t: 'bin', op: c, l, r }
      } else break
    }
    return l
  }

  private parsePow(): AstNode {
    const base = this.parseUnary()
    if (this.peek() === '^') {
      this.p++
      const exp = this.parsePow() // 右结合
      return { t: 'bin', op: '^', l: base, r: exp }
    }
    return base
  }

  private parseUnary(): AstNode {
    const c = this.peek()
    if (c === '-' || c === '+') {
      this.p++
      return { t: 'un', op: c, e: this.parseUnary() }
    }
    return this.parsePostfix()
  }

  private parsePostfix(): AstNode {
    let e = this.parsePrimary()
    while (this.peek() === '%') {
      this.p++
      e = { t: 'pct', e }
    }
    return e
  }

  private parsePrimary(): AstNode {
    const c = this.peek()
    if (c === '') throw new FError(ERR.NAME)
    if (c === '(') {
      this.p++
      const e = this.parseExpr()
      if (this.peek() !== ')') throw new FError(ERR.NAME)
      this.p++
      return e
    }
    if (c === '"' || c === "'") {
      const quote = c
      this.p++
      const v = this.readWhile((ch) => ch !== quote)
      if (this.peek() !== quote) throw new FError(ERR.NAME)
      this.p++
      return { t: 'str', v }
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(this.s[this.p + 1] || ''))) {
      const num = this.readWhile((ch) => /[0-9.]/.test(ch))
      const n = parseFloat(num)
      if (isNaN(n)) throw new FError(ERR.VALUE)
      return { t: 'num', v: n }
    }
    if (/[A-Za-z_$]/.test(c)) {
      const token = this.readWhile((ch) => IDENT_CHARS.test(ch))
      // 函数调用：标识符后紧跟 (
      if (this.peek() === '(') {
        this.p++
        const args: AstNode[] = []
        if (this.peek() !== ')') {
          for (;;) {
            args.push(this.parseExpr())
            if (this.peek() === ',') {
              this.p++
              continue
            }
            break
          }
        }
        if (this.peek() !== ')') throw new FError(ERR.NAME)
        this.p++
        return { t: 'func', name: token.toUpperCase(), args }
      }
      // 布尔字面量
      const up = token.toUpperCase().replace(/\$/g, '')
      if (up === 'TRUE') return { t: 'bool', v: true }
      if (up === 'FALSE') return { t: 'bool', v: false }
      return { t: 'ref', token }
    }
    throw new FError(ERR.NAME)
  }
}

/** 解析公式为 AST（抛错版本，内部使用） */
function parseNode(input: string): AstNode {
  return new Parser(input).parse()
}

/** 对外解析：失败返回 null */
export function parse(input: string): AstNode | null {
  try {
    return parseNode(input)
  } catch {
    return null
  }
}

// ---------------- 引用解析 ----------------

interface Side {
  c: number
  r: number | null
}

function findField(token: string, ctx: FormulaCtx): number {
  const clean = token.replace(/\$/g, '').toLowerCase()
  return ctx.columns.findIndex((c) => String(c).toLowerCase() === clean)
}

function parseSide(side: string, ctx: FormulaCtx): Side {
  const clean = side.replace(/\$/g, '')
  const fi = findField(clean, ctx)
  if (fi >= 0) return { c: fi, r: null }
  const m = clean.match(/^([A-Za-z]{1,3})(\d+)?$/)
  if (m && m[1]) {
    const c = lettersToCol(m[1].toUpperCase())
    const r = m[2] ? parseInt(m[2], 10) - 1 : null
    return { c, r }
  }
  throw new FError(ERR.NAME)
}

/** 将 ref token 解析为标量值或区域值数组 */
function evalRef(token: string, ctx: FormulaCtx, at: CellCoord): any {
  const clean = token.replace(/\$/g, '')
  if (clean.indexOf(':') >= 0) {
    const [a, b] = clean.split(':')
    const s1 = parseSide(a, ctx)
    const s2 = parseSide(b, ctx)
    let c1 = s1.c
    let c2 = s2.c
    if (c1 > c2) [c1, c2] = [c2, c1]
    let r1 = s1.r ?? s2.r ?? 0
    let r2 = s2.r ?? s1.r ?? 0
    if (s1.r === null && s2.r === null) {
      r1 = 0
      r2 = ctx.rowCount - 1
    } else {
      if (s1.r === null) r1 = s2.r ?? 0
      if (s2.r === null) r2 = s1.r ?? 0
    }
    if (r1 > r2) [r1, r2] = [r2, r1]
    return readRange(ctx, c1, r1, c2, r2)
  }
  // 单元格 / 列（相对当前行）
  const s = parseSide(clean, ctx)
  const row = s.r ?? at.row
  if (s.c < 0 || s.c >= ctx.columns.length) throw new FError(ERR.REF)
  if (row < 0 || row >= ctx.rowCount) throw new FError(ERR.REF)
  return ctx.getValue(s.c, row)
}

function readRange(ctx: FormulaCtx, c1: number, r1: number, c2: number, r2: number): CellValue[] {
  if (c1 < 0 || c2 >= ctx.columns.length || r1 < 0 || r2 >= ctx.rowCount) {
    // 越界裁剪，空则 #REF!
    c1 = Math.max(0, c1)
    c2 = Math.min(ctx.columns.length - 1, c2)
    r1 = Math.max(0, r1)
    r2 = Math.min(ctx.rowCount - 1, r2)
    if (c1 > c2 || r1 > r2) throw new FError(ERR.REF)
  }
  const out: CellValue[] = []
  for (let c = c1; c <= c2; c++) for (let r = r1; r <= r2; r++) out.push(ctx.getValue(c, r))
  return out
}

/** 提取依赖（供依赖图 / 循环检测使用） */
export function collectDeps(ast: AstNode, ctx: FormulaCtx): FormulaDep[] {
  const deps: FormulaDep[] = []
  const push = (token: string) => {
    try {
      const clean = token.replace(/\$/g, '')
      if (clean.indexOf(':') >= 0) {
        const [a, b] = clean.split(':')
        const s1 = parseSide(a, ctx)
        const s2 = parseSide(b, ctx)
        const c1 = Math.min(s1.c, s2.c)
        const c2 = Math.max(s1.c, s2.c)
        const whole = s1.r === null && s2.r === null
        let r1 = whole ? 0 : Math.min(s1.r ?? 0, s2.r ?? 0)
        let r2 = whole ? ctx.rowCount - 1 : Math.max(s1.r ?? 0, s2.r ?? 0)
        if (r1 > r2) [r1, r2] = [r2, r1]
        deps.push({ c1, c2, r1, r2, whole })
      } else {
        const s = parseSide(clean, ctx)
        // 相对（无行号）依赖当前行整列同位置；具体单元格依赖单格
        const row = s.r
        deps.push({ c1: s.c, c2: s.c, r1: row ?? 0, r2: row ?? 0, whole: row === null })
      }
    } catch {
      /* 忽略无法解析的引用 */
    }
  }
  const walk = (n: AstNode) => {
    if (n.t === 'ref') push(n.token)
    else if (n.t === 'func') n.args.forEach(walk)
    else if (n.t === 'bin') {
      walk(n.l)
      walk(n.r)
    } else if (n.t === 'un' || n.t === 'pct') walk(n.e)
  }
  walk(ast)
  return deps
}

// ---------------- 值强制转换 ----------------

function isBlank(v: CellValue): boolean {
  return v === null || v === undefined || v === ''
}

/** 数值单元格（数字或可解析数字串） */
function asNum(v: CellValue): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v === null || v === undefined || v === '') return null
  const s = String(v).trim().replace(/,/g, '')
  if (s === '') return null
  const pct = /%$/.test(s)
  const n = Number(pct ? s.slice(0, -1) : s)
  if (isNaN(n)) return null
  return pct ? n / 100 : n
}

/** 标量强转数值（用于算术）；非数值文本 → #VALUE! */
function toNum(v: any): number {
  if (Array.isArray(v)) throw new FError(ERR.VALUE)
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v === null || v === undefined || v === '') return 0
  const n = asNum(v)
  if (n === null) throw new FError(ERR.VALUE)
  return n
}

/** 区域或标量 → 数值数组（忽略空/文本，用于聚合） */
function collectNumbers(v: any): number[] {
  const out: number[] = []
  const scan = (x: any) => {
    if (Array.isArray(x)) {
      x.forEach(scan)
      return
    }
    const n = asNum(x)
    if (n !== null) out.push(n)
  }
  scan(v)
  return out
}

/** 展平所有参数为原始值列表（区域展开） */
function flatten(args: any[]): CellValue[] {
  const out: CellValue[] = []
  const scan = (x: any) => {
    if (Array.isArray(x)) x.forEach(scan)
    else out.push(x)
  }
  args.forEach(scan)
  return out
}

function toStr(v: any): string {
  if (Array.isArray(v)) throw new FError(ERR.VALUE)
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v)
}

function cmpValues(a: any, b: any, op: string): boolean {
  if (Array.isArray(a) || Array.isArray(b)) throw new FError(ERR.VALUE)
  const na = asNum(a)
  const nb = asNum(b)
  let eq: number
  if (na !== null && nb !== null) eq = na < nb ? -1 : na > nb ? 1 : 0
  else
    eq =
      toStr(a).toLowerCase() < toStr(b).toLowerCase()
        ? -1
        : toStr(a).toLowerCase() > toStr(b).toLowerCase()
          ? 1
          : 0
  switch (op) {
    case '=':
      return eq === 0
    case '<>':
      return eq !== 0
    case '>':
      return eq > 0
    case '<':
      return eq < 0
    case '>=':
      return eq >= 0
    case '<=':
      return eq <= 0
  }
  throw new FError(ERR.VALUE)
}

// ---------------- 条件匹配（COUNTIF / SUMIF） ----------------

function matchCriteria(value: CellValue, criteria: any): boolean {
  if (typeof criteria === 'number') return asNum(value) === criteria
  if (typeof criteria === 'boolean') return asNum(value) === (criteria ? 1 : 0)
  const cs = toStr(criteria)
  const m = cs.match(/^(<=|>=|<>|=|>|<)\s*([\s\S]*)$/)
  const op = m ? m[1] : '='
  const rest = m ? m[2] : cs
  const restNum = rest !== '' && !isNaN(Number(rest)) ? Number(rest) : null
  const num = asNum(value)
  // 数值/关系比较：criteria 为数字或带显式关系符
  const numericCompare = restNum !== null || op === '>' || op === '<' || op === '>=' || op === '<='
  if (numericCompare) {
    const rv = restNum
    if (rv === null || num === null) return op === '<>'
    switch (op) {
      case '>':
        return num > rv
      case '<':
        return num < rv
      case '>=':
        return num >= rv
      case '<=':
        return num <= rv
      case '<>':
        return num !== rv
      default:
        return num === rv
    }
  }
  // 文本（支持通配符 * ?）；大小写不敏感
  const vs = toStr(value).toLowerCase()
  let eq: boolean
  if (/[*?]/.test(rest)) {
    const re = new RegExp(
      '^' +
        rest
          .toLowerCase()
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.') +
        '$'
    )
    eq = re.test(vs)
  } else {
    eq = vs === rest.toLowerCase()
  }
  return op === '<>' ? !eq : eq
}

// ---------------- 函数库 ----------------

function need(args: any[], n: number): void {
  if (args.length < n) throw new FError(ERR.VALUE)
}

const FUNCS: Record<string, (args: any[], ev: (n: AstNode) => any) => any> = {
  // 聚合
  SUM: (a) => collectNumbers(a).reduce((s, x) => s + x, 0),
  PRODUCT: (a) => collectNumbers(a).reduce((s, x) => s * x, 1),
  AVERAGE: (a) => {
    const ns = collectNumbers(a)
    if (!ns.length) throw new FError(ERR.DIV0)
    return ns.reduce((s, x) => s + x, 0) / ns.length
  },
  MIN: (a) => {
    const ns = collectNumbers(a)
    return ns.length ? Math.min(...ns) : 0
  },
  MAX: (a) => {
    const ns = collectNumbers(a)
    return ns.length ? Math.max(...ns) : 0
  },
  COUNT: (a) => collectNumbers(a).length,
  COUNTA: (a) => flatten(a).filter((v) => !isBlank(v)).length,
  MEDIAN: (a) => {
    const ns = collectNumbers(a)
      .slice()
      .sort((x, y) => x - y)
    if (!ns.length) throw new FError(ERR.NUM)
    const mid = Math.floor(ns.length / 2)
    return ns.length % 2 ? ns[mid] : (ns[mid - 1] + ns[mid]) / 2
  },
  // 数学
  ABS: (a) => Math.abs(toNum(a[0])),
  ROUND: (a) => {
    need(a, 1)
    const d = a[1] === undefined ? 0 : toNum(a[1])
    const f = Math.pow(10, d)
    return Math.round(toNum(a[0]) * f) / f
  },
  ROUNDUP: (a) => {
    need(a, 1)
    const d = a[1] === undefined ? 0 : toNum(a[1])
    const f = Math.pow(10, d)
    const x = toNum(a[0]) * f
    return (x < 0 ? -Math.ceil(-x) : Math.ceil(x)) / f
  },
  ROUNDDOWN: (a) => {
    need(a, 1)
    const d = a[1] === undefined ? 0 : toNum(a[1])
    const f = Math.pow(10, d)
    const x = toNum(a[0]) * f
    return (x < 0 ? -Math.floor(-x) : Math.floor(x)) / f
  },
  INT: (a) => Math.floor(toNum(a[0])),
  TRUNC: (a) => Math.trunc(toNum(a[0])),
  MOD: (a) => {
    need(a, 2)
    const d = toNum(a[1])
    if (d === 0) throw new FError(ERR.DIV0)
    const n = toNum(a[0])
    return n - Math.floor(n / d) * d
  },
  POWER: (a) => Math.pow(toNum(a[0]), toNum(a[1])),
  SQRT: (a) => {
    const n = toNum(a[0])
    if (n < 0) throw new FError(ERR.NUM)
    return Math.sqrt(n)
  },
  CEILING: (a) => {
    need(a, 1)
    const s = a[1] === undefined ? 1 : toNum(a[1])
    if (s === 0) return 0
    return Math.ceil(toNum(a[0]) / s) * s
  },
  FLOOR: (a) => {
    need(a, 1)
    const s = a[1] === undefined ? 1 : toNum(a[1])
    if (s === 0) throw new FError(ERR.DIV0)
    return Math.floor(toNum(a[0]) / s) * s
  },
  SIGN: (a) => Math.sign(toNum(a[0])),
  // 逻辑
  AND: (a) => flatten(a).every((v) => truthy(v)),
  OR: (a) => flatten(a).some((v) => truthy(v)),
  NOT: (a) => !truthy(a[0]),
  TRUE: () => true,
  FALSE: () => false,
  ISNUMBER: (a) => typeof a[0] === 'number' || (typeof a[0] === 'string' && asNum(a[0]) !== null),
  ISBLANK: (a) => isBlank(a[0]),
  ISTEXT: (a) => typeof a[0] === 'string' && a[0] !== '',
  ISERROR: (a) => typeof a[0] === 'string' && (a[0] as string).startsWith('#'),
  // 文本
  CONCAT: (a) => flatten(a).map(toStr).join(''),
  CONCATENATE: (a) => flatten(a).map(toStr).join(''),
  LEN: (a) => toStr(a[0]).length,
  UPPER: (a) => toStr(a[0]).toUpperCase(),
  LOWER: (a) => toStr(a[0]).toLowerCase(),
  TRIM: (a) => toStr(a[0]).trim().replace(/\s+/g, ' '),
  LEFT: (a) => toStr(a[0]).slice(0, a[1] === undefined ? 1 : toNum(a[1])),
  RIGHT: (a) => {
    const s = toStr(a[0])
    const n = a[1] === undefined ? 1 : toNum(a[1])
    return n <= 0 ? '' : s.slice(-n)
  },
  MID: (a) => toStr(a[0]).substr(toNum(a[1]) - 1, toNum(a[2])),
  VALUE: (a) => {
    const n = asNum(a[0])
    if (n === null) throw new FError(ERR.VALUE)
    return n
  },
  REPT: (a) => toStr(a[0]).repeat(Math.max(0, toNum(a[1]))),
  // 条件聚合
  COUNTIF: (a) => flatten([a[0]]).filter((v) => matchCriteria(v, a[1])).length,
  SUMIF: (a) => {
    const range = flatten([a[0]])
    const sumRange = a[2] !== undefined ? flatten([a[2]]) : range
    let s = 0
    range.forEach((v, i) => {
      if (matchCriteria(v, a[1])) {
        const n = asNum(sumRange[i])
        if (n !== null) s += n
      }
    })
    return s
  }
}

function truthy(v: any): boolean {
  if (Array.isArray(v)) throw new FError(ERR.VALUE)
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (v === null || v === undefined || v === '') return false
  const n = asNum(v)
  if (n !== null) return n !== 0
  return String(v).toUpperCase() === 'TRUE'
}

// ---------------- 求值 ----------------

function evaluateNode(node: AstNode, ctx: FormulaCtx, at: CellCoord): any {
  switch (node.t) {
    case 'num':
      return node.v
    case 'str':
      return node.v
    case 'bool':
      return node.v
    case 'ref':
      return evalRef(node.token, ctx, at)
    case 'pct':
      return toNum(evaluateNode(node.e, ctx, at)) / 100
    case 'un': {
      const v = evaluateNode(node.e, ctx, at)
      if (node.op === '-') return -toNum(v)
      return toNum(v)
    }
    case 'bin': {
      const op = node.op
      if (op === '&')
        return toStr(evaluateNode(node.l, ctx, at)) + toStr(evaluateNode(node.r, ctx, at))
      if (op === '=' || op === '<>' || op === '>' || op === '<' || op === '>=' || op === '<=') {
        return cmpValues(evaluateNode(node.l, ctx, at), evaluateNode(node.r, ctx, at), op)
      }
      const l = toNum(evaluateNode(node.l, ctx, at))
      const r = toNum(evaluateNode(node.r, ctx, at))
      switch (op) {
        case '+':
          return l + r
        case '-':
          return l - r
        case '*':
          return l * r
        case '/':
          if (r === 0) throw new FError(ERR.DIV0)
          return l / r
        case '^':
          return Math.pow(l, r)
      }
      throw new FError(ERR.VALUE)
    }
    case 'func': {
      // 惰性函数：IF / IFERROR 仅求值被选中的分支（否则未分支侧错误会污染结果）
      if (node.name === 'IF') {
        need(node.args, 2)
        const cond = truthy(evaluateNode(node.args[0], ctx, at))
        return cond
          ? evaluateNode(node.args[1], ctx, at)
          : node.args.length >= 3
            ? evaluateNode(node.args[2], ctx, at)
            : false
      }
      if (node.name === 'IFERROR') {
        need(node.args, 2)
        try {
          const v = evaluateNode(node.args[0], ctx, at)
          if (isBlank(v) && v !== 0) return evaluateNode(node.args[1], ctx, at)
          return v
        } catch (e) {
          if (e instanceof FError) return evaluateNode(node.args[1], ctx, at)
          throw e
        }
      }
      const fn = FUNCS[node.name]
      if (!fn) throw new FError(ERR.NAME)
      const args = node.args.map((a) => evaluateNode(a, ctx, at))
      return fn(args, (n) => evaluateNode(n, ctx, at))
    }
  }
}

/**
 * 求值公式，返回结果值；错误以哨兵字符串返回（不抛出）。
 * @param input 公式文本（可含前导 =）
 * @param ctx   求值上下文
 * @param at    当前单元格坐标（相对/整列引用解析用）
 */
export function evaluate(input: string, ctx: FormulaCtx, at: CellCoord): FormulaValue {
  try {
    const ast = parseNode(input)
    const v = evaluateNode(ast, ctx, at)
    return normalizeResult(v)
  } catch (e) {
    if (e instanceof FError) return e.code
    return ERR.VALUE
  }
}

/** 解析并求值（已编译 AST 复用场景） */
export function evaluateAst(ast: AstNode, ctx: FormulaCtx, at: CellCoord): FormulaValue {
  try {
    return normalizeResult(evaluateNode(ast, ctx, at))
  } catch (e) {
    if (e instanceof FError) return e.code
    return ERR.VALUE
  }
}

function normalizeResult(v: any): FormulaValue {
  if (typeof v === 'number') {
    if (!isFinite(v)) throw new FError(ERR.NUM)
    return v
  }
  if (typeof v === 'boolean') return v
  if (v === null || v === undefined) return ''
  if (Array.isArray(v)) throw new FError(ERR.VALUE) // 区域出现在标量位置
  return v
}
