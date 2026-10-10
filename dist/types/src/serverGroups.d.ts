import type { RjRowData } from './types';
import type { RjDisplayRow } from './useRowModel';
/** 某组的懒取子项状态（由行模型持有，避免在纯函数里发请求） */
export interface SgChildState {
    /** 已取回的子项平铺序列（空数组 = 后端确认无子行；与「取数失败」不同一状态） */
    kids?: RjRowData[];
    /** 正在取 */
    loading?: boolean;
    /** 本代取数连续失败到上限：不再渲染子行、也不再登记请求（重取数/改分组/清缓存后自然恢复） */
    error?: boolean;
}
/** 组元信息（按 path 索引，供子块取数参数复用，免去反解 path） */
export interface SgGroupMeta {
    level: number;
    /** 该层级的分组字段 */
    field: string;
    /** 从根到本组的组值路径 */
    values: any[];
}
/** 待取子块的组 */
export interface SgNeedLoad extends SgGroupMeta {
    path: string;
}
export interface SgFlattenOptions {
    /** 分组字段，按层级顺序（与后端 __level 对应） */
    fields: string[];
    /** 行主键 */
    keyOf: (row: RjRowData) => string | number;
    rowHeight: number;
    /** 被收起的组 path（默认全部展开，与后端已内联返回子行的观感一致） */
    collapsed?: Set<string>;
    /** path → 懒取子项状态 */
    childMap?: Map<string, SgChildState>;
    /** 宿主判定某组行是否可展开（对应 isServerSideGroup）；缺省时按「有子行就可展开」推断 */
    isExpandable?: (row: RjRowData) => boolean;
}
export interface SgFlattenResult {
    rows: RjDisplayRow[];
    /** 需要发起 type:'group' 子块请求的组（调用方去重后取数，回填 childMap） */
    needLoad: SgNeedLoad[];
    /** 本次出现过的全部组（path → 元信息） */
    metas: Map<string, SgGroupMeta>;
    /** 与 rows 等长：显示下标 → 输入序列绝对下标（-1 = 非输入序列行，如懒取子行/组占位） */
    absAt: number[];
}
/**
 * 补齐组行契约字段（__path/__level/__groupField/__groupValue/__groupLabels）。
 * 后端给全就原样返回；缺则浅拷贝补齐，不修改源对象。
 */
export declare function decorateGroupRow(row: RjRowData, path: string, level: number, field: string, value: any, labels: any[]): RjRowData;
/** 平铺（可含未加载空洞）→ 显示行序列 + 待取子块 + 下标映射 */
export declare function flattenServerGroups(items: (RjRowData | undefined)[], opts: SgFlattenOptions): SgFlattenResult;
