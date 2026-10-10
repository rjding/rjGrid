/**
 * 内置行编辑弹窗的纯逻辑：表单字段推导 + 批量写入 + 按钮禁用求值。
 * 不依赖 DOM / Vue，单测直接驱动（__tests__/rowForm.spec.ts）。
 */
import type { RjColumn, RjEditorConfig, RjEditorOption, RjQueryAction, RjRowData, RjRowFormConfig } from './types';
/** 表单控件类型（由列的 editor/type 归一而来） */
export type RjFormFieldKind = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
/** 单个表单字段：弹窗按此渲染，validator/col 原样带上供提交校验 */
export interface RjFormField {
    field: string;
    colId: string;
    title: string;
    kind: RjFormFieldKind;
    options: RjEditorOption[];
    /** textarea 行数 */
    rows: number;
    validator?: RjEditorConfig['validator'];
    col: RjColumn;
}
/** 列上的 editor 声明归一为配置对象（editor 可为裸类型字符串） */
export declare function normalizeEditor(col: RjColumn): RjEditorConfig | undefined;
/** 控件类型：editor.type 优先，否则由列预设 type 映射；custom 无法进表单，回落文本 */
export declare function formFieldKind(col: RjColumn, editor?: RjEditorConfig): RjFormFieldKind;
/** 由可见叶子列生成表单字段（sampleRows 用于对函数形式的 editor.options 求值） */
export declare function buildFormFields(cols: RjColumn[], cfg: RjRowFormConfig | undefined, sampleRows: RjRowData[]): RjFormField[];
/**
 * 把 { field: value } 批量写入每一行（原地改，配合 applyTransaction({ update }) 使用）。
 * changes 只含弹窗里勾选过的字段，未勾选字段天然不覆盖。
 */
export declare function applyFormChanges(rows: RjRowData[], changes: Record<string, any>): RjRowData[];
/**
 * 新增弹窗提交：由 preset 浅拷 + 表单值组装新行对象（不改动 preset 本身）。
 * 主键/默认值等由宿主在 row-form-add 里补齐后调后端，组件只负责形状。
 */
export declare function createFormRow(preset: RjRowData | undefined, changes: Record<string, any>): RjRowData;
/** 读某行在某字段上的当前值（表单预填用，走 a.b.c 路径） */
export declare function fieldValue(row: RjRowData, field: string): any;
/** 查询栏按钮禁用求值：布尔直通，函数按选中行判定 */
export declare function queryActionDisabled(action: RjQueryAction, rows: RjRowData[]): boolean;
/** 查询栏按钮确认文案求值（无 confirm 返回空串） */
export declare function queryActionConfirm(action: RjQueryAction, rows: RjRowData[]): string;
