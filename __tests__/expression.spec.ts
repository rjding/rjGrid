// 表达式服务单测
import { describe, it, expect } from './harness'
import { compileExpression, isExpression, clearExpressionCache } from '../src/expression'

describe('expression.isExpression', () => {
  it('非空字符串为表达式', () => {
    expect(isExpression('data.a + 1')).toBe(true)
  })
  it('空串/空白/非字符串不是表达式', () => {
    expect(isExpression('')).toBe(false)
    expect(isExpression('   ')).toBe(false)
    expect(isExpression(null)).toBe(false)
    expect(isExpression(undefined)).toBe(false)
    expect(isExpression(() => 1)).toBe(false)
  })
})

describe('expression.compileExpression', () => {
  it('算术与字段引用（data/row/node 别名）', () => {
    clearExpressionCache()
    const fn = compileExpression('data.price * data.qty')
    expect(fn ? fn({ data: { price: 3, qty: 4 } }) : null).toBe(12)
    const fn2 = compileExpression('row.a + node.b')
    expect(fn2 ? fn2({ row: { a: 1 }, node: { b: 2 } }) : null).toBe(3)
  })
  it('value 别名与 params 聚合', () => {
    const fn = compileExpression('value * 100')
    expect(fn ? fn({ value: 0.125 }) : null).toBeCloseTo(12.5, 6)
    const fn2 = compileExpression('params.colId')
    expect(fn2 ? fn2({ colId: 'price' } as any) : null).toBe('price')
  })
  it('三元与字符串拼接', () => {
    const fn = compileExpression('data.n > 0 ? "正:" + data.n : "非正"')
    expect(fn ? fn({ data: { n: 5 } }) : null).toBe('正:5')
    expect(fn ? fn({ data: { n: -1 } }) : null).toBe('非正')
  })
  it('编译失败返回 null', () => {
    const fn = compileExpression('data.((bad syntax')
    expect(fn).toBe(null)
  })
  it('运行期异常吞掉返回 undefined', () => {
    const fn = compileExpression('data.missing.deep')
    expect(fn ? fn({ data: {} }) : 'NOFN').toBe(undefined)
  })
  it('缓存：同一表达式复用同一函数实例', () => {
    clearExpressionCache()
    const a = compileExpression('value + 1')
    const b = compileExpression('value + 1')
    expect(a === b).toBe(true)
  })
})
