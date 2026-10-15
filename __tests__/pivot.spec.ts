// 透视（pivot）回归：聚合正确性 + 高基数维度护栏
// 背景：透视曾对「每个列组合做一次全表 filter」，勾选高基数维度（物料编码 8000 唯一值）
// 时规模是 O(组合数 × 行数)，会把主线程挂死数分钟。现已加组合上限 + 一次分桶。
import { describe, it, expect } from './harness'
import { cellRawValue, useRowModel } from '../src/useRowModel'
import type { RjColumn, RjRowData, RjDataMode } from '../src/types'

const cols = (): RjColumn[] => [
  { field: 'wh', colId: 'wh', title: '仓库' },
  { field: 'code', colId: 'code', title: '物料编码' },
  { field: 'qty', colId: 'qty', title: '数量', type: 'num', aggFunc: 'sum' }
]

function mkModel(
  rows: RjRowData[],
  pipeline: RjColumn[],
  mode: RjDataMode = 'client',
  labels?: { total: string; grandTotal: string; totalOf: (t: string) => string }
) {
  const rm = useRowModel(() => rows, {
    rowKey: () => 'id',
    rowHeight: () => 28,
    detailHeight: () => 120,
    fullWidthHeight: () => 80,
    hasDetailSlot: () => false,
    isFullWidthRow: () => false,
    dataMode: () => mode,
    pageSize: () => 100,
    treeData: () => false,
    childrenField: () => 'children',
    parentField: () => 'parentId',
    labels: labels ? () => labels : undefined
  })
  rm.setPipelineColumns(pipeline)
  // 主组件在列源变化时调用 pivotCols 记录原始列（buildPivotRows 依赖它定位维度/指标）
  rm.pivotCols(pipeline)
  return rm
}

describe('pivot 聚合正确性（列维度）', () => {
  const rows: RjRowData[] = [
    { id: '1', wh: '华东', code: 'A', qty: 3 },
    { id: '2', wh: '华东', code: 'B', qty: 5 },
    { id: '3', wh: '华北', code: 'A', qty: 7 },
    { id: '4', wh: '华北', code: 'A', qty: 1 }
  ]
  const rm = mkModel(rows, cols())
  rm.pivotState.value = { cols: ['code'], values: ['qty'], active: true }
  const pc = rm.pivotCols(cols())
  const dr = rm.processed.value.displayRows
  const agg = (dr[0].data as any).__agg

  it('列维度生成透视分组列', () => {
    const groups = pc.filter((c) => String(c.colId).startsWith('__pv:'))
    expect(groups.length).toBe(2, '透视分组列数')
  })
  it('每个组合按 value 指标求和', () => {
    expect(agg['__pvv:A:qty']).toBe(11, 'A 组合 qty 合计')
    expect(agg['__pvv:B:qty']).toBe(5, 'B 组合 qty 合计')
  })
  it('行总计跨全部组合', () => {
    expect(agg['__pvt:qty']).toBe(16, '行总计 qty')
    expect(pc.some((c) => c.colId === '__pvtotal')).toBe(true, '存在行总计列组')
  })
  it('无行维时只产出一张聚合行', () => {
    expect(dr.length).toBe(1, '透视行数')
    expect(dr[0].type).toBe('group')
  })
})

describe('pivot 行维与文案（i18n 注入）', () => {
  const rows: RjRowData[] = [
    { id: '1', wh: '华东', code: 'A', qty: 3 },
    { id: '2', wh: '华东', code: 'A', qty: 4 },
    { id: '3', wh: '华北', code: 'B', qty: 5 }
  ]

  it('行维标签写入 __pvrow 列并追加总计行', () => {
    const rm = mkModel(rows, cols())
    rm.rowGroupFields.value = ['wh']
    rm.pivotState.value = { cols: ['code'], values: ['qty'], active: true }
    rm.pivotCols(cols())
    const dr = rm.processed.value.displayRows
    const labels = dr.map((r) => (r.data as any)['__pvrow0:wh'])
    expect(labels.slice(0, 2).sort().join(',')).toBe('华东,华北', '行维标签')
    expect(dr[dr.length - 1].key).toBe('__grandtotal', '末行为总计')
    expect((dr[dr.length - 1].data as any)['__pvrow0:wh']).toBe('总计', '总计行标签')
  })

  it('labels 注入后引擎自生成文案跟随语言', () => {
    const rm = mkModel(rows, cols(), 'client', {
      total: 'Total',
      grandTotal: 'Grand Total',
      totalOf: (t) => `Total ${t}`
    })
    rm.rowGroupFields.value = ['wh']
    rm.pivotState.value = { cols: ['code'], values: ['qty'], active: true }
    const pc = rm.pivotCols(cols())
    const dr = rm.processed.value.displayRows
    expect(pc.some((c) => c.colId === '__pvtotal' && c.title === 'Total')).toBe(
      true,
      '总计列组标题取 labels.total'
    )
    expect((dr[dr.length - 1].data as any)['__pvrow0:wh']).toBe(
      'Grand Total',
      '总计行标签取 labels.grandTotal'
    )
    const totalLeaf = (pc.find((c) => c.colId === '__pvtotal')!.children || [])[0]
    expect(totalLeaf.title).toBe('Total 数量', '总计叶子列标题取 labels.totalOf')
  })
})

