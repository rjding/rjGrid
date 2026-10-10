// formula.ts 纯引擎单元测试（无 DOM、无随机、确定性求值）
import { describe, it, expect } from './harness'
import {
  evaluate,
  isFormula,
  collectDeps,
  parse,
  lettersToCol,
  colToLetters,
  type FormulaCtx
} from '../src/formula'
import { formulaColumnContext } from '../src/utils'
import type { RjColumn } from '../src/types'

// 列：A=name, B=qty, C=price, D=total, E=cat
const COLS = ['name', 'qty', 'price', 'total', 'cat']
// 行数据（与列顺序对齐）
const DATA: any[][] = [
  ['a', 2, 10, 20, 'x'],
  ['b', 3, 5, 15, 'y'],
  ['c', 4, 7, 28, 'x']
]
const ctx: FormulaCtx = {
  columns: COLS,
  rowCount: DATA.length,
  getValue: (c, r) => (DATA[r] ? DATA[r][c] : undefined)
}

const E = (f: string, at = { col: 0, row: 0 }) => evaluate(f, ctx, at)

describe('formula.isFormula', () => {
  it('识别以 = 开头的公式', () => {
    expect(isFormula('=A1')).toBe(true)
    expect(isFormula('=1+1')).toBe(true)
  })
  it('非公式返回 false', () => {
    expect(isFormula('A1')).toBe(false)
    expect(isFormula('=')).toBe(false)
    expect(isFormula(123 as any)).toBe(false)
    expect(isFormula(null as any)).toBe(false)
  })
})

describe('formula.列字母互转', () => {
  it('lettersToCol', () => {
    expect(lettersToCol('A')).toBe(0)
    expect(lettersToCol('Z')).toBe(25)
    expect(lettersToCol('AA')).toBe(26)
    expect(lettersToCol('AB')).toBe(27)
  })
  it('colToLetters 往返一致', () => {
    expect(colToLetters(0)).toBe('A')
    expect(colToLetters(26)).toBe('AA')
    expect(colToLetters(27)).toBe('AB')
    expect(lettersToCol(colToLetters(52))).toBe(52)
  })
})

describe('formula.算术与优先级', () => {
  it('四则与括号', () => {
    expect(E('2+3*4')).toBe(14)
    expect(E('(2+3)*4')).toBe(20)
    expect(E('10-2-3')).toBe(5)
    expect(E('100/5/2')).toBe(10)
  })
  it('幂右结合', () => {
    expect(E('2^3^2')).toBe(512)
  })
  it('一元负号比幂更紧（-2^2=4，Excel 语义）', () => {
    expect(E('-2^2')).toBe(4)
    expect(E('-(2^2)')).toBe(-4)
  })
  it('后缀百分号', () => {
    expect(E('50%')).toBeCloseTo(0.5, 10)
    expect(E('200*10%')).toBeCloseTo(20, 10)
  })
  it('文本连接', () => {
    expect(E('"a"&"b"')).toBe('ab')
    expect(E('"x"&1')).toBe('x1')
  })
  it('容忍前导空格', () => {
    expect(E('  2 + 3 ')).toBe(5)
  })
})

describe('formula.比较与逻辑', () => {
  it('数值/文本比较（文本大小写不敏感）', () => {
    expect(E('1<2')).toBe(true)
    expect(E('2>3')).toBe(false)
    expect(E('2<=2')).toBe(true)
    expect(E('3<>3')).toBe(false)
    expect(E('"abc"="ABC"')).toBe(true)
  })
  it('AND/OR/NOT', () => {
    expect(E('AND(TRUE(),1<2)')).toBe(true)
    expect(E('OR(FALSE(),FALSE())')).toBe(false)
    expect(E('NOT(TRUE())')).toBe(false)
  })
})

describe('formula.IF/IFERROR 惰性求值', () => {
  it('IF 仅求选中分支', () => {
    expect(E('IF(1>2,10,20)')).toBe(20)
    expect(E('IF(1<2,"yes")')).toBe('yes')
    // 条件为真才走 1/0，触发错误
    expect(E('IF(TRUE(),1/0)')).toBe('#DIV/0!')
    // 条件为假时不应对 1/0 求值
    expect(E('IF(FALSE(),1/0,99)')).toBe(99)
  })
  it('IFERROR 捕获错误', () => {
    expect(E('IFERROR(1/0,"err")')).toBe('err')
    expect(E('IFERROR(10,"err")')).toBe(10)
  })
})

