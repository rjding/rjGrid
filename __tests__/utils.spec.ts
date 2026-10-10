// utils.ts 纯函数单元测试
import { describe, it, expect } from './harness'
import {
  getValueByPath,
  setValueByPath,
  cloneValue,
  colIdOf,
  collectLeaves,
  clampWidth,
  formatByType,
  imageText,
  defaultComparator,
  runAgg,
  AGG_FUNCS,
  AGG_LABELS,
  lowerBound,
  rowMoveInsertIndex,
  ghostCellCount,
  applyRowLimit,
  parseNumericInput,
  rankOptions,
  pickExportRows,
  resolveExportScope,
  type RjExportRowSource,
  measureColWidth,
  textWidthUnits
} from '../src/utils'
import type { RjColumn } from '../src/types'

describe('utils.getValueByPath / setValueByPath', () => {
  it('读取 a.b.c 路径', () => {
    expect(getValueByPath({ a: { b: { c: 7 } } }, 'a.b.c')).toBe(7)
  })
  it('中途缺失返回 undefined 不抛', () => {
    expect(getValueByPath({ a: null }, 'a.b.c')).toBe(undefined)
  })
  it('写值到已存在路径', () => {
    const o: any = { a: { b: 1 } }
    expect(setValueByPath(o, 'a.b', 9)).toBe(true)
    expect(o.a.b).toBe(9)
  })
})

describe('utils.cloneValue', () => {
  it('深拷贝数组与对象，Date 独立', () => {
    const src = { list: [1, 2, { x: 3 }], d: new Date(1000) }
    const cp: any = cloneValue(src)
    expect(cp).toEqual(src)
    cp.list[2].x = 99
    expect((src.list[2] as any).x).toBe(3)
  })
})

describe('utils.colIdOf / collectLeaves / clampWidth', () => {
  it('colId 优先于 field', () => {
    expect(colIdOf({ colId: 'c1', field: 'f1' } as RjColumn)).toBe('c1')
    expect(colIdOf({ field: 'f1' } as RjColumn)).toBe('f1')
    expect(colIdOf(null)).toBe('')
  })
  it('展开多级表头取叶子', () => {
    const cols: RjColumn[] = [
      { title: 'g', children: [{ field: 'a' }, { field: 'b' }] },
      { field: 'c' }
    ]
    expect(collectLeaves(cols).map((c) => c.field)).toEqual(['a', 'b', 'c'])
  })
  it('宽度限幅到 min/max', () => {
    expect(clampWidth(5, { minWidth: 40, maxWidth: 200 } as RjColumn)).toBe(40)
    expect(clampWidth(9999, { minWidth: 40, maxWidth: 200 } as RjColumn)).toBe(200)
  })
})

describe('utils.formatByType', () => {
  it('money 千分位带 ¥ 两位小数', () => {
    expect(formatByType({ type: 'money' } as RjColumn, 1234.5)).toBe('¥1,234.50')
  })
  it('percent 乘 100 加百分号', () => {
    expect(formatByType({ type: 'percent' } as RjColumn, 0.1256)).toBe('12.56%')
  })
  it('null 显示空串', () => {
    expect(formatByType({ type: 'num' } as RjColumn, null)).toBe('')
  })
  it('boolean 默认中文，可按语言传入文案', () => {
    expect(formatByType({ type: 'boolean' } as RjColumn, true)).toBe('是')
    expect(formatByType({ type: 'boolean' } as RjColumn, false)).toBe('否')
    expect(formatByType({ type: 'boolean' } as RjColumn, true, ['Yes', 'No'])).toBe('Yes')
    expect(formatByType({ type: 'boolean' } as RjColumn, false, ['Yes', 'No'])).toBe('No')
  })
  it('AGG_LABELS 存的是文案 key而非中文硬编码', () => {
    expect(AGG_LABELS.sum).toBe('aggSum')
    expect(/[\u4e00-\u9fa5]/.test(Object.values(AGG_LABELS).join(''))).toBe(false)
  })
  it('image 只输出文件名，不把 data URI 写进文本', () => {
    expect(formatByType({ type: 'image' } as RjColumn, 'https://x/a/b.png?v=2')).toBe('b.png')
    expect(formatByType({ type: 'image' } as RjColumn, 'data:image/svg+xml,%3Csvg%3E')).toBe('')
    expect(
      formatByType({ type: 'image' } as RjColumn, ['/img/one.jpg', 'data:image/png;base64,zz'])
    ).toBe('one.jpg')
    expect(imageText({ src: '/img/x.png' })).toBe('x.png')
    expect(imageText(null)).toBe('')
  })
})