describe('pivot 高基数护栏（防主线程挂死）', () => {
  const N = 20000
  const rows: RjRowData[] = Array.from({ length: N }, (_, i) => ({
    id: String(i),
    wh: 'W' + (i % 4),
    code: 'M' + String(i % 8000), // 8000 个唯一值：上轮的挂死触发点
    qty: i % 10
  }))

  it('列维度组合数被上限截断', () => {
    const rm = mkModel(rows, cols())
    rm.pivotState.value = { cols: ['code'], values: ['qty'], active: true }
    const t0 = Date.now()
    const pc = rm.pivotCols(cols())
    const dr = rm.processed.value.displayRows
    const ms = Date.now() - t0
    const groups = pc.filter((c) => String(c.colId).startsWith('__pv:'))
    expect(groups.length <= 200).toBe(true, `透视分组列不超过上限（实际 ${groups.length}）`)
    expect(dr.length).toBe(1, '无行维时仍单行输出')
    // 截断按字典序保留前 N，结果可复现
    expect(String(groups[0].colId)).toBe('__pv:M0', '保留最小字典序组合')
    expect(ms < 3000).toBe(true, `高基数透视应在预算内完成（实测 ${ms}ms）`)
    console.log(
      `     ℹ ${N} 行 / 8000 唯一值透视：${groups.length} 组合列，${ms}ms（护栏前为挂死数分钟）`
    )
  })

  it('行维 × 高基数列维度组合也不挂死', () => {
    const rm = mkModel(rows, cols())
    rm.rowGroupFields.value = ['wh']
    rm.pivotState.value = { cols: ['code'], values: ['qty'], active: true }
    const t0 = Date.now()
    rm.pivotCols(cols())
    const dr = rm.processed.value.displayRows
    const ms = Date.now() - t0
    expect(dr.length).toBe(5, '行维 4 组 + 总计行')
    const grand = (dr[dr.length - 1].data as any).__agg
    expect(grand['__pvt:qty']).toBe(
      rows.reduce((s, r) => s + (r.qty as number), 0),
      '总计跨全部行'
    )
    expect(ms < 6000).toBe(true, `行维透视应在预算内完成（实测 ${ms}ms）`)
    console.log(`     ℹ ${N} 行 / 行维 4 × 高基数列维透视：${ms}ms`)
  })

  it('截断窗口内的组合仍可正常聚合（空桶保持 0 而非报错）', () => {
    const rm = mkModel(rows, cols())
    rm.pivotState.value = { cols: ['code'], values: ['qty'], active: true }
    const pc = rm.pivotCols(cols())
    const agg = (rm.processed.value.displayRows[0].data as any).__agg
    const kept = pc.filter((c) => String(c.colId).startsWith('__pv:'))
    const lastKept = String(kept[kept.length - 1].colId)
    // 保留窗口内的组合都应有数值；空桶语义保持为 0（sum([]) === 0）
    expect(typeof agg[`__pvv:${lastKept.slice(5)}:qty`]).toBe('number', '保留组合值为数字')
  })
})

