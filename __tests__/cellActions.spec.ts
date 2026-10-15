import { describe, it, expect } from './harness'
import { computeInlineCount, filterVisibleActions, resolveColActions } from '../src/cellActions'
import type { RjCellAction } from '../src/types'

describe('cellActions.computeInlineCount', () => {
  it('全部放得下 → 返回全部数量，不收进更多', () => {
    // 3 个各 40 宽 + 间距 4*2 = 128 <= 150
    expect(computeInlineCount([40, 40, 40], 30, 4, 150)).toBe(3)
  })
  it('单个或空 → 直接返回，无需更多', () => {
    expect(computeInlineCount([200], 30, 4, 100)).toBe(1)
    expect(computeInlineCount([], 30, 4, 100)).toBe(0)
  })
  it('放不下全部 → 预留“更多”宽+间距，贪心塞入能放的前缀', () => {
    // avail=100, moreW=30, gap=4 → budget=66；按钮各 30：30 + (30+4=34)→64<=66 放2个，再+34=98>66 停
    expect(computeInlineCount([30, 30, 30, 30], 30, 4, 100)).toBe(2)
  })
  it('首个都放不下 → 0（仅显示“更多”）', () => {
    // avail=40, moreW=30, gap=4 → budget=6 < 首个 30
    expect(computeInlineCount([30, 30], 30, 4, 40)).toBe(0)
  })
  it('恰好等于预算 → 计入', () => {
    // budget = 100-30-4 = 66；按钮 [66] 加 0 gap（k=0）→ 66<=66 放1个（但 n>1 才走此路，另一 200 超）
    expect(computeInlineCount([66, 200], 30, 4, 100)).toBe(1)
  })
})

const ctxOf = () => ({}) as any
describe('cellActions.filterVisibleActions', () => {
  it('未写 visible → 默认可见（回归：曾误加取反致全部隐藏）', () => {
    const acts: RjCellAction[] = [{ name: 'edit' }, { name: 'del' }]
    expect(filterVisibleActions(acts, ctxOf).map((a) => a.name)).toEqual(['edit', 'del'])
  })
  it('visible:false 被过滤，visible:true 保留', () => {
    const acts: RjCellAction[] = [
      { name: 'a', visible: true },
      { name: 'b', visible: false }
    ]
    expect(filterVisibleActions(acts, ctxOf).map((a) => a.name)).toEqual(['a'])
  })
  it('visible 为函数 → 按 ctx 求值', () => {
    const acts: RjCellAction[] = [
      { name: 'show', visible: () => true },
      { name: 'hide', visible: () => false }
    ]
    expect(filterVisibleActions(acts, ctxOf).map((a) => a.name)).toEqual(['show'])
  })
  it('混合：只保留可见项且保持原序', () => {
    const acts: RjCellAction[] = [
      { name: 'x' },
      { name: 'y', visible: false },
      { name: 'z', visible: true }
    ]
    expect(filterVisibleActions(acts, ctxOf).map((a) => a.name)).toEqual(['x', 'z'])
  })
})

describe('cellActions.resolveColActions', () => {
  const acts: RjCellAction[] = [{ name: 'edit' }, { name: 'del' }]
  it('数据行（非合成、无插槽接管）→ 原样返回', () => {
    expect(resolveColActions(acts, { overridden: false })).toEqual(acts)
    expect(resolveColActions(acts, { overridden: false, pinned: false })).toEqual(acts)
  })
  it('钉行/合计行（pinned）→ 不渲染按钮（回归：曾误在合计行出操作按钮）', () => {
    expect(resolveColActions(acts, { overridden: false, pinned: true })).toEqual([])
  })
  it('插槽/cellRenderer 已接管 → 不叠加内置按钮', () => {
    expect(resolveColActions(acts, { overridden: true })).toEqual([])
  })
  it('未声明 actions → 空数组', () => {
    expect(resolveColActions(undefined, { overridden: false })).toEqual([])
  })
})
