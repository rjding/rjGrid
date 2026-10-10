// editHistory.ts 纯逻辑单元测试
import { describe, it, expect } from './harness'
import { EditHistory, type EditChange } from '../src/editHistory'

const ch = (f: string, o: any, n: any): EditChange<string> => ({
  target: 'row',
  field: f,
  oldValue: o,
  newValue: n
})

describe('EditHistory 基本栈语义', () => {
  it('初始不可撤销/重做', () => {
    const h = new EditHistory<string>()
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(false)
  })
  it('push 后可 undo，undo 后可 redo', () => {
    const h = new EditHistory<string>()
    h.push([ch('a', 1, 2)])
    expect(h.canUndo()).toBe(true)
    const g = h.undo()
    expect(g && g[0].oldValue).toBe(1)
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(true)
    const r = h.redo()
    expect(r && r[0].newValue).toBe(2)
  })
  it('新 push 清空 redo 栈', () => {
    const h = new EditHistory<string>()
    h.push([ch('a', 1, 2)])
    h.undo()
    expect(h.canRedo()).toBe(true)
    h.push([ch('b', 3, 4)])
    expect(h.canRedo()).toBe(false)
  })
  it('空组不压栈', () => {
    const h = new EditHistory<string>()
    h.push([])
    expect(h.canUndo()).toBe(false)
  })
})

describe('EditHistory 分组与上限', () => {
  it('一组多变更整体进出', () => {
    const h = new EditHistory<string>()
    h.push([ch('a', 1, 2), ch('b', 3, 4)])
    const g = h.undo()
    expect(g && g.length).toBe(2)
    expect(h.undoDepth).toBe(0)
  })
  it('超过上限丢弃最旧', () => {
    const h = new EditHistory<string>(3)
    h.push([ch('a', 0, 1)])
    h.push([ch('b', 0, 1)])
    h.push([ch('c', 0, 1)])
    h.push([ch('d', 0, 1)])
    expect(h.undoDepth).toBe(3)
    // 最旧 a 应已被丢弃，末次为 d
    const g = h.undo()
    expect(g && g[0].field).toBe('d')
  })
  it('setLimit 收缩栈', () => {
    const h = new EditHistory<string>(10)
    h.push([ch('a', 0, 1)])
    h.push([ch('b', 0, 1)])
    h.setLimit(1)
    expect(h.undoDepth).toBe(1)
    const g = h.undo()
    expect(g && g[0].field).toBe('b')
  })
  it('clear 清空两栈', () => {
    const h = new EditHistory<string>()
    h.push([ch('a', 0, 1)])
    h.undo()
    h.clear()
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(false)
  })
})
