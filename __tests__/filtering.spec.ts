// 过滤内核单测（纯函数）
import { describe, it, expect } from './harness'
import {
  evalConditions,
  isEmptyCondition,
  evalAdvancedFilter,
  isAdvGroup,
  countAdvConditions,
  type AdvFilterGroup,
  type AdvColumnCondition
} from '../src/filtering'

describe('filtering.isEmptyCondition', () => {
  it('op 为空/未定义为空条件', () => {
    expect(isEmptyCondition({ op: '' })).toBe(true)
    expect(isEmptyCondition({ op: null as any })).toBe(true)
    expect(isEmptyCondition(undefined)).toBe(true)
    expect(isEmptyCondition({ op: 'contains', value1: '' })).toBe(false)
  })
})

describe('filtering.evalConditions', () => {
  // test：value1 === 'x' 视为命中
  const test = (c: any) => c.value1 === 'x'
  it('无有效条件（全空）返回 true', () => {
    expect(evalConditions([{ op: '' }], 'and', test)).toBe(true)
    expect(evalConditions([], 'or', test)).toBe(true)
    expect(evalConditions(undefined, 'and', test)).toBe(true)
  })
  it('OR：任一命中即通过', () => {
    expect(
      evalConditions(
        [
          { op: 'eq', value1: 'a' },
          { op: 'eq', value1: 'x' }
        ],
        'or',
        test
      )
    ).toBe(true)
    expect(
      evalConditions(
        [
          { op: 'eq', value1: 'a' },
          { op: 'eq', value1: 'b' }
        ],
        'or',
        test
      )
    ).toBe(false)
  })
  it('AND：需全部命中（修正旧版命中即 break 的缺陷）', () => {
    expect(
      evalConditions(
        [
          { op: 'eq', value1: 'x' },
          { op: 'eq', value1: 'b' }
        ],
        'and',
        test
      )
    ).toBe(false)
    expect(
      evalConditions(
        [
          { op: 'eq', value1: 'x' },
          { op: 'eq', value1: 'x' }
        ],
        'and',
        test
      )
    ).toBe(true)
  })
  it('AND 忽略空条件', () => {
    expect(evalConditions([{ op: 'eq', value1: 'x' }, { op: '' }], 'and', () => true)).toBe(true)
  })
})

describe('filtering.evalAdvancedFilter', () => {
  // 依据 condition.value1 === colId 期望值 判定，简化：命中当 value1 === 'ok'
  const testCond = (c: AdvColumnCondition) => c.condition.value1 === 'ok'
  it('空/无节点返回 true', () => {
    expect(evalAdvancedFilter(null, testCond)).toBe(true)
    expect(evalAdvancedFilter({ operator: 'and', items: [] }, testCond)).toBe(true)
  })
  it('单条件', () => {
    expect(
      evalAdvancedFilter(
        { operator: 'and', items: [{ colId: 'a', condition: { op: 'eq', value1: 'ok' } }] },
        testCond
      )
    ).toBe(true)
  })
  it('AND 组：一真一假为 false', () => {
    const g: AdvFilterGroup = {
      operator: 'and',
      items: [
        { colId: 'a', condition: { op: 'eq', value1: 'ok' } },
        { colId: 'b', condition: { op: 'eq', value1: 'no' } }
      ]
    }
    expect(evalAdvancedFilter(g, testCond)).toBe(false)
  })
  it('OR 组：一真一假为 true', () => {
    const g: AdvFilterGroup = {
      operator: 'or',
      items: [
        { colId: 'a', condition: { op: 'eq', value1: 'ok' } },
        { colId: 'b', condition: { op: 'eq', value1: 'no' } }
      ]
    }
    expect(evalAdvancedFilter(g, testCond)).toBe(true)
  })
  it('嵌套：OR( AND(ok,no), ok ) = true', () => {
    const g: AdvFilterGroup = {
      operator: 'or',
      items: [
        {
          operator: 'and',
          items: [
            { colId: 'a', condition: { op: 'eq', value1: 'ok' } },
            { colId: 'b', condition: { op: 'eq', value1: 'no' } }
          ]
        },
        { colId: 'c', condition: { op: 'eq', value1: 'ok' } }
      ]
    }
    expect(evalAdvancedFilter(g, testCond)).toBe(true)
    expect(countAdvConditions(g)).toBe(3)
    expect(isAdvGroup(g)).toBe(true)
    expect(isAdvGroup({ colId: 'a', condition: { op: 'eq' } })).toBe(false)
  })
})
