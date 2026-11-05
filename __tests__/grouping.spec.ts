// 客户端分组（rowGroupFields）的组行契约回归：标签显示口径、键/路径保持原始值、页脚行、空值前提
// 背景：真实业务页（菜单数据）实测到组行标题显示原始字典值「1(60)」，而同一行的单元格显示
// 「目录/菜单/按钮」——同一件事在同一行上出现两种口径。修复是在 makeGroupRow 里按被分组列的
// formatter 转 __groupLabels 的显示文本，但 __groupValue / 组键 / 组 path 必须仍是原始值，
// 否则折叠态与持久化会跟着显示文本漂移。
import { describe, it, expect } from './harness'
import { cellRawValue, useRowModel } from '../src/useRowModel'
import type { RjColumn, RjRowData } from '../src/types'

const TYPE_MAP: Record<number, string> = { 1: '目录', 2: '菜单', 3: '按钮' }
const STATUS_MAP: Record<number, string> = { 0: '开启', 1: '关闭' }

const cols = (): RjColumn[] => [
  { field: 'id', colId: 'id', title: '编号', type: 'num' },
  {
    field: 'type',
    colId: 'type',
    title: '类型',
    formatter: (p: any) => TYPE_MAP[p.value] ?? p.value
  },
  {
    field: 'status',
    colId: 'status',
    title: '状态',
    formatter: (p: any) => STATUS_MAP[p.value] ?? p.value
  },
  // 布尔列故意写成 v ? '显示' : '隐藏'：组行没有这一列的值时会被伪造成「隐藏」
  {
    field: 'visible',
    colId: 'visible',
    title: '是否可见',
    formatter: (p: any) => (p.value ? '显示' : '隐藏')
  },
  { field: 'sort', colId: 'sort', title: '显示顺序', type: 'num', aggFunc: 'sum' }
]

const rows = (): RjRowData[] => [
  { id: 1, type: 2, status: 0, visible: true, sort: 3 },
  { id: 2, type: 2, status: 1, visible: false, sort: 5 },
  { id: 3, type: 3, status: 0, visible: true, sort: 7 },
  { id: 4, type: 1, status: 0, visible: true, sort: 1 }
]

function mk(opts: { labelOf?: boolean; footer?: boolean } = {}, pipeline: RjColumn[] = cols()) {
  const rm = useRowModel(() => rows(), {
    rowKey: () => 'id',
    rowHeight: () => 28,
    detailHeight: () => 120,
    fullWidthHeight: () => 80,
    hasDetailSlot: () => false,
    isFullWidthRow: () => false,
    dataMode: () => 'client',
    pageSize: () => 100,
    treeData: () => false,
    childrenField: () => 'children',
    parentField: () => 'parentId',
    groupFooter: opts.footer ? () => true : undefined,
    // 与主组件注入的同口径：有 formatter 才转，否则原样返回原始值
    groupLabelOf: opts.labelOf
      ? (col, value) => (col?.formatter ? String((col.formatter as any)({ value })) : value)
      : undefined
  })
  rm.setPipelineColumns(pipeline)
  return rm
}

const groupRows = (rm: ReturnType<typeof mk>) =>
  rm.processed.value.displayRows.filter((d) => d.type === 'group')

