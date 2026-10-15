// 查询条件栏内核单测（纯函数）：字段派生 / 运算符集合 / 值匹配
import { describe, it, expect } from './harness'
import {
  activeQueryConditions,
  defaultQueryOperator,
  deriveQueryFields,
  kindOfColumn,
  matchQueryValue,
  queryHasValue,
  queryOpsOfKind,
  rowPassesQuery
} from '../src/query'
import type { RjColumn, RjQueryCondition } from '../src/types'

const col = (over: Partial<RjColumn>): RjColumn => over as RjColumn

describe('query.kindOfColumn', () => {
  it('按列类型/筛选/编辑器推导类别', () => {
    expect(kindOfColumn(col({ field: 'a', type: 'num' }))).toBe('number')
    expect(kindOfColumn(col({ field: 'b', type: 'money' }))).toBe('number')
    expect(kindOfColumn(col({ field: 'c', type: 'datetime' }))).toBe('date')
    expect(kindOfColumn(col({ field: 'd', type: 'date' }))).toBe('date')
    expect(kindOfColumn(col({ field: 'e', filter: 'text' }))).toBe('text')
    expect(kindOfColumn(col({ field: 'f', filter: 'number' }))).toBe('number')
    // editor 选项或枚举映射 → select
    expect(kindOfColumn(col({ field: 'g', editor: { options: [{ label: 'x', value: 1 }] } }))).toBe(
      'select'
    )
    expect(kindOfColumn(col({ field: 'h', filterValueMap: { '1': '一' } }))).toBe('select')
    expect(kindOfColumn(col({ field: 'i' }))).toBe('text')
  })
})

describe('query.queryOpsOfKind / defaultQueryOperator', () => {
  it('各类别给出合理运算符集合，默认取第一项', () => {
    expect(queryOpsOfKind('text').includes('contains')).toBe(true)
    expect(queryOpsOfKind('number').includes('between')).toBe(true)
    expect(queryOpsOfKind('date')).toEqual(['between', 'gte', 'lte'])
    expect(queryOpsOfKind('select').includes('in')).toBe(true)
    expect(defaultQueryOperator('text')).toBe('contains')
    expect(defaultQueryOperator('number')).toBe('eq')
    expect(defaultQueryOperator('date')).toBe('between')
  })
})

describe('query.deriveQueryFields', () => {
  const cols: RjColumn[] = [
    { field: 'id', title: '编号', type: 'num' },
    { field: 'name', title: '名称', filter: 'text' },
    { field: 'type', title: '类型' },
    { field: '__check' }, // 内部列剔除
    { field: 'secret', filter: false } // 显式禁筛剔除
  ]
  it('跳过内部列与 filter:false，标题缺省回落 field', () => {
    const fields = deriveQueryFields(cols).map((f) => f.field)
    expect(fields).toEqual(['id', 'name', 'type'])
  })
  it('override 可补标题/类别/候选', () => {
    const defs = deriveQueryFields(cols, [
      { field: 'type', kind: 'select', options: [{ label: '目录', value: 1 }] }
    ])
    const type = defs.find((f) => f.field === 'type')!
    expect(type.kind).toBe('select')
    expect(type.options?.[0].label).toBe('目录')
  })
})

describe('query.queryHasValue / activeQueryConditions', () => {
  it('未填值的条件不参与过滤', () => {
    expect(queryHasValue({ field: 'a', operator: 'contains', value: '' })).toBe(false)
    expect(queryHasValue({ field: 'a', operator: 'contains', value: 'x' })).toBe(true)
    expect(queryHasValue({ field: 'a', operator: 'in', value: [] })).toBe(false)
    expect(queryHasValue({ field: 'a', operator: 'between', value1: 1 })).toBe(true)
    expect(queryHasValue({ field: 'a', operator: 'between' })).toBe(false)
  })
  it('只保留生效条件', () => {
    const list: RjQueryCondition[] = [
      { field: 'a', operator: 'eq', value: '' },
      { field: 'b', operator: 'eq', value: 2 }
    ]
    expect(activeQueryConditions(list).map((c) => c.field)).toEqual(['b'])
  })
})

describe('query.matchQueryValue', () => {
  it('文本 contains/eq/ne（大小写无关、宽松比较）', () => {
    expect(matchQueryValue('Hello', { field: 'n', operator: 'contains', value: 'ell' })).toBe(true)
    expect(matchQueryValue('Hello', { field: 'n', operator: 'contains', value: 'zz' })).toBe(false)
    expect(matchQueryValue(1, { field: 'n', operator: 'eq', value: '1' })).toBe(true)
    expect(matchQueryValue('a', { field: 'n', operator: 'ne', value: 'b' })).toBe(true)
  })
  it('数值 gt/gte/lt/lte（非数值不命中）', () => {
    expect(matchQueryValue(10, { field: 'q', operator: 'gt', value: 5 }, 'number')).toBe(true)
    expect(matchQueryValue(5, { field: 'q', operator: 'gte', value: 5 }, 'number')).toBe(true)
    expect(matchQueryValue('x', { field: 'q', operator: 'gt', value: 5 }, 'number')).toBe(false)
  })
  it('between：数值走 Number，日期走时间戳', () => {
    expect(
      matchQueryValue(7, { field: 'q', operator: 'between', value1: 5, value2: 10 }, 'number')
    ).toBe(true)
    expect(
      matchQueryValue(3, { field: 'q', operator: 'between', value1: 5, value2: 10 }, 'number')
    ).toBe(false)
    expect(
      matchQueryValue(
        new Date('2026-01-15T00:00:00').getTime(),
        {
          field: 'd',
          operator: 'between',
          value1: '2026-01-01 00:00:00',
          value2: '2026-01-31 23:59:59'
        },
        'date'
      )
    ).toBe(true)
  })
  it('in：命中集合任一（宽松相等）', () => {
    expect(matchQueryValue(2, { field: 's', operator: 'in', value: [1, 2, 3] }, 'select')).toBe(
      true
    )
    expect(matchQueryValue(9, { field: 's', operator: 'in', value: [1, 2] }, 'select')).toBe(false)
  })
})

describe('query.rowPassesQuery', () => {
  const cols: RjColumn[] = [
    { field: 'name', filter: 'text' },
    { field: 'qty', type: 'num' },
    { field: 'cat', editor: { options: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] } }
  ]
  const colOf = (f: string) => cols.find((c) => c.field === f)
  const row = { name: 'Widget', qty: 50, cat: 2 }
  it('多条件 AND 全命中', () => {
    expect(
      rowPassesQuery(
        row,
        [
          { field: 'name', operator: 'contains', value: 'get' },
          { field: 'qty', operator: 'gte', value: 50 },
          { field: 'cat', operator: 'eq', value: 2 }
        ],
        colOf
      )
    ).toBe(true)
  })
  it('任一不命中即整体 false', () => {
    expect(
      rowPassesQuery(
        row,
        [
          { field: 'name', operator: 'contains', value: 'get' },
          { field: 'qty', operator: 'gt', value: 100 }
        ],
        colOf
      )
    ).toBe(false)
  })
})
