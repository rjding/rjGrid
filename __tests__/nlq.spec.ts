// nlq.ts 纯函数单元测试（自然语言查询解析：确定性、无 DOM）
import { describe, it, expect } from './harness'
import { parseNLQ, explainNLQ, type RjNlqColumn } from '../src/nlq'

const COLS: RjNlqColumn[] = [
  { colId: 'qty', field: 'qty', title: '数量', filterType: 'number' },
  {
    colId: 'amount',
    field: 'amount',
    title: '金额',
    aliases: ['price', '单价'],
    filterType: 'number'
  },
  { colId: 'name', field: 'name', title: '名称', filterType: 'text' },
  {
    colId: 'cat',
    field: 'cat',
    title: '类别',
    filterType: 'select',
    options: ['电子', '机械', '轴承']
  },
  {
    colId: 'status',
    field: 'status',
    title: '状态',
    filterType: 'select',
    options: ['在库', '缺货', '预售']
  },
  { colId: 'date', field: 'date', title: '日期', filterType: 'date' },
  { colId: 'wh', field: 'wh', title: '仓库', filterType: 'text' }
]

const firstFilter = (r: ReturnType<typeof parseNLQ>) => r.filters[0]

describe('nlq.parseNLQ 数值筛选', () => {
  it('数量大于100 → gt 100', () => {
    const r = parseNLQ('数量大于100', COLS)
    expect(r.ok).toBe(true)
    const f = firstFilter(r)
    expect(f.colId).toBe('qty')
    expect(f.model.conditions[0].op).toBe('gt')
    expect(f.model.conditions[0].value1).toBe(100)
  })
  it('金额大于等于50 → gte，符号 >= 亦可', () => {
    expect(parseNLQ('金额大于等于50', COLS).filters[0].model.conditions[0].op).toBe('gte')
    const s = parseNLQ('金额>=50', COLS)
    expect(s.filters[0].model.conditions[0].op).toBe('gte')
    expect(s.filters[0].model.conditions[0].value1).toBe(50)
  })
  it('金额 1000 到 5000 → inRange', () => {
    const c = parseNLQ('金额 1000 到 5000', COLS).filters[0].model.conditions[0]
    expect(c.op).toBe('inRange')
    expect(c.value1).toBe(1000)
    expect(c.value2).toBe(5000)
  })
  it('支持单位万：数量超过3万 → gt 30000', () => {
    const c = parseNLQ('数量超过3万', COLS).filters[0].model.conditions[0]
    expect(c.op).toBe('gt')
    expect(c.value1).toBe(30000)
  })
})

describe('nlq.parseNLQ 枚举/文本/日期', () => {
  it('状态为在库 → select in 在库', () => {
    const f = firstFilter(parseNLQ('状态为在库', COLS))
    expect(f.colId).toBe('status')
    expect(f.model.operator).toBe('and')
    expect(f.model.conditions[0].op).toBe('in')
    expect(f.model.conditions[0].value1).toEqual(['在库'])
  })
  it('状态不为在库 → select notIn（否定词优先于「为」）', () => {
    const c = parseNLQ('状态不为在库', COLS).filters[0].model.conditions[0]
    expect(c.op).toBe('notIn')
    expect(c.value1).toEqual(['在库'])
  })
  it('类别 不含 电子 → notIn', () => {
    const c = parseNLQ('类别不含电子', COLS).filters[0].model.conditions[0]
    expect(c.op).toBe('notIn')
    expect(c.value1).toEqual(['电子'])
  })
  it('名称包含轴承 → text contains', () => {
    const c = parseNLQ('名称包含轴承', COLS).filters[0].model.conditions[0]
    expect(c.op).toBe('contains')
    expect(c.value1).toBe('轴承')
  })
  it('日期在2024-01-01到2024-03-01之间 → date inRange', () => {
    const c = parseNLQ('日期在2024-01-01到2024-03-01之间', COLS).filters[0].model.conditions[0]
    expect(c.op).toBe('inRange')
    expect(c.value1).toBe('2024-01-01')
    expect(c.value2).toBe('2024-03-01')
  })
})

