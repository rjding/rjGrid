// useColumnState.ts 列状态单元测试：重点覆盖「显隐三态覆盖」语义
// 生效隐藏 = 用户覆盖（true 强制隐藏 / false 强制显示）?? 列定义（hidden / visible）
import { describe, it, expect } from './harness'
import { useColumnState } from '../src/useColumnState'
import type { RjColumn } from '../src/types'

const mk = (cols: RjColumn[]) => useColumnState(() => cols)

/** 三区合并后的可见列顺序（与 computeLayout 的读取顺序一致） */
const visibleIds = (st: ReturnType<typeof mk>): string[] => {
  const l = st.computeLayout()
  return [...l.leftLeaves, ...l.normalLeaves, ...l.rightLeaves].map((x) => x.colId)
}

const BASE: RjColumn[] = [
  { field: 'a', title: 'A' },
  { field: 'b', title: 'B', hidden: true },
  { field: 'c', title: 'C' }
]

describe('useColumnState 显隐基线', () => {
  it('无用户覆盖时跟随列定义：hidden 列不进布局', () => {
    const st = mk(BASE)
    expect(visibleIds(st)).toEqual(['a', 'c'])
    expect(st.isColumnHidden('b')).toBe(true)
  })

  it('visible:false 与 hidden:true 等价', () => {
    const st = mk([{ field: 'a' }, { field: 'b', visible: false }])
    expect(visibleIds(st)).toEqual(['a'])
    expect(st.isColumnHidden('b')).toBe(true)
  })

  it('面板状态 listLeafUi 报告生效显隐，不再把 hidden 列误报为可见', () => {
    const st = mk(BASE)
    const ui = st.listLeafUi()
    expect(ui.map((x) => x.colId + ':' + (x.hidden ? 'H' : 'V')).join(',')).toBe('a:V,b:H,c:V')
    expect(ui.find((x) => x.colId === 'b')!.hidden).toBe(true)
    expect(ui.find((x) => x.colId === 'a')!.hidden).toBe(false)
  })
})

describe('useColumnState 三态覆盖', () => {
  it('toggleHide 可打开列定义 hidden 的列（旧语义的 OR 叠加做不到）', () => {
    const st = mk(BASE)
    st.toggleHide('b')
    expect(st.isColumnHidden('b')).toBe(false)
    expect(visibleIds(st)).toEqual(['a', 'b', 'c'])
  })

  it('再次 toggleHide 回到隐藏，第三次再打开（按生效态翻转而非按覆盖位翻转）', () => {
    const st = mk(BASE)
    st.toggleHide('b') // 强制显示
    st.toggleHide('b') // 强制隐藏
    expect(st.isColumnHidden('b')).toBe(true)
    expect(visibleIds(st)).toEqual(['a', 'c'])
    st.toggleHide('b')
    expect(st.isColumnHidden('b')).toBe(false)
  })

  it('显式赋值：toggleHide(id, false) 直接强制显示，忽略当前态', () => {
    const st = mk(BASE)
    st.toggleHide('a', true) // 强制隐藏本来可见的列
    expect(visibleIds(st)).toEqual(['c'])
    st.toggleHide('b', false) // 强制显示列定义 hidden 的列
    expect(visibleIds(st)).toEqual(['b', 'c'])
    st.toggleHide('a', true) // 重复设定不改变结果
    expect(visibleIds(st)).toEqual(['b', 'c'])
  })

  it('sizeToFit 只给生效可见列分配宽度', () => {
    const st = mk(BASE)
    st.setViewportWidth(1000)
    st.sizeToFit() // b 仍隐藏 → 只有 a / c 参与分配
    const two = st.computeLayout().normalLeaves.map((l) => l.width)
    expect(two.length).toBe(2)
    expect(two.every((w) => w >= 400)).toBe(true)
    // 强制打开 b 后重新分配，三列均分满视口
    st.toggleHide('b', false)
    st.sizeToFit()
    const three = st.computeLayout().normalLeaves.map((l) => l.width)
    expect(three.length).toBe(3)
    expect(Math.abs(three.reduce((s, w) => s + w, 0) - 1000) <= 5).toBe(true)
  })
})