describe('utils.defaultComparator', () => {
  it('数字数值序非字典序', () => {
    expect(defaultComparator(2, 10) < 0).toBe(true)
    expect(defaultComparator('2', '10') < 0).toBe(true)
  })
  it('null 最小', () => {
    expect(defaultComparator(null, 1) < 0).toBe(true)
    expect(defaultComparator(null, null)).toBe(0)
  })
})

describe('utils.runAgg / AGG_FUNCS', () => {
  const rows = [{ v: 1 }, { v: 2 }, { v: 3 }]
  const vals = [1, 2, 3]
  it('sum/avg/min/max/count', () => {
    expect(runAgg('sum', rows, vals)).toBe(6)
    expect(runAgg('avg', rows, vals)).toBe(2)
    expect(runAgg('min', rows, vals)).toBe(1)
    expect(runAgg('max', rows, vals)).toBe(3)
    expect(runAgg('count', rows, vals)).toBe(3)
  })
  it('自定义聚合函数', () => {
    expect(runAgg((r) => r.length * 10, rows, vals)).toBe(30)
  })
  it('avg 忽略非数值', () => {
    expect(AGG_FUNCS.avg([], [1, NaN, 3])).toBe(2)
  })
})

describe('utils.lowerBound', () => {
  it('有序数组找首个 >= target 下标', () => {
    const arr = [1, 3, 5, 7, 9]
    expect(lowerBound(arr, 5)).toBe(2)
    expect(lowerBound(arr, 6)).toBe(3)
    expect(lowerBound(arr, 0)).toBe(0)
    expect(lowerBound(arr, 100)).toBe(5)
  })
})

describe('utils.parseNumericInput（会计/货币输入解析）', () => {
  it('普通整数/小数', () => {
    expect(parseNumericInput('123')).toBe(123)
    expect(parseNumericInput('-4.5')).toBe(-4.5)
  })
  it('千分位与空格/下划线', () => {
    expect(parseNumericInput('1,234,567')).toBe(1234567)
    expect(parseNumericInput('1 234_5')).toBe(12345)
  })
  it('货币符号', () => {
    expect(parseNumericInput('¥1,200.50')).toBe(1200.5)
    expect(parseNumericInput('$99')).toBe(99)
  })
  it('会计括号负数', () => {
    expect(parseNumericInput('(1,234.50)')).toBe(-1234.5)
    expect(parseNumericInput('¥(50)')).toBe(-50)
  })
  it('符号与括号叠加', () => {
    expect(parseNumericInput('-(200)')).toBe(200)
    expect(parseNumericInput('+300')).toBe(300)
  })
  it('空/无效返回 null', () => {
    expect(parseNumericInput('')).toBe(null)
    expect(parseNumericInput('   ')).toBe(null)
    expect(parseNumericInput('abc')).toBe(null)
    expect(parseNumericInput('¥')).toBe(null)
    expect(parseNumericInput(null)).toBe(null)
  })
  it('number 直传', () => {
    expect(parseNumericInput(42)).toBe(42)
    expect(parseNumericInput(NaN)).toBe(null)
  })
})