describe('客户端分组：组行标签显示口径', () => {
  it('注入 groupLabelOf 后，组行标签走被分组列的 formatter', () => {
    const rm = mk({ labelOf: true })
    rm.rowGroupFields.value = ['type']
    const g = groupRows(rm).find((d) => (d.data as any).__groupValue === 2)
    expect(g ? (g.data as any).__groupLabels : null).toEqual(['菜单'], '组行标签为显示文本')
  })

  it('未注入 groupLabelOf 时保持原始值（默认行为不回退）', () => {
    const rm = mk()
    rm.rowGroupFields.value = ['type']
    const g = groupRows(rm).find((d) => (d.data as any).__groupValue === 2)
    expect(g ? (g.data as any).__groupLabels : null).toEqual([2], '无回调则原样')
  })

  it('__groupValue / 组键 / 组 path 仍是原始值，折叠态与持久化不跟显示文本漂移', () => {
    const rm = mk({ labelOf: true, footer: true })
    rm.rowGroupFields.value = ['type']
    const g = groupRows(rm).find((d) => (d.data as any).__groupValue === 2)
    expect(g!.key).toBe('|0|2', '组键由原始值派生')
    expect((g!.data as any).__path).toBe('|0|2', '组 path 由原始值派生')
    expect((g!.data as any).__groupValue).toBe(2, '__groupValue 保持原始值')
    expect((g!.data as any).type).toBe(2, '被分组列上的原始字段值保留（供取值/导出）')
  })

  it('多级分组：每级标签用它自己那一列的口径，父级不被子级列顶错', () => {
    const rm = mk({ labelOf: true })
    // 客户端分组默认是收起态（processed 在展平前就置 firstExpansionDone），要看子级得先展开
    rm.defaultExpandAll.value = true
    rm.rowGroupFields.value = ['type', 'status']
    const deep = groupRows(rm).filter((d) => (d.data as any).__level === 1)
    // 同一状态值在多个类型组下都出现，必须按父组 path 定位到「菜单(2)」那一支
    const menuOn = deep.find((d) => d.parentKey === '|0|2' && (d.data as any).__groupValue === 0)
    expect(menuOn ? (menuOn.data as any).__groupLabels : null).toEqual(
      ['菜单', '开启'],
      '父级=类型列口径，本级=状态列口径'
    )
    const dirOn = deep.find((d) => d.parentKey === '|0|1' && (d.data as any).__groupValue === 0)
    expect(dirOn ? (dirOn.data as any).__groupLabels : null).toEqual(
      ['目录', '开启'],
      '父级标签按父列转，不被子列口径污染'
    )
  })

  it('列没有 formatter 时标签仍是原始值', () => {
    const rm = mk({ labelOf: true })
    rm.rowGroupFields.value = ['id']
    const g = groupRows(rm)[0]
    expect(g ? (g.data as any).__groupLabels : null).toEqual([1], '无 formatter 不加工')
  })

  it('分组页脚沿用同一份已格式化的组行数据，key 带 :footer 后缀', () => {
    const rm = mk({ labelOf: true, footer: true })
    rm.defaultExpandAll.value = true
    rm.rowGroupFields.value = ['type']
    const f = rm.processed.value.displayRows.find((d) => d.isFooter)
    expect(f ? String(f.key) : '').toBe('|0|1:footer', '页脚 key 后缀（页脚与所属组同 path）')
    expect(f ? (f.data as any).__groupLabels : null).toEqual(['目录'], '页脚标签同为显示文本')
  })
})

describe('客户端分组：合成行的空值前提（显示层不得交给 formatter）', () => {
  it('组行在没有该列聚合项时取值为 undefined', () => {
    const rm = mk({ labelOf: true })
    rm.rowGroupFields.value = ['type']
    const g = groupRows(rm)[0]
    const pipeline = cols()
    const visibleCol = pipeline.find((c) => c.field === 'visible')!
    const sortCol = pipeline.find((c) => c.field === 'sort')!
    expect(cellRawValue(visibleCol, g.data)).toBe(undefined, '无聚合项的布尔列取值应为空')
    expect(typeof cellRawValue(sortCol, g.data)).toBe('number', '有 aggFunc 的列取聚合值')
  })

  it('合计行只带聚合列的键，其余列取值同样是 undefined', () => {
    const rm = mk({ labelOf: true })
    const sum = rm.summaryRow.value
    expect(sum ? !!sum : false).toBe(true, '有 aggFunc 列时应有合计行')
    const pipeline = cols()
    expect(cellRawValue(pipeline.find((c) => c.field === 'visible')!, sum!)).toBe(
      undefined,
      '合计行的 visible 列无值'
    )
    expect(cellRawValue(pipeline.find((c) => c.field === 'sort')!, sum!)).toBe(16, 'sort 列合计')
  })
})
