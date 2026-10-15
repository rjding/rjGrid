import type { RjPrintOptions } from './types';
export type { RjPrintOptions };
/** 打印列描述（叶子列） */
export interface RjPrintColumn {
    title: string;
    /** 期望宽度（px）；用于 colgroup 按比例分配，缩放适配时可忽略 */
    width?: number;
    align?: 'left' | 'center' | 'right';
}
/** 多级列头单元格：colSpan 之和须等于列数 */
export interface RjPrintHeaderCell {
    title: string;
    colSpan: number;
    /** 跨行（叶子列在多级表头中占据到表头底部），默认 1 */
    rowSpan?: number;
}
/** buildPrintHtml 输入：列 + 可选多级列头 + 纯数据行（不含表头） */
export interface RjPrintInput {
    columns: RjPrintColumn[];
    /** 外层在前，逐层向下；缺省时用 columns.title 作单层表头 */
    headerLevels?: RjPrintHeaderCell[][];
    /** 仅数据行；行内元素按 columns 顺序 */
    matrix: any[][];
    /** 与 matrix 对齐的行样式：0 普通 / 1 分组小计 / 2 总计汇总 */
    rowStyles?: number[];
}
/** 页码文案模板（内置中文兜底；实际取词由调用端经 pageNumberText 注入当前语言） */
export declare const DEFAULT_PAGE_TEXT = "\u7B2C {p} \u9875 / \u5171 {t} \u9875";
/** 构造打印文档 HTML（纯函数，确定性输出） */
export declare function buildPrintHtml(input: RjPrintInput, opts?: RjPrintOptions): string;
/**
 * 打开隐藏 iframe 并调用浏览器打印（打印对话框可「另存为 PDF」）。
 * 返回文档 HTML 长度仅供调用方参考；打印后自动清理 iframe。
 */
export declare function openPrintDialog(html: string): void;
/** 便捷封装：构造 HTML 并立即打印 */
export declare function printHtml(input: RjPrintInput, opts?: RjPrintOptions): void;
