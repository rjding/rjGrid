// useRowModel.applyTransaction 的 replaceAll（整页/全量替换当前加载集）回归。
// 背景：宿主以 gridKey++ 整表重建兜底；replaceAll 提供「重取当前页后回填」的等价路径，
// 不重建组件、保留分页器与滚动位，供 pagination/infinite 模式使用。
import { describe, it, expect } from './harness'
import { useRowModel } from '../src/useRowModel'
import type { RjColumn, RjDataMode, RjRowData } from '../src/types'

const cols = (): RjColumn[] => [
  { field: 'id', colId: 'id', title: '编号' },
  { field: 'v', colId: 'v', title: '值' }
]

const baseOpts = (mode: RjDataMode) => ({
  rowKey: () => 'id',
  rowHeight: () => 28,
  detailHeight: () => 120,
  fullWidthHeight: () => 80,
  hasDetailSlot: () => false,
  isFullWidthRow: () => false,
  dataMode: () => mode,
  pageSize: () => 10,
  treeData: () => false,
  childrenField: () => 'children',
  parentField: () => 'parentId'
})

type Rm = ReturnType<typeof useRowModel>

const ids = (rm: Rm) =>
  rm.processed.value.displayRows.filter((d) => d.type === 'row').map((d) => d.data.id)

describe('applyTransaction.replaceAll（pagination 整页替换）', () => {
  function mkPage(initial: RjRowData[]) {
    let page = initial
    const rm = useRowModel(() => [], {
      ...baseOpts('pagination'),
      loadData: async () => ({ list: page, total: 100 })
    })
    rm.setPipelineColumns(cols())
    return { rm, setPage: (r: RjRowData[]) => (page = r) }
  }

  it('替换当前页后展示新行（不重建、不回第 1 页）', async () => {
    const { rm, setPage } = mkPage([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 }
    ])
    await rm.fetchPage(2, 10)
    expect(ids(rm)).toEqual(['a', 'b'])
    setPage([
      { id: 'a', v: 10 },
      { id: 'c', v: 3 }
    ])
    rm.applyTransaction({
      replaceAll: [
        { id: 'a', v: 10 },
        { id: 'c', v: 3 }
      ]
    })
    expect(ids(rm)).toEqual(['a', 'c'], '整页替换为最新数据')
  })

  it('replaceAll 与 update 组合：先替换再按 key 改写', async () => {
    const { rm } = mkPage([{ id: 'a', v: 1 }])
    await rm.fetchPage(1, 10)
    rm.applyTransaction({
      replaceAll: [
        { id: 'a', v: 1 },
        { id: 'b', v: 2 }
      ],
      update: [{ id: 'b', v: 20 }]
    })
    expect(
      rm.processed.value.displayRows.filter((d) => d.type === 'row').map((d) => d.data.v)
    ).toEqual([1, 20])
  })
})

describe('applyTransaction.replaceAll（client 全量替换）', () => {
  function mkClient(rows: RjRowData[]) {
    const rm = useRowModel(() => rows, baseOpts('client'))
    rm.setPipelineColumns(cols())
    return rm
  }

  it('replaceAll 替换客户端源数据', () => {
    const rm = mkClient([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 }
    ])
    rm.applyTransaction({ replaceAll: [{ id: 'x', v: 9 }] })
    expect(ids(rm)).toEqual(['x'])
  })
})
