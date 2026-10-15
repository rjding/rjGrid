// 行拖拽（rowDraggable）在各数据模式下的可落地性回归。
// 背景：真实业务页给分页 tab 加了 row-draggable 却「没效果」——引擎里 startRowDrag 有一道
// dataMode !== 'client' 的硬门禁，而手柄列照画，于是 pointerdown 静默 return。放开门禁前
// 必须先确认「重排源数组」这条落位路径在分页 / 无限滚动下真的成立，在 SSRM 下确实不成立。
// applyRowMove 的三步（indexOf → splice → touchOrder）依赖两个前提，这里逐条锁住：
//   ① 非 client 模式的 sourceRows() 就是 serverRows.value 本身（同一数组实例，就地改能看见）；
//   ② displayRows.data 与源数组之间的对象同一性能支撑 indexOf 定位（serverRows 是 ref 深响应，
//      代理数组的 indexOf 由 Vue 做了 toRaw 兼容；若哪天换成 shallowRef 或改成行拷贝，这里
//      会返回 -1，拖拽变成「拖了半天白拖」的静默失败）。
import { describe, it, expect } from './harness'
import { useRowModel } from '../src/useRowModel'
import { rowMoveInsertIndex } from '../src/utils'
import type { RjColumn, RjDataMode, RjRowData } from '../src/types'

const cols = (): RjColumn[] => [
  { field: 'id', colId: 'id', title: '编号', type: 'num' },
  { field: 'name', colId: 'name', title: '名称' }
]

const page = (): RjRowData[] => [
  { id: 1, name: 'a' },
  { id: 2, name: 'b' },
  { id: 3, name: 'c' },
  { id: 4, name: 'd' }
]

function mk(dataMode: RjDataMode) {
  const rm = useRowModel(() => [] as RjRowData[], {
    rowKey: () => 'id',
    rowHeight: () => 28,
    detailHeight: () => 120,
    fullWidthHeight: () => 80,
    hasDetailSlot: () => false,
    isFullWidthRow: () => false,
    dataMode: () => dataMode,
    pageSize: () => 20,
    treeData: () => false,
    childrenField: () => 'children',
    parentField: () => 'parentId'
  })
  rm.setPipelineColumns(cols())
  return rm
}

const ids = (rm: ReturnType<typeof mk>) =>
  rm.processed.value.displayRows.map((d) => (d.data as RjRowData).id)

/** 复刻 applyRowMove 的落位三步（含同一个 rowMoveInsertIndex 换算）：拖不动就返回 false */
function moveLikeApplyRowMove(rm: ReturnType<typeof mk>, from: number, to: number) {
  const moved = rm.processed.value.displayRows[from].data
  const arr = rm.sourceRows() as RjRowData[]
  const cur = arr.indexOf(moved)
  if (cur < 0) return false
  const rws = rm.processed.value.displayRows
  const insertAt = rowMoveInsertIndex(
    rws.length,
    (i) => rws[i].type === 'row',
    (i) => rws[i].data === moved,
    from,
    to
  )
  arr.splice(cur, 1)
  arr.splice(insertAt, 0, moved)
  rm.touchOrder()
  return true
}

describe('行拖拽落位：pagination / infinite 重排内存行', () => {
  it('pagination：sourceRows 就是 serverRows 本身，就地重排能立刻反映到显示行', () => {
    const rm = mk('pagination')
    rm.serverRows.value = page()
    expect(ids(rm)).toEqual([1, 2, 3, 4], '初始按后端返回顺序')
    expect(rm.sourceRows() === rm.serverRows.value).toBe(true)
    // 把第 1 行拖到第 3 行位置
    expect(moveLikeApplyRowMove(rm, 0, 2)).toBe(true)
    expect(ids(rm)).toEqual([2, 3, 1, 4])
  })

  it('pagination：显示行可能是响应式代理，indexOf 仍要能命中源数组', () => {
    const rm = mk('pagination')
    const list = page()
    rm.serverRows.value = list
    const arr = rm.sourceRows()
    const drow = rm.processed.value.displayRows[2].data
    // 命中不了（-1）就等于拖拽静默失效：这里按业务主键核对下标，不假设对象是否被代理
    expect(arr.indexOf(drow)).toBe(
      list.findIndex((r) => r.id === 3),
      'displayRows.data 必须能在 sourceRows 里定位到自己'
    )
    expect(moveLikeApplyRowMove(rm, 2, 0)).toBe(true)
    expect(ids(rm)).toEqual([3, 1, 2, 4])
  })

  it('pagination：末尾行往上拖与往下拖都落位（跨全部行）', () => {
    const rm = mk('pagination')
    rm.serverRows.value = page()
    expect(moveLikeApplyRowMove(rm, 3, 0)).toBe(true)
    expect(ids(rm)).toEqual([4, 1, 2, 3])
    expect(moveLikeApplyRowMove(rm, 1, 3)).toBe(true)
    expect(ids(rm)).toEqual([4, 2, 3, 1])
  })

  it('infinite：与分页同源，重排后继续追加不影响已成型的手动顺序', () => {
    const rm = mk('infinite')
    rm.serverRows.value = page()
    expect(moveLikeApplyRowMove(rm, 0, 3)).toBe(true)
    expect(ids(rm)).toEqual([2, 3, 4, 1])
    // 追加下一页（引擎里是 serverRows.concat）：新行落在尾部，手动顺序保留
    rm.serverRows.value = rm.serverRows.value.concat([{ id: 5, name: 'e' }])
    expect(ids(rm)).toEqual([2, 3, 4, 1, 5])
  })

  it('client：源数组是可重排的独立副本，改它不动宿主数组', () => {
    const userRows = page()
    const rm = useRowModel(() => userRows, {
      rowKey: () => 'id',
      rowHeight: () => 28,
      detailHeight: () => 120,
      fullWidthHeight: () => 80,
      hasDetailSlot: () => false,
      isFullWidthRow: () => false,
      dataMode: () => 'client',
      pageSize: () => 20,
      treeData: () => false,
      childrenField: () => 'children',
      parentField: () => 'parentId'
    })
    rm.setPipelineColumns(cols())
    expect(moveLikeApplyRowMove(rm, 0, 2)).toBe(true)
    expect(ids(rm)).toEqual([2, 3, 1, 4])
    expect(userRows.map((r) => r.id)).toEqual([1, 2, 3, 4], '宿主源数组不应被拖拽改写')
  })
})

describe('行拖拽门禁：serverSide（SSRM）不开放重排', () => {
  it('SSRM 的 sourceRows 是每次新建的一次性数组，重排它落不回去', () => {
    const rm = mk('serverSide')
    const a = rm.sourceRows()
    const b = rm.sourceRows()
    // 稠密槽 filter 出新数组：两次调用不是同一个实例 → splice 改的是临时数组，显示行纹丝不动
    expect(a === b).toBe(false)
    expect(ids(rm)).toEqual([])
  })
})