describe('formula.单元格/区域/字段引用', () => {
  it('A1 单元格引用（1 基行）', () => {
    expect(E('B1')).toBe(2) // qty 行0
    expect(E('B3')).toBe(4) // qty 行2
    expect(E('C1')).toBe(10) // price 行0
    expect(E('B1*B2*B3')).toBe(24)
    expect(E('D1+C1')).toBe(30)
  })
  it('绝对引用 $B$2 与位置无关', () => {
    expect(E('$B$2', { col: 4, row: 2 })).toBe(3)
  })
  it('区域求和 B:B / qty:qty（整列）', () => {
    expect(E('SUM(B:B)')).toBe(9)
    expect(E('SUM(qty:qty)')).toBe(9)
    expect(E('SUM(B1:B2)')).toBe(5)
  })
  it('字段名 = 当前行标量（相对）', () => {
    expect(E('qty*price', { col: 3, row: 1 })).toBe(15) // 3*5
    expect(E('qty+price', { col: 3, row: 0 })).toBe(12) // 2+10
  })
  it('字段名含数字不被误判为单元格', () => {
    const c2: FormulaCtx = {
      columns: ['price2', 'x'],
      rowCount: 1,
      getValue: (i) => (i === 0 ? 7 : 3)
    }
    expect(evaluate('price2+x', c2, { col: 1, row: 0 })).toBe(10)
  })
})

describe('formula.数学与统计函数', () => {
  it('基础数学', () => {
    expect(E('ABS(-5)')).toBe(5)
    expect(E('ROUND(2.567,2)')).toBeCloseTo(2.57, 10)
    expect(E('ROUND(2.5)')).toBe(3)
    expect(E('ROUNDUP(2.1)')).toBe(3)
    expect(E('ROUNDDOWN(2.9)')).toBe(2)
    expect(E('INT(-2.3)')).toBe(-3)
    expect(E('MOD(7,3)')).toBe(1)
    expect(E('SQRT(16)')).toBe(4)
    expect(E('POWER(2,10)')).toBe(1024)
    expect(E('CEILING(2.1,1)')).toBe(3)
    expect(E('FLOOR(2.9,1)')).toBe(2)
    expect(E('SIGN(-8)')).toBe(-1)
  })
  it('聚合', () => {
    expect(E('MIN(B:B)')).toBe(2)
    expect(E('MAX(B:B)')).toBe(4)
    expect(E('COUNT(B:B)')).toBe(3)
    expect(E('COUNTA(A:E)')).toBe(15)
    expect(E('MEDIAN(B:B)')).toBe(3)
    expect(E('PRODUCT(B:B)')).toBe(24)
    expect(E('AVERAGE(C:C)')).toBeCloseTo((10 + 5 + 7) / 3, 10)
  })
})

describe('formula.文本函数', () => {
  it('字符串操作', () => {
    expect(E('UPPER(A1)')).toBe('A')
    expect(E('LOWER("HeLLo")')).toBe('hello')
    expect(E('LEN("hello")')).toBe(5)
    expect(E('LEFT("hello",2)')).toBe('he')
    expect(E('RIGHT("hello",2)')).toBe('lo')
    expect(E('MID("hello",2,2)')).toBe('el')
    expect(E('TRIM("  a   b  ")')).toBe('a b')
    expect(E('CONCAT(A1,A2)')).toBe('ab')
    expect(E('VALUE("42")')).toBe(42)
    expect(E('REPT("ab",3)')).toBe('ababab')
  })
})

describe('formula.条件聚合', () => {
  it('COUNTIF/SUMIF', () => {
    expect(E('COUNTIF(B:B,">2")')).toBe(2)
    expect(E('COUNTIF(E:E,"x")')).toBe(2)
    expect(E('SUMIF(E:E,"x",B:B)')).toBe(6) // 行0(2)+行2(4)
  })
})

describe('formula.错误处理', () => {
  it('除零', () => {
    expect(E('10/0')).toBe('#DIV/0!')
  })
  it('未知函数/名称', () => {
    expect(E('FOO(1)')).toBe('#NAME?')
    expect(E('notacolumn')).toBe('#NAME?')
  })
  it('越界引用', () => {
    expect(E('B99')).toBe('#REF!')
  })
  it('区域用于标量上下文', () => {
    expect(E('B1:B3+1')).toBe('#VALUE!')
  })
})

