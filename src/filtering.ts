// rj-grid 过滤内核：纯函数，便于单测；供 useRowModel 与高级过滤器共用
import type { RjFilterCondition } from './types'

/** 条件是否为"空条件"（未选择操作符）——空条件不参与判定 */
export function isEmptyCondition(c: RjFilterCondition | undefined | null): boolean {
  return !c || c.op == null || c.op === ''
}

/**
 * 多条件组合判定（对标 AG Grid 单列 andOrConditions）。
 * - 修正旧实现"命中任一即通过"的错误：operator==='and' 需全部非空条件通过；'or' 任一通过即可。
 * - 全部为空条件时返回 true（视为不过滤）。
 * test 由调用方提供（含类型转换 / 值解析）。
 */
export function evalConditions(
  conditions: RjFilterCondition[] | undefined,
  operator: 'and' | 'or',
  test: (c: RjFilterCondition) => boolean
): boolean {
  const active = (conditions || []).filter((c) => !isEmptyCondition(c))
  if (!active.length) return true
  return operator === 'and' ? active.every(test) : active.some(test)
}

/** 高级过滤：单个条件（绑定到某列） */
export interface AdvColumnCondition {
  colId: string
  condition: RjFilterCondition
  filterType?: string
}

/** 高级过滤节点：可嵌套 and/or 组（表达式树，对标 AG Grid Advanced Filter） */
export interface AdvFilterGroup {
  operator: 'and' | 'or'
  items: Array<AdvFilterGroup | AdvColumnCondition>
}

export function isAdvGroup(node: AdvFilterGroup | AdvColumnCondition): node is AdvFilterGroup {
  return (node as AdvFilterGroup).items !== undefined && 'operator' in node
}

/**
 * 求值高级过滤表达式树。testCond 由调用方提供（解析列值 + matchCondition）。
 * 空组 / 无条件视为通过。
 */
export function evalAdvancedFilter(
  node: AdvFilterGroup | null | undefined,
  testCond: (c: AdvColumnCondition) => boolean
): boolean {
  if (!node || !node.items || !node.items.length) return true
  const results = node.items.map((item) =>
    isAdvGroup(item) ? evalAdvancedFilter(item, testCond) : testCond(item)
  )
  return node.operator === 'and' ? results.every(Boolean) : results.some(Boolean)
}

/** 统计表达式树里的列条件总数（供状态栏/校验） */
export function countAdvConditions(node: AdvFilterGroup | null | undefined): number {
  if (!node || !node.items) return 0
  return node.items.reduce((s, item) => s + (isAdvGroup(item) ? countAdvConditions(item) : 1), 0)
}