describe('nlq.parseNLQ 排序/分组/取前N', () => {
  it('按金额降序 → sort desc', () => {
    const r = parseNLQ('按金额降序', COLS)
    expect(r.sort!.field).toBe('amount')
    expect(r.sort!.dir).toBe('desc')
    expect(r.filters.length).toBe(0)
  })
  it('数量大于5 金额降序 → 筛选与排序互不串扰', () => {
    const r = parseNLQ('数量大于5 金额降序', COLS)
    expect(r.sort!.field).toBe('amount')
    expect(r.filters[0].colId).toBe('qty')
  })
  it('sort by price desc（英文别名）→ amount desc', () => {
    const r = parseNLQ('sort by price desc', COLS)
    expect(r.sort!.field).toBe('amount')
    expect(r.sort!.dir).toBe('desc')
  })
  it('按仓库分组 → groupBy wh', () => {
    expect(parseNLQ('按仓库分组', COLS).groupBy).toBe('wh')
  })
  it('数量大于10 前5 → limit 5', () => {
    const r = parseNLQ('数量大于10 前5', COLS)
    expect(r.limit).toBe(5)
    expect(r.filters[0].colId).toBe('qty')
  })
})

describe('nlq.parseNLQ 比较级排序（最高/最低…）', () => {
  it('金额最高 → sort amount desc', () => {
    const r = parseNLQ('金额最高', COLS)
    expect(r.sort!.field).toBe('amount')
    expect(r.sort!.dir).toBe('desc')
    expect(r.filters.length).toBe(0)
  })
  it('数量最少 → sort qty asc', () => {
    const r = parseNLQ('数量最少', COLS)
    expect(r.sort!.field).toBe('qty')
    expect(r.sort!.dir).toBe('asc')
  })
  it('单价最高的前5 → sort desc + limit 5（别名单价）', () => {
    const r = parseNLQ('单价最高的前5', COLS)
    expect(r.sort!.field).toBe('amount')
    expect(r.sort!.dir).toBe('desc')
    expect(r.limit).toBe(5)
  })
  it('显式「降序」仍优先于比较级（不串扰）', () => {
    expect(parseNLQ('按金额降序', COLS).sort!.dir).toBe('desc')
    expect(parseNLQ('金额最低', COLS).sort!.dir).toBe('asc')
  })
  it('比较级后的「的」不泄漏进相邻筛选值', () => {
    const r = parseNLQ('名称包含电机 单价最高的前3', COLS)
    const name = r.filters.find((f) => f.colId === 'name')!
    expect(name.model.conditions[0].value1).toBe('电机')
    expect(r.sort!.field).toBe('amount')
    expect(r.sort!.dir).toBe('desc')
    expect(r.limit).toBe(3)
  })
})

describe('nlq.parseNLQ 裸枚举值兼底', () => {
  it('「在库」（无任何列锚点）→ status in 在库', () => {
    const r = parseNLQ('在库', COLS)
    expect(r.ok).toBe(true)
    expect(r.filters.length).toBe(1)
    expect(r.filters[0].colId).toBe('status')
    expect(r.filters[0].model.conditions[0].op).toBe('in')
    expect(r.filters[0].model.conditions[0].value1).toEqual(['在库'])
  })
  it('「轴承」→ cat in 轴承', () => {
    expect(parseNLQ('轴承', COLS).filters[0].colId).toBe('cat')
  })
  it('裸枚举与排序/取前N 共存（排序被先遮蔽）', () => {
    const r = parseNLQ('在库 按数量降序 前3', COLS)
    expect(r.filters[0].colId).toBe('status')
    expect(r.sort!.field).toBe('qty')
    expect(r.limit).toBe(3)
  })
  it('引号短语不被兼底（仍为全局搜索）', () => {
    const r = parseNLQ('“轴承”', COLS)
    expect(r.search).toBe('轴承')
    expect(r.filters.length).toBe(0)
  })
  it('显式否定不被裸枚举破坏：状态不为在库 → notIn', () => {
    const c = parseNLQ('状态不为在库', COLS).filters[0].model.conditions[0]
    expect(c.op).toBe('notIn')
  })
})

describe('nlq.parseNLQ 搜索短语', () => {
  it('搜索 轴承 → search 轴承（不转枚举筛选）', () => {
    const r = parseNLQ('搜索 轴承', COLS)
    expect(r.search).toBe('轴承')
    expect(r.filters.length).toBe(0)
  })
  it('查找 电机 → search 电机', () => {
    expect(parseNLQ('查找 电机', COLS).search).toBe('电机')
  })
  it('搜索短语与筛选共存：数量大于50 搜索 电机', () => {
    const r = parseNLQ('数量大于50 搜索 电机', COLS)
    expect(r.filters[0].colId).toBe('qty')
    expect(r.search).toBe('电机')
  })
})

