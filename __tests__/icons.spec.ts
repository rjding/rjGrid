// icons.ts 纯函数单元测试
import { describe, it, expect } from './harness'
import { RJ_DEFAULT_ICONS, mergeIcons } from '../src/icons'

describe('icons.mergeIcons', () => {
  it('无覆盖返回默认字形（等值新对象）', () => {
    const r = mergeIcons()
    expect(r).toEqual({ ...RJ_DEFAULT_ICONS })
  })
  it('按语义名覆盖对应字形', () => {
    const r = mergeIcons({ sortAscending: '↑', columnMenu: '⚙' })
    expect(r.sortAscending).toBe('↑')
    expect(r.columnMenu).toBe('⚙')
    expect(r.sortDescending).toBe(RJ_DEFAULT_ICONS.sortDescending)
  })
  it('空串/undefined 不覆盖', () => {
    const r = mergeIcons({ filter: '', expand: undefined })
    expect(r.filter).toBe(RJ_DEFAULT_ICONS.filter)
    expect(r.expand).toBe(RJ_DEFAULT_ICONS.expand)
  })
  it('不改变默认常量对象（纯函数无副作用）', () => {
    const before = RJ_DEFAULT_ICONS.sortUnSort
    mergeIcons({ sortUnSort: 'ZZZ' })
    expect(RJ_DEFAULT_ICONS.sortUnSort).toBe(before)
  })
})
