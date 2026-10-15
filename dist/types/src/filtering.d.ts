import type { RjFilterCondition } from './types';
/** 条件是否为"空条件"（未选择操作符）——空条件不参与判定 */
export declare function isEmptyCondition(c: RjFilterCondition | undefined | null): boolean;
/**
 * 多条件组合判定（对标 AG Grid 单列 andOrConditions）。
 * - 修正旧实现"命中任一即通过"的错误：operator==='and' 需全部非空条件通过；'or' 任一通过即可。
 * - 全部为空条件时返回 true（视为不过滤）。
 * test 由调用方提供（含类型转换 / 值解析）。
 */
export declare function evalConditions(conditions: RjFilterCondition[] | undefined, operator: 'and' | 'or', test: (c: RjFilterCondition) => boolean): boolean;
/** 高级过滤：单个条件（绑定到某列） */
export interface AdvColumnCondition {
    colId: string;
    condition: RjFilterCondition;
    filterType?: string;
}
/** 高级过滤节点：可嵌套 and/or 组（表达式树，对标 AG Grid Advanced Filter） */
export interface AdvFilterGroup {
    operator: 'and' | 'or';
    items: Array<AdvFilterGroup | AdvColumnCondition>;
}
export declare function isAdvGroup(node: AdvFilterGroup | AdvColumnCondition): node is AdvFilterGroup;
/**
 * 求值高级过滤表达式树。testCond 由调用方提供（解析列值 + matchCondition）。
 * 空组 / 无条件视为通过。
 */
export declare function evalAdvancedFilter(node: AdvFilterGroup | null | undefined, testCond: (c: AdvColumnCondition) => boolean): boolean;
/** 统计表达式树里的列条件总数（供状态栏/校验） */
export declare function countAdvConditions(node: AdvFilterGroup | null | undefined): number;