describe('nlq.parseNLQ 组合与异常', () => {
  it('数量大于100 且 状态为在库 → 跨列两条筛选', () => {
    const r = parseNLQ('数量大于100 且 状态为在库', COLS)
    expect(r.filters.length).toBe(2)
  })
  it('同列 或 → model.operator=or 且两条件', () => {
    const r = parseNLQ('类别包含电子 或 类别包含机械', COLS)
    expect(r.filters.length).toBe(1)
    expect(r.filters[0].model.operator).toBe('or')
    expect(r.filters[0].model.conditions.length).toBe(2)
  })
  it('尾部连接词不污染文本值：仓库为华东仓 且 数量大于30', () => {
    const r = parseNLQ('仓库为华东仓 且 数量大于30', COLS)
    const wh = r.filters.find((f) => f.colId === 'wh')!
    const qty = r.filters.find((f) => f.colId === 'qty')!
    expect(wh.model.conditions[0].value1).toBe('华东仓')
    expect(qty.model.conditions[0].value1).toBe(30)
  })
  it('空查询 → message=empty', () => {
    const r = parseNLQ('   ', COLS)
    expect(r.ok).toBe(false)
    expect(r.message).toBe('empty')
  })
  it('无法识别 → message=unrecognized', () => {
    const r = parseNLQ('你好世界', COLS)
    expect(r.ok).toBe(false)
    expect(r.message).toBe('unrecognized')
  })
  it('explainNLQ 默认中文回显（本地化算子与动词）', () => {
    const s = explainNLQ(parseNLQ('数量大于100 金额最高 前5', COLS))
    expect(s.includes('数量 > 100')).toBe(true)
    expect(s.includes('按金额 降序')).toBe(true)
    expect(s.includes('前5')).toBe(true)
  })
  it('explainNLQ lang=en 英文回显（宿主英文标题列）', () => {
    const EN: RjNlqColumn[] = [
      { colId: 'qty', field: 'qty', title: 'Qty', filterType: 'number' },
      { colId: 'amount', field: 'amount', title: 'Amount', filterType: 'number' }
    ]
    const s = explainNLQ(parseNLQ('qty greater than 100 sort by amount desc top 5', EN), 'en')
    expect(s.includes('Qty > 100')).toBe(true)
    expect(s.includes('sort by Amount desc')).toBe(true)
    expect(s.includes('top 5')).toBe(true)
  })
})

describe('nlq.parseNLQ 英文比较词（回归：曾静默降级为 eq）', () => {
  const opOf = (t: string, colId: string) =>
    parseNLQ(t, COLS).filters.find((f) => f.colId === colId)?.model.conditions[0]?.op
  it('greater than → gt（不是 eq）', () => {
    expect(opOf('qty greater than 100', 'qty')).toBe('gt')
    expect(parseNLQ('qty greater than 100', COLS).filters[0].model.conditions[0].value1).toBe(100)
  })
  it('greater than or equal to → gte（同位置取最长）', () => {
    expect(opOf('qty greater than or equal to 100', 'qty')).toBe('gte')
  })
  it('less than / less than or equal to → lt / lte', () => {
    expect(opOf('qty less than 30', 'qty')).toBe('lt')
    expect(opOf('qty less than or equal to 30', 'qty')).toBe('lte')
  })
  it('at least / at most / more than / above / below', () => {
    expect(opOf('qty at least 50', 'qty')).toBe('gte')
    expect(opOf('qty at most 50', 'qty')).toBe('lte')
    expect(opOf('qty more than 50', 'qty')).toBe('gt')
    expect(opOf('qty above 50', 'qty')).toBe('gt')
    expect(opOf('qty below 50', 'qty')).toBe('lt')
  })
  it('equal to / not equal to → eq / ne', () => {
    expect(opOf('amount equal to 9', 'amount')).toBe('eq')
    expect(opOf('amount not equal to 9', 'amount')).toBe('ne')
  })
  it('文本列 is / is not → eq / ne', () => {
    expect(opOf('name is bolt', 'name')).toBe('eq')
    expect(opOf('name is not bolt', 'name')).toBe('ne')
  })
  it('枚举列 is / is not / contains → in / notIn', () => {
    expect(opOf('cat is 电子', 'cat')).toBe('in')
    expect(opOf('cat is not 电子', 'cat')).toBe('notIn')
    expect(opOf('cat contains 电子', 'cat')).toBe('in')
  })
  it('日期列 after / before / on or after', () => {
    expect(opOf('date after 2024-01-01', 'date')).toBe('gt')
    expect(opOf('date before 2024-01-01', 'date')).toBe('lt')
    expect(opOf('date on or after 2024-01-01', 'date')).toBe('gte')
  })
  it('英文空/非空说法', () => {
    expect(opOf('name is empty', 'name')).toBe('blank')
    expect(opOf('name is not empty', 'name')).toBe('notBlank')
  })
  it('英文长句多意图：筛选 + 排序 + 限量', () => {
    const r = parseNLQ('qty greater than 100 and cat is 电子 sort by amount desc top 5', COLS)
    expect(r.ok).toBe(true)
    expect(r.filters.length).toBe(2)
    expect(r.sort?.dir).toBe('desc')
    expect(r.limit).toBe(5)
  })
  it('带空格的英文列名也能锁锚点（演示页示例同形）', () => {
    const demo: RjNlqColumn[] = [
      { colId: 'qty', field: 'qty', title: 'Stock Qty', filterType: 'number' },
      { colId: 'price', field: 'price', title: 'Unit Price', filterType: 'number' }
    ]
    const r = parseNLQ('stock qty greater than 50 sort by unit price desc', demo)
    expect(r.ok).toBe(true)
    expect(r.filters[0].model.conditions[0].op).toBe('gt')
    expect(r.sort?.field).toBe('price')
    expect(r.sort?.dir).toBe('desc')
  })
})

