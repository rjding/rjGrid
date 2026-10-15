// 自定义右键菜单（contextMenus）纯函数回归测试
import { describe, it, expect } from './harness'
import { buildCustomMenuItems, joinMenuSections, isEditableContextTarget, hasUserTextSelection } from '../src/contextMenus'
import type { RjContextMenuCtx, RjContextMenuItem, RjMenuItem } from '../src/types'

const ctx = { row: { id: 1, st: 'open' }, event: {} } as unknown as RjContextMenuCtx
const run = () => undefined

describe('contextMenus.buildCustomMenuItems', () => {
  it('未写 visible → 默认可见（护栏：cellActions 曾误取反致全隐藏）', () => {
    const items: RjContextMenuItem[] = [
      { name: 'a', label: '甲' },
      { name: 'b', label: '乙' }
    ]
    const out = buildCustomMenuItems(items, ctx, run)
    expect(out.map((m) => m.name)).toEqual(['甲', '乙'])
  })

  it('visible=false / 函数求值 false 被过滤，函数 true 保留且保持原序', () => {
    const items: RjContextMenuItem[] = [
      { name: 'x', label: 'x' },
      { name: 'y', label: 'y', visible: false },
      { name: 'z', label: 'z', visible: (c) => c.row?.st === 'open' },
      { name: 'w', label: 'w', visible: (c) => c.row?.st === 'closed' }
    ]
    const out = buildCustomMenuItems(items, ctx, run)
    expect(out.map((m) => m.name)).toEqual(['x', 'z'])
  })

  it('label 缺省取 name；icon 前缀并入文本', () => {
    const out = buildCustomMenuItems([{ name: 'del', icon: '🗑', danger: true }], ctx, run)
    expect(out[0].name).toBe('🗑 del')
    expect(out[0].danger).toBe(true)
  })

  it('disabled 布尔/函数 → 映射为求值闭包', () => {
    const out = buildCustomMenuItems(
      [{ name: 'a', disabled: true }, { name: 'b', disabled: (c) => !c.row }, { name: 'c' }],
      ctx,
      run
    )
    expect(out.map((m) => m.disabled?.())).toEqual([true, false, false])
  })

  it('分隔线：首项/连续/尾部悬空均被剪掉', () => {
    const out = buildCustomMenuItems(
      [
        { separator: true },
        { name: 'a' },
        { separator: true },
        { separator: true },
        { name: 'b' },
        { separator: true },
        { name: 'hidden', visible: false }
      ],
      ctx,
      run
    )
    expect(out.map((m) => m.isSeparator ? '|' : m.name)).toEqual(['a', '|', 'b'])
  })

  it('children 递归一级；子项全隐藏则父项按普通项走 onClick', () => {
    const clicked: string[] = []
    const onClick = (_c: RjContextMenuCtx) => clicked.push('hit')
    const runItem = (it: RjContextMenuItem, c: RjContextMenuCtx) => it.onClick?.(c)
    const out = buildCustomMenuItems(
      [
        { name: 'sub', children: [{ name: 's1' }, { name: 's2', visible: false }] },
        { name: 'emptySub', children: [{ name: 'x', visible: false }], onClick }
      ],
      ctx,
      runItem
    )
    expect(out[0].children?.map((c) => c.name)).toEqual(['s1'])
    expect(out[1].children).toBe(undefined)
    out[1].action?.()
    expect(clicked).toEqual(['hit'])
  })

  it('空数组 / undefined → 空菜单', () => {
    expect(buildCustomMenuItems(undefined, ctx, run)).toEqual([])
    expect(buildCustomMenuItems([], ctx, run)).toEqual([])
  })
})

describe('contextMenus.joinMenuSections', () => {
  const bi: RjMenuItem[] = [{ name: '复制' }]
  const cu: RjMenuItem[] = [{ name: '调试' }]
  it('两侧非空 → 中间补一条分隔线', () => {
    expect(joinMenuSections(bi, cu).map((m) => m.name ?? '|')).toEqual(['复制', '|', '调试'])
  })
  it('任一为空 → 原样返回另一侧（不多塞分隔线）', () => {
    expect(joinMenuSections(bi, [])).toEqual(bi)
    expect(joinMenuSections([], cu)).toEqual(cu)
    expect(joinMenuSections([], [])).toEqual([])
  })
  it('内置段已以分隔线收尾 → 不叠加双悬空线', () => {
    const out = joinMenuSections([{ name: '复制' }, { isSeparator: true }], cu)
    expect(out.map((m) => m.name ?? '|')).toEqual(['复制', '|', '调试'])
  })
})

describe('contextMenus.isEditableContextTarget', () => {
  it('命中可编辑元素 → true；未命中/非元素 → false（浏览器复制粘贴菜单放行）', () => {
    const hit: any = { closest: () => ({ tag: 'input' }) }
    const miss: any = { closest: () => null }
    expect(isEditableContextTarget(hit)).toBe(true)
    expect(isEditableContextTarget(miss)).toBe(false)
    expect(isEditableContextTarget(null)).toBe(false)
    expect(isEditableContextTarget({})).toBe(false) // 无 closest 方法不炸
  })
})

describe('contextMenus.hasUserTextSelection', () => {
  const inside: any = { tag: 'in' }
  const root: any = { contains: (n: any) => n === inside }
  const sel = (over: any): any => ({ isCollapsed: false, anchorNode: over, focusNode: null, toString: () => 'ABC001' })
  it('选区起点在网格内且有文本 → true（右键放行浏览器复制菜单）', () => {
    expect(hasUserTextSelection(root, sel(inside))).toBe(true)
  })
  it('选区在网格外/收起/空文本/无选区/无根节点 → false', () => {
    expect(hasUserTextSelection(root, sel({ tag: 'outside' }))).toBe(false)
    expect(hasUserTextSelection(root, { isCollapsed: true, anchorNode: inside, toString: () => 'x' })).toBe(false)
    expect(hasUserTextSelection(root, { isCollapsed: false, anchorNode: inside, toString: () => '' })).toBe(false)
    expect(hasUserTextSelection(root, null)).toBe(false)
    expect(hasUserTextSelection(null, sel(inside))).toBe(false)
  })
  it('终点（focusNode）在网格内也算命中', () => {
    expect(hasUserTextSelection(root, { isCollapsed: false, anchorNode: null, focusNode: inside, toString: () => 'x' })).toBe(true)
  })
})
