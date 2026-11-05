import type { RjFilterModel, RjSortState } from './types';
import type { RjLang } from './locale';
export type RjNlqFilterType = 'text' | 'number' | 'date' | 'select';
/** 参与解析的列描述（由网格从列定义构建） */
export interface RjNlqColumn {
    colId: string;
    field?: string;
    title?: string;
    filterType: RjNlqFilterType;
    /** 额外可识别的别名（不含 title/field） */
    aliases?: string[];
    /** select / 低基数列的候选值，用于把口语值映射到真实值 */
    options?: string[];
    /** options 来自列定义（权威枚举）：此时拒绝候选之外的口语值；数据采样的 options 不拒绝 */
    strictOptions?: boolean;
}
/** 单条解析出的列筛选条件 */
export interface RjNlqClause {
    colId: string;
    field?: string;
    title?: string;
    filterType: RjNlqFilterType;
    op: string;
    value1?: any;
    value2?: any;
    /** 与前一条件是否 OR 连接 */
    or: boolean;
    raw: string;
}
/** 解析结果 */
export interface RjNlqResult {
    ok: boolean;
    /** 空查询 / 无法识别 时的说明键（交由 i18n 展示） */
    message?: 'empty' | 'unrecognized';
    /** 按列聚合后的筛选模型（跨列 AND，与网格既有语义一致） */
    filters: {
        colId: string;
        field?: string;
        title?: string;
        model: RjFilterModel;
    }[];
    sort?: RjSortState;
    /** 排序列展示名（title，供 explainNLQ 本地化回显） */
    sortTitle?: string;
    groupBy?: string;
    groupColId?: string;
    /** 分组列展示名（title，供 explainNLQ 本地化回显） */
    groupTitle?: string;
    limit?: number;
    search?: string;
    clauses: RjNlqClause[];
}
/** 解析自然语言查询 */
export declare function parseNLQ(text: string, columns: RjNlqColumn[]): RjNlqResult;
/**
 * 生成人类可读的解析摘要（供 UI 回显）。传 lang 则随语言本地化：
 * 中文如「数量 > 100 · 按金额 降序 · 前5 · 搜索“轴承”」，英文如「qty > 100 · sort by amount desc · top 5 · search "bolt"」。
 */
export declare function explainNLQ(r: RjNlqResult, lang?: RjLang): string;