describe('useColumnState 持久化往返', () => {
  it('强制显示的覆盖以 hide:false 落库，回放后仍然是显示', () => {
    const st = mk(BASE)
    st.toggleHide('b', false)
    const items = st.getColumnState()
    expect(items.find((i) => i.colId === 'b')!.hide).toBe(false)

    const st2 = mk(BASE)
    st2.applyColumnState(items)
    expect(st2.isColumnHidden('b')).toBe(false)
    expect(visibleIds(st2)).toEqual(['a', 'b', 'c'])
  })

  it('强制隐藏的覆盖以 hide:true 落库，回放后仍然是隐藏', () => {
    const st = mk(BASE)
    st.toggleHide('a', true)
    const items = st.getColumnState()
    expect(items.find((i) => i.colId === 'a')!.hide).toBe(true)
    const st2 = mk(BASE)
    st2.applyColumnState(items)
    expect(visibleIds(st2)).toEqual(['c'])
  })

  it('未被用户动过的列不落 hide 字段（旧存量 state 只有 hide:true 也照常工作）', () => {
    const st = mk(BASE)
    const items = st.getColumnState()
    expect(items.every((i) => i.hide === undefined)).toBe(true)
    const st2 = mk(BASE)
    st2.applyColumnState([{ colId: 'c', order: 0, hide: true }])
    expect(visibleIds(st2)).toEqual(['a'])
  })

  it('resetColumnState 清空全部覆盖，回到列定义基线', () => {
    const st = mk(BASE)
    st.toggleHide('b', false)
    st.toggleHide('a', true)
    st.resetColumnState()
    expect(visibleIds(st)).toEqual(['a', 'c'])
    expect(st.getColumnState().every((i) => i.hide === undefined)).toBe(true)
  })
})

describe('useColumnState 多级表头显隐', () => {
  const TREE: RjColumn[] = [
    {
      title: 'G',
      children: [
        { field: 'g1', title: 'G1' },
        { field: 'g2', title: 'G2', hidden: true }
      ]
    },
    { field: 'z', title: 'Z' }
  ]

  it('组内隐藏子列不计入 colspan', () => {
    const st = mk(TREE)
    const { rows } = st.computeHeaderRows()
    const group = rows[0].find((c) => c.isGroup)
    expect(group!.colSpan).toBe(1)
    expect(visibleIds(st)).toEqual(['g1', 'z'])
  })

  it('子列被强制显示后 colspan 与布局同步跟上', () => {
    const st = mk(TREE)
    st.toggleHide('g2', false)
    const { rows } = st.computeHeaderRows()
    const group = rows[0].find((c) => c.isGroup)
    expect(group!.colSpan).toBe(2)
    expect(visibleIds(st)).toEqual(['g1', 'g2', 'z'])
  })

  it('整组子列都隐藏时组头不再占位', () => {
    const st = mk(TREE)
    st.toggleHide('g1', true)
    const { rows } = st.computeHeaderRows()
    expect(rows[0].some((c) => c.isGroup)).toBe(false)
    expect(visibleIds(st)).toEqual(['z'])
  })
})