describe('formula.collectDeps 依赖提取', () => {
  it('整列依赖 whole=true', () => {
    const ast = parse('=SUM(B:B)')!
    const deps = collectDeps(ast, ctx)
    expect(deps.length).toBe(1)
    expect(deps[0].whole).toBe(true)
    expect(deps[0].c1).toBe(1)
  })
  it('字段整列 qty:qty', () => {
    const deps = collectDeps(parse('=SUM(qty:qty)')!, ctx)
    expect(deps.length).toBe(1)
    expect(deps[0].whole).toBe(true)
    expect(deps[0].c1).toBe(1)
  })
  it('多个单格依赖', () => {
    const deps = collectDeps(parse('=B2+C3')!, ctx)
    expect(deps.length).toBe(2)
    expect(deps.some((d) => d.c1 === 1 && d.r1 === 1)).toBe(true)
    expect(deps.some((d) => d.c1 === 2 && d.r1 === 2)).toBe(true)
  })
  it('相对字段依赖当前列', () => {
    const deps = collectDeps(parse('=qty*price')!, ctx)
    expect(deps.length).toBe(2)
    expect(deps[0].whole).toBe(true) // 相对（无行号）视为整列
  })
})

describe('formula 求值上下文列组装（formulaColumnContext）', () => {
  const hideById = (ids: string[]) => (id: string) => ids.includes(id)

  it('隐藏的声明列追加在尾部，可见列下标不偏移', () => {
    const shown: RjColumn[] = [{ field: 'code' }, { field: 'name' }, { field: 'fillRate' }]
    const declared: RjColumn[] = [
      ...shown,
      { field: 'capacityVolume', hidden: true },
      { field: 'usedVolume', hidden: true }
    ]
    const out = formulaColumnContext(shown, declared, hideById(['capacityVolume', 'usedVolume']))
    expect(out.map((c) => c.field)).toEqual([
      'code',
      'name',
      'fillRate',
      'capacityVolume',
      'usedVolume'
    ])
    // 字母映射：可见列仍从 A 起，补充列接在后面
    expect(colToLetters(0)).toBe('A')
    expect(colToLetters(out.length - 1)).toBe('E')
  })

  it('未隐藏的声明列不会被重复并入', () => {
    const shown: RjColumn[] = [{ field: 'x' }, { field: 'y' }]
    const declared: RjColumn[] = [...shown, { field: 'z' }]
    expect(formulaColumnContext(shown, declared, () => false).map((c) => c.field)).toEqual([
      'x',
      'y'
    ])
  })

  it('控制列（checkbox / rowDrag）即使处于隐藏也不进上下文', () => {
    const shown: RjColumn[] = [{ field: 'name' }]
    const declared: RjColumn[] = [
      { checkbox: true },
      { rowDrag: true },
      { field: 'h', hidden: true }
    ]
    const out = formulaColumnContext(shown, declared, () => true)
    expect(out.map((c) => c.field)).toEqual(['name', 'h'])
  })

  it('透视态原样返回生成列，不掺声明列（既有守卫）', () => {
    const shown: RjColumn[] = [{ colId: '__pvrow0:qty' }, { colId: '__pvcol0' }]
    const out = formulaColumnContext(shown, [{ field: 'qty', hidden: true }], () => true, true)
    expect(out === shown).toBe(true)
  })

  it('无隐藏补充项时返回同一数组引用（不制造新对象）', () => {
    const shown: RjColumn[] = [{ field: 'a' }]
    expect(formulaColumnContext(shown, [{ field: 'a' }, { field: 'b' }], () => false) === shown).toBe(
      true
    )
  })

  it('引擎侧：上下文含依赖列即可出值，缺失才降级 #NAME?', () => {
    const row: Record<string, any> = { code: 'WH01', capacityVolume: 200, usedVolume: 60 }
    const mkCtx = (list: RjColumn[]): FormulaCtx => ({
      columns: list.map((c) => c.field as string),
      rowCount: 1,
      getValue: (ci) => (ci >= 0 && ci < list.length ? row[list[ci].field as string] : undefined)
    })
    const shown: RjColumn[] = [
      { field: 'code' },
      { field: 'fillRate', formula: '=usedVolume / capacityVolume' }
    ]
    const declared: RjColumn[] = [
      ...shown,
      { field: 'capacityVolume', hidden: true },
      { field: 'usedVolume', hidden: true }
    ]
    const at = { col: 1, row: 0 }
    const f = '=usedVolume / capacityVolume'
    // 旧行为：只喂可见列 → 标识符解析不到
    expect(evaluate(f, mkCtx(formulaColumnContext(shown, declared, () => false)), at)).toBe('#NAME?')
    // 新行为：隐藏依赖列补进上下文尾部
    expect(
      evaluate(
        f,
        mkCtx(formulaColumnContext(shown, declared, hideById(['capacityVolume', 'usedVolume']))),
        at
      )
    ).toBe(0.3)
  })
})
