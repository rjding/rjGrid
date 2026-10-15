export interface ExprScope {
    value?: any;
    data?: any;
    row?: any;
    node?: any;
    colId?: string;
    column?: any;
    [key: string]: any;
}
export type ExprFn = (scope: ExprScope) => any;
/** 是否为字符串表达式（非空字符串） */
export declare function isExpression(v: any): v is string;
/**
 * 编译字符串表达式为取值函数。编译失败返回 null（调用方回退原值）。
 * 注入别名：value/data/row/node/colId/column/params，表达式内可用 `data.price * 100` 或 `params.value`。
 */
export declare function compileExpression(expr: string): ExprFn | null;
/** 清空编译缓存（测试 / 热更新用） */
export declare function clearExpressionCache(): void;
