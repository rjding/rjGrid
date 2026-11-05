// 内置行 JSON 查看器的序列化纯函数回归测试
import { describe, it, expect } from './harness'
import { stringifyRowJson } from '../src/rowJson'

describe('rowJson.stringifyRowJson', () => {
  it('普通行 → 2 空格缩进格式化 JSON', () => {
    expect(stringifyRowJson({ id: 1, name: '轴承' })).toBe('{\n  "id": 1,\n  "name": "轴承"\n}')
  })
  it('循环引用 → [Circular] 占位，不抛异常', () => {
    const row: any = { id: 1 }
    row.self = row
    row.nested = { parent: row }
    const out = stringifyRowJson(row)
    expect(out.includes('"[Circular]"')).toBe(true)
    expect(out.includes('"id": 1')).toBe(true)
  })
  it('函数值 → 序列化为源码文本（不被 JSON 静默丢弃）', () => {
    const out = stringifyRowJson({ fn: function hello() {} })
    expect(out.includes('function hello')).toBe(true)
  })
  it('undefined / 原始值行 → 降级字面量文本', () => {
    expect(stringifyRowJson(undefined)).toBe('undefined')
    expect(stringifyRowJson(42)).toBe('42')
    expect(stringifyRowJson('x')).toBe('"x"')
  })
  it('不可序列化值（BigInt）→ 不抛异常，输出字符串', () => {
    const out = stringifyRowJson({ big: 1n })
    expect(typeof out).toBe('string')
    expect(out.length > 0).toBe(true)
  })
  it('嵌套对象/数组正常展开', () => {
    const out = JSON.parse(stringifyRowJson({ a: [1, { b: 2 }], c: null }))
    expect(out.a[1].b).toBe(2)
    expect(out.c).toBe(null)
  })
})