describe('useColumnState 内容自适应宽度播种', () => {
  const leafWidth = (st: ReturnType<typeof mk>, id: string): number | undefined => {
    const l = st.computeLayout()
    return [...l.leftLeaves, ...l.normalLeaves, ...l.rightLeaves].find((x) => x.colId === id)?.width
  }
  it('未定宽列：setAutoWidth 生效于布局，hasSizedWidth 仍为 false（不被持久化）', () => {
    const st = mk(BASE)
    expect(st.hasSizedWidth('a')).toBe(false)
    st.setAutoWidth('a', 200)
    expect(leafWidth(st, 'a')).toBe(200)
    expect(st.hasSizedWidth('a')).toBe(false)
  })
  it('无 autoWidth 也无显式宽：回落 120', () => {
    const st = mk(BASE)
    expect(leafWidth(st, 'c')).toBe(120)
  })
  it('显式 width 的列 hasSizedWidth=true（跳过自适应）', () => {
    const st = mk([{ field: 'x', title: 'X', width: 150 }])
    expect(st.hasSizedWidth('x')).toBe(true)
    expect(leafWidth(st, 'x')).toBe(150)
  })
  it('用户 resize 优先于 autoWidth', () => {
    const st = mk(BASE)
    st.setAutoWidth('a', 200)
    st.resize('a', 90)
    expect(leafWidth(st, 'a')).toBe(90)
    expect(st.hasSizedWidth('a')).toBe(true)
  })
})

// 冻结三态：面板报「生效冻结」，且「取消冻结」对列定义里写了 fixed 的列真能取消。
// 背景：列菜单「列」页签图钉全部同一颜色——面板只读 pinMap 把 fixed 列报成未冻结，
// 而 togglePin(id, null) 只 delete 覆盖，下一句又回落 fixed，点了等于没点。
const PIN: RjColumn[] = [
  { field: 'a', title: 'A', fixed: 'left' },
  { field: 'b', title: 'B' },
  { field: 'c', title: 'C', fixed: 'right' }
]
const pinState = (st: ReturnType<typeof mk>) =>
  st
    .listLeafUi()
    .map((x) => x.colId + ':' + (x.pinned || '-'))
    .join(',')

describe('useColumnState 冻结三态', () => {
  it('listLeafUi 报生效冻结（含列定义 fixed），与 computeLayout 分区一致', () => {
    const st = mk(PIN)
    expect(pinState(st)).toBe('a:left,b:-,c:right')
    const l = st.computeLayout()
    expect(l.leftLeaves.map((x) => x.colId)).toEqual(['a'])
    expect(l.rightLeaves.map((x) => x.colId)).toEqual(['c'])
    expect(l.normalLeaves.map((x) => x.colId)).toEqual(['b'])
  })

  it('取消冻结能盖住列定义的 fixed（旧语义 delete 后立即回落，点了没反应）', () => {
    const st = mk(PIN)
    st.togglePin('a', null)
    expect(pinState(st)).toBe('a:-,b:-,c:right')
    expect(st.computeLayout().leftLeaves.length).toBe(0)
    expect(st.computeLayout().normalLeaves.map((x) => x.colId)).toEqual(['a', 'b'])
  })

  it('未冻结列钉到右侧再取消，回到跟随定义的默认态', () => {
    const st = mk(PIN)
    st.togglePin('b', 'right')
    expect(pinState(st)).toBe('a:left,b:right,c:right')
    st.togglePin('b', null)
    expect(pinState(st)).toBe('a:left,b:-,c:right')
  })

  it('pinned:null 也是要入库的覆盖：刷新/回灌后不会把 fixed 又冻回来', () => {
    const st = mk(PIN)
    st.togglePin('a', null)
    const saved = st.getColumnState()
    expect(saved.find((x) => x.colId === 'a')!.pinned).toBe(null)
    const st2 = mk(PIN)
    st2.applyColumnState(saved)
    expect(pinState(st2)).toBe('a:-,b:-,c:right')
  })

  it('无覆盖时不写 pinned，不会污染持久化数据', () => {
    const st = mk(PIN)
    st.togglePin('b', 'left')
    const saved = st.getColumnState()
    expect(saved.find((x) => x.colId === 'b')!.pinned).toBe('left')
    expect(saved.find((x) => x.colId === 'a')!.pinned).toBe(undefined)
    expect(saved.find((x) => x.colId === 'c')!.pinned).toBe(undefined)
  })
})
