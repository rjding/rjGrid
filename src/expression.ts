// rj-grid 表达式服务：将字符串表达式编译为取值函数（对齐 AG Grid valueGetter/valueFormatter 表达式）
// 支持通过 data / row / node / value / colId / column / params 等上下文变量引用，编译结果缓存。

export interface ExprScope {
  value?: any
  data?: any
  row?: any
  node?: any
  colId?: string
  column?: any
  [key: string]: any
}

export type ExprFn = (scope: ExprScope) => any

const cache = new Map<string, ExprFn | null>()

/** 是否为字符串表达式（非空字符串） */
export function isExpression(v: any): v is string {
  return typeof v === 'string' && v.trim() !== ''
}

/**
 * 编译字符串表达式为取值函数。编译失败返回 null（调用方回退原值）。
 * 注入别名：value/data/row/node/colId/column/params，表达式内可用 `data.price * 100` 或 `params.value`。
 */
export function compileExpression(expr: string): ExprFn | null {
  if (cache.has(expr)) return cache.get(expr) ?? null
  let fn: ExprFn | null = null
  try {
    // eslint-disable-next-line no-new-func
    const raw = new Function(
      'p',
      'var params=p,value=p&&p.value,data=p&&p.data,row=p&&p.row,node=p&&p.node,colId=p&&p.colId,column=p&&p.column;return (' +
        expr +
        ');'
    ) as (p: ExprScope) => any
    fn = (scope: ExprScope) => {
      try {
        return raw(scope)
      } catch {
        return undefined
      }
    }
  } catch {
    fn = null
  }
  cache.set(expr, fn)
  return fn
}

/** 清空编译缓存（测试 / 热更新用） */
export function clearExpressionCache() {
  cache.clear()
}