describe('nlq.parseNLQ 英文结构关键词（limit / 比较级排序）', () => {
  it('limit：first / limit / show me / top → 取前N', () => {
    expect(parseNLQ('first 10', COLS).limit).toBe(10)
    expect(parseNLQ('show me 5', COLS).limit).toBe(5)
    expect(parseNLQ('limit 20', COLS).limit).toBe(20)
    expect(parseNLQ('top 8 rows', COLS).limit).toBe(8)
  })
  it('比较级（后缀式）：amount highest / price cheapest → desc / asc', () => {
    expect(parseNLQ('amount highest', COLS).sort).toEqual({ field: 'amount', dir: 'desc' })
    expect(parseNLQ('amount cheapest', COLS).sort).toEqual({ field: 'amount', dir: 'asc' })
    expect(parseNLQ('price most expensive', COLS).sort?.dir).toBe('desc')
  })
  it('比较级（前缀式）：highest amount → desc', () => {
    expect(parseNLQ('highest amount', COLS).sort).toEqual({ field: 'amount', dir: 'desc' })
  })
  it('英文多意图：筛选 + 比较级排序 + limit', () => {
    const r = parseNLQ('qty greater than 50 amount highest first 10', COLS)
    expect(r.ok).toBe(true)
    expect(r.filters[0].model.conditions[0].op).toBe('gt')
    expect(r.sort?.dir).toBe('desc')
    expect(r.limit).toBe(10)
  })
})

describe('nlq.parseNLQ 候选值来源的严格度', () => {
  const mk = (strict: boolean): RjNlqColumn[] => [
    { colId: 'qty', field: 'qty', title: '数量', filterType: 'number' },
    {
      colId: 'cat',
      field: 'cat',
      title: '类别',
      filterType: 'select',
      options: ['电子', '机械'],
      strictOptions: strict
    }
  ]
  it('采样候选（非权威）：候选外的值仍采纳', () => {
    const r = parseNLQ('cat 在库', mk(false))
    expect(r.ok).toBe(true)
    expect(r.filters[0].model.conditions[0].value1).toEqual(['在库'])
  })
  it('声明候选（权威）：候选外不产空筛选，改判未识别', () => {
    const r = parseNLQ('cat 在库', mk(true))
    expect(r.ok).toBe(false)
    expect(r.message).toBe('unrecognized')
    expect(r.filters.length).toBe(0)
  })
  it('声明候选：命中候选照常工作', () => {
    expect(parseNLQ('cat 电子', mk(true)).filters[0].model.conditions[0].op).toBe('in')
  })
})

describe('nlq.parseNLQ 跨语言无命中不假装成功', () => {
  const EN: RjNlqColumn[] = [
    { colId: 'qty', field: 'qty', title: 'Qty', filterType: 'number' },
    {
      colId: 'cat',
      field: 'cat',
      title: 'Category',
      filterType: 'select',
      options: ['Elec'],
      strictOptions: true
    }
  ]
  it('英文列 + 中文提问 → ok:false / unrecognized（而非静默空执行）', () => {
    const r = parseNLQ('数量大于100', EN)
    expect(r.ok).toBe(false)
    expect(r.message).toBe('unrecognized')
    expect(r.filters.length).toBe(0)
  })
  it('英文列 + 英文提问 → 正常命中', () => {
    const r = parseNLQ('qty greater than 100', EN)
    expect(r.ok).toBe(true)
    expect(r.filters[0].model.conditions[0].op).toBe('gt')
  })
})