describe('utils.rankOptions（RichSelect 打字匹配排序）', () => {
  const opts = [
    { label: 'Apple', value: 1 },
    { label: 'Pineapple', value: 2 },
    { label: 'Apricot', value: 3 },
    { label: 'Banana', value: 4 }
  ]
  it('空查询原样返回', () => {
    expect(rankOptions(opts, '').length).toBe(4)
    expect(rankOptions(opts, '   ')).toEqual(opts)
  })
  it('前缀优先于包含', () => {
    const r = rankOptions(opts, 'ap')
    expect(r.map((x) => x.value)).toEqual([1, 3, 2])
  })
  it('大小写不敏感', () => {
    expect(rankOptions(opts, 'BANANA').map((x) => x.value)).toEqual([4])
  })
  it('无命中返回空', () => {
    expect(rankOptions(opts, 'zzz').length).toBe(0)
  })
})

describe('utils.rowMoveInsertIndex（行拖拽落位）', () => {
  // 模拟 applyRowMove：扁平数组（显示序==数据序），把 from 移到 to，返回重排后数组
  const move = (arr: number[], from: number, to: number): number[] => {
    const out = arr.slice()
    const moved = out[from]
    const insertAt = rowMoveInsertIndex(
      out.length,
      () => true,
      (i) => i === from,
      from,
      to
    )
    out.splice(from, 1)
    out.splice(insertAt, 0, moved)
    return out
  }
  const base = [0, 1, 2, 3, 4]
  it('下移到中部：被拖行落在目标槽（修复前会少 2 位）', () => {
    expect(move(base, 0, 3)).toEqual([1, 2, 3, 0, 4])
  })
  it('下移一格：不会反向跑到上一行', () => {
    expect(move(base, 1, 2)).toEqual([0, 2, 1, 3, 4])
  })
  it('下移到末尾', () => {
    expect(move(base, 0, 4)).toEqual([1, 2, 3, 4, 0])
  })
  it('上移到首部：与下移对称且正确', () => {
    expect(move(base, 3, 0)).toEqual([3, 0, 1, 2, 4])
  })
  it('上移到中部', () => {
    expect(move(base, 4, 1)).toEqual([0, 4, 1, 2, 3])
  })
  it('原地不动（from===to）保持原序', () => {
    expect(move(base, 2, 2)).toEqual([0, 1, 2, 3, 4])
  })
  it('插入下标不为负', () => {
    expect(
      rowMoveInsertIndex(
        3,
        () => true,
        (i) => i === 0,
        0,
        0
      )
    ).toBe(0)
  })
  it('含非数据行（组行/页脚）时只按数据行计数', () => {
    // 显示序列：[G, 0, 1, 2, F]，G/F 为非数据行；把数据行 0（显示下标 1）拖到显示下标 3
    // 期望落在数据槽：前面应有 1、2 两个数据行 → 插入下标 = 2
    const insertAt = rowMoveInsertIndex(
      5,
      (i) => i >= 1 && i <= 3,
      (i) => i === 1,
      1,
      3
    )
    expect(insertAt).toBe(2)
  })
})

describe('utils.ghostCellCount（拖拽整行快照宽度预算）', () => {
  const cells = (ws: number[]) => ws.map((w) => ({ w }))
  it('空数组返回 0', () => {
    expect(ghostCellCount([], 500)).toBe(0)
  })
  it('总宽未超预算：全部渲染', () => {
    expect(ghostCellCount(cells([100, 100, 100]), 500)).toBe(3)
  })
  it('累计恰好等于预算：在该格处截断', () => {
    expect(ghostCellCount(cells([200, 200, 200]), 400)).toBe(2)
  })
  it('超预算：包含跨过边界的那一格后停止', () => {
    // 150+150+150=450 >=400 → 保留 3 格
    expect(ghostCellCount(cells([150, 150, 150, 150]), 400)).toBe(3)
  })
  it('首格即超预算：至少保留 1 格', () => {
    expect(ghostCellCount(cells([600, 100]), 400)).toBe(1)
  })
})

