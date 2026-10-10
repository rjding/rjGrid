import type { RjColumn, RjEditorOption, RjQueryCondition, RjQueryFieldDef, RjQueryFieldKind, RjQueryOperator } from './types';
/** 由列类型/筛选/编辑器推导查询字段类别 */
export declare function kindOfColumn(col: RjColumn): RjQueryFieldKind;
/** 取列的下拉候选：editor.options（静态）或 filterValueMap（枚举映射） */
export declare function optionsOfColumn(col: RjColumn): RjEditorOption[];
/**
 * 从列定义派生查询字段候选池：
 * - 跳过无 field / 内部列 / 显式 filter:false 的列；
 * - 用 override 覆盖标题、类别或候选（宿主可为枚举列补 options）。
 */
export declare function deriveQueryFields(columns: RjColumn[], override?: RjQueryFieldDef[]): RjQueryFieldDef[];
/**
 * 把统一选项载体（异步解析出的候选）并入查询字段池：仅在该字段自身无候选
 * （editor.options / filterValueMap / override 都缺位）时，用载体候选填充并升级为 select 类别。
 * 向后兼容：已有 options 的字段原样保留；carrier 未命中/为空不动。carrier 以 colIdOf 为键。
 */
export declare function withCarrierOptions(fields: RjQueryFieldDef[], carrier: Map<string, {
    list: RjEditorOption[];
}>): RjQueryFieldDef[];
/** 各类别对应的合理运算符集合 */
export declare function queryOpsOfKind(kind: RjQueryFieldKind): RjQueryOperator[];
/** 新增字段时的默认运算符（取该类别最常用的一项） */
export declare function defaultQueryOperator(kind: RjQueryFieldKind): RjQueryOperator;
/** 条件是否已填值（刚挂字段还没输入的不参与过滤） */
export declare function queryHasValue(c: RjQueryCondition): boolean;
/** 生效（已填值）的条件集合 */
export declare function activeQueryConditions(list: RjQueryCondition[]): RjQueryCondition[];
/**
 * 单元格原始值与单个条件比对（纯函数：调用方负责取值）。
 * 日期类走时间戳、数值类走 Number、其余走字符串宽松比较。
 */
export declare function matchQueryValue(rawValue: any, c: RjQueryCondition, kind?: RjQueryFieldKind): boolean;
/** 行是否通过全部生效条件（AND）；colOf 提供该列定义以决定取值口径与类别 */
export declare function rowPassesQuery(row: RjRowDataLike, conds: RjQueryCondition[], colOf: (field: string) => RjColumn | undefined): boolean;
type RjRowDataLike = Record<string, any>;
export {};