describe('pivot 度量列同源与类型透传（R12 回归）', () => {
  // 生成组合列的度量集、聚合行的度量集、组合列 id 里的指标键，三者必须同源同键
  const mixCols = (): RjColumn[] => [
    { field: 'wh', colId: 'wh', title: '仓库' },
    { field: 'price', colId: 'price', title: '单价', type: 'money', aggFunc: 'sum' },
    { field: 'rate', colId: 'rate', title: '齐套率', type: 'percent', aggFunc: 'avg' },
    // 表达式列：只有 colId 没有 field，指标键曾退化成 undefined 而与其他列共键
    {
      colId: 'amountExp',
      title: '金额(表达式)',
      type: 'num',
      aggFunc: 'sum',
      valueGetter: (row: RjRowData) => (row as any).price * 10
    }
  ]
  const rows: RjRowData[] = [
    { id: '1', wh: 'A', price: 10, rate: 0.5 },
    { id: '2', wh: 'A', price: 20, rate: 0.7 },
    { id: '3', wh: 'B', price: 4, rate: 0.2 }
  ]
  const rm = mkModel(rows, mixCols())
  rm.pivotState.value = { cols: ['wh'], values: [], active: true }
  const pc = rm.pivotCols(mixCols())
  const comboLeaves = pc
    .filter((c) => String(c.colId).startsWith('__pv:'))
    .flatMap((g) => g.children || [])
  const agg = (rm.processed.value.displayRows[0].data as any).__agg

  it('默认「全部指标」态：每个生成组合列都能在 __agg 里取到自己的键', () => {
    expect(comboLeaves.length).toBe(6, '2 个组合 × 3 个度量')
    const missing = comboLeaves.filter((l) => !(String(l.colId) in agg)).map((l) => l.colId)
    expect(missing).toEqual([], '无悬空组合列')
    expect(comboLeaves.some((l) => String(l.colId).includes(':undefined'))).toBe(
      false,
      '不出现 undefined 指标键'
    )
  })

  it('度量按各自聚合取值，不串成同一列（曾整列显示成单价合计）', () => {
    expect(agg['__pvv:A:price']).toBe(30, 'A 单价合计')
    expect(agg['__pvv:A:rate']).toBeCloseTo(0.6, 10, 'A 齐套率均值')
    expect(agg['__pvv:A:amountExp']).toBe(300, 'A 表达式合计')
    expect(agg['__pvv:B:price']).toBe(4, 'B 单价合计')
  })

  it('percent / money 度量生成的列保留原类型（否则透视格露裸浮点）', () => {
    const rateLeaf = comboLeaves.find((l) => String(l.colId) === '__pvv:A:rate')
    expect(rateLeaf?.type).toBe('percent', '透视组合列保留 percent')
    const priceLeaf = comboLeaves.find((l) => String(l.colId) === '__pvv:A:price')
    expect(priceLeaf?.type).toBe('money', '透视组合列保留 money')
  })

  it('组行缺该列聚合项时取值为空，不回落成第一个聚合值', () => {
    const ghost: RjColumn = { colId: '__pvv:A:nope', field: '__pvv:A:nope', title: '幽灵列' }
    expect(cellRawValue(ghost, rm.processed.value.displayRows[0].data)).toBe(
      undefined,
      '不把别的列的聚合值冒充过来'
    )
  })

  it('显式勾选单个度量：生成列与聚合键仍然一一对应', () => {
    const rm2 = mkModel(rows, mixCols())
    rm2.pivotState.value = { cols: ['wh'], values: ['rate'], active: true }
    const pc2 = rm2.pivotCols(mixCols())
    const leaves2 = pc2
      .filter((c) => String(c.colId).startsWith('__pv:'))
      .flatMap((g) => g.children || [])
    const agg2 = (rm2.processed.value.displayRows[0].data as any).__agg
    expect(leaves2.length).toBe(2, '2 个组合 × 1 个度量')
    expect(leaves2.every((l) => String(l.colId) in agg2)).toBe(true, '生成列全部有聚合项')
  })

  it('勾选集整体失效（陈旧持久化存了生成列 id）时退回默认「全部指标」', () => {
    const rm3 = mkModel(rows, mixCols())
    rm3.pivotState.value = {
      cols: ['wh'],
      values: ['__pvv:A:price', '__pvt:undefined'],
      active: true
    }
    const pc3 = rm3.pivotCols(mixCols())
    const leaves3 = pc3
      .filter((c) => String(c.colId).startsWith('__pv:'))
      .flatMap((g) => g.children || [])
    const agg3 = (rm3.processed.value.displayRows[0].data as any).__agg
    expect(leaves3.length).toBe(6, '退回 3 个隐式度量 × 2 组合')
    expect(leaves3.every((l) => String(l.colId) in agg3)).toBe(true, '退回后仍应有聚合项')
  })

  it('源列 formatter 继承到透视组合列（否则透视前后同一度量口径不一）', () => {
    const src = mixCols().slice()
    src[1] = { ...src[1], formatter: (p: any) => `@${p.value}` }
    const rm4 = mkModel(rows, src)
    rm4.pivotState.value = { cols: ['wh'], values: ['price'], active: true }
    const pc4 = rm4.pivotCols(src)
    const leaf = pc4
      .filter((c) => String(c.colId).startsWith('__pv:'))
      .flatMap((g) => g.children || [])
      .find((l) => String(l.colId) === '__pvv:A:price')
    expect(String(leaf?.formatter)).toBe(String(src[1].formatter), '组合列沿用源列 formatter')
  })
})