describe('utils.applyRowLimit（NLQ 取前 N 行 TopN 截断）', () => {
  const rows = [1, 2, 3, 4, 5]
  it('limit<=0：不限量，原样返回（同一引用）', () => {
    expect(applyRowLimit(rows, 0)).toBe(rows)
    expect(applyRowLimit(rows, -3)).toBe(rows)
  })
  it('limit 非有限数（NaN/Infinity）：视为不限量', () => {
    expect(applyRowLimit(rows, NaN)).toBe(rows)
    expect(applyRowLimit(rows, Infinity)).toBe(rows)
  })
  it('limit 在 (0,len) 之间：截取前 N 行', () => {
    expect(applyRowLimit(rows, 3)).toEqual([1, 2, 3])
    expect(applyRowLimit(rows, 1)).toEqual([1])
  })
  it('limit 等于行数：全保留', () => {
    expect(applyRowLimit(rows, 5)).toEqual(rows)
  })
  it('limit 大于行数：不越界，原样返回', () => {
    expect(applyRowLimit(rows, 99)).toEqual(rows)
  })
  it('空数组：返回空', () => {
    expect(applyRowLimit([] as number[], 5)).toEqual([])
  })
})

describe('utils.resolveExportScope（auto 落地）', () => {
  it('auto/undefined：有选中导选中', () => {
    expect(resolveExportScope('auto', 3)).toBe('selected')
    expect(resolveExportScope(undefined, 3)).toBe('selected')
  })
  it('auto/undefined：无选中导当前视图（不得落成 selected 得到空文件）', () => {
    expect(resolveExportScope('auto', 0)).toBe('view')
    expect(resolveExportScope(undefined, 0)).toBe('view')
  })
  it('显式具体档原样返回，不受选中数影响', () => {
    expect(resolveExportScope('selected', 0)).toBe('selected')
    expect(resolveExportScope('view', 5)).toBe('view')
    expect(resolveExportScope('all', 0)).toBe('all')
  })
})

describe('utils.pickExportRows（范围 → 行集合）', () => {
  const a = { id: 'a' }
  const b = { id: 'b' }
  const c = { id: 'c' }
  const g = { id: 'g' }
  const gf = { id: 'gf' }
  const src: RjExportRowSource = {
    selected: [b],
    display: [
      { type: 'group', data: g },
      { type: 'row', data: a },
      { type: 'row', data: b },
      { type: 'group', data: gf, isFooter: true }
    ],
    source: [a, b, c]
  }
  it('selected 只取选中行（返回副本而非同一引用）', () => {
    const out = pickExportRows('selected', src, true)
    expect(out).toEqual([b])
    expect(out === src.selected).toBe(false)
  })
  it('all 取源数据全集（未过滤/排序）', () => {
    expect(pickExportRows('all', src, true)).toEqual([a, b, c])
  })
  it('view：withGroups=true 纳入非页脚分组行', () => {
    expect(pickExportRows('view', src, true)).toEqual([g, a, b])
  })
  it('view：withGroups=false 只要干细行（排除分组与页脚）', () => {
    expect(pickExportRows('view', src, false)).toEqual([a, b])
  })
})

describe('utils.textWidthUnits / measureColWidth（列宽字符估算）', () => {
  it('全角计 2、半角计 1', () => {
    expect(textWidthUnits('ID')).toBe(2)
    expect(textWidthUnits('中文')).toBe(4)
    expect(textWidthUnits('混合ab')).toBe(6)
    expect(textWidthUnits('')).toBe(0)
  })
  it('无样本：按标题宽度，不低于下限 min', () => {
    // 标题 1 个 ASCII → 1×8+34=42 < min(60) → 60
    expect(measureColWidth('A', [])).toBe(60)
  })
  it('取最长样本文本（中文按宽单位）', () => {
    // 最长样本 8 个全角 = 16 单位 → 16×8+34=162
    expect(measureColWidth('标题', ['一二三四五六七八', 'ab'])).toBe(162)
  })
  it('超长样本封顶 max', () => {
    const long = '长'.repeat(44) // 88 单位 → 88×8+34=738 > 640
    expect(measureColWidth('X', [long])).toBe(640)
  })
  it('可自定义参数', () => {
    expect(measureColWidth('a', ['abcd'], { unitW: 10, padPx: 0, min: 0, max: 999 })).toBe(40)
  })
})
