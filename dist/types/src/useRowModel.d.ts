import type { RjColumn, RjDataMode, RjFilterModel, RjLoadServerParams, RjRowData, RjSortState, RjTransaction, RjQueryCondition } from './types';
import { type AdvFilterGroup } from './filtering';
import { SsrmStore, SsrmTxBatcher } from './ssrm';
import { type SgNeedLoad } from './serverGroups';
/** 虚拟行类型 */
export interface RjDisplayRow {
    key: string | number;
    type: 'row' | 'group' | 'detail' | 'fullwidth';
    data: RjRowData;
    level: number;
    parentKey?: string | number;
    expanded?: boolean;
    height: number;
    /** group 行附加信息 */
    groupField?: string;
    groupValue?: any;
    groupCount?: number;
    /** 服务端权威分组：该组行是否可展开（false 时不显示三角；缺省视为可展开） */
    expandable?: boolean;
    /** 分组页脚行（复用 group 类型，但展示于组底部） */
    isFooter?: boolean;
    /** 合成行（合计行 / 顶部与底部钉行）：不参与行拖拽排序 */
    noDrag?: boolean;
    /** 钉行/合计行等合成行：非真实数据行，不渲染 col.actions 操作按钮 */
    pinned?: boolean;
}
export declare function rowKeyOf(row: RjRowData, keyField?: string): string | number;
export declare const FILTER_OPS: Record<string, {
    label: string;
    labelKey: string;
    value: string;
    v2?: boolean;
}[]>;
declare function filterTypeOf(col: RjColumn): string;
/** 浮动筛选行文本匹配：text 包含；number 支持 >=/>/<=/</=/~/.. 区间；date 同理；select 逗号枚举 */
export declare function matchFloatFilter(cellVal: any, raw: string, type: string): boolean;
/** 单元格原始值（编辑/导出/排序/过滤统一入口；优先返回公式计算结果） */
export declare function cellRawValue(col: RjColumn, row: RjRowData): any;
/**
 * 透视度量列判定。生成组合列（buildPivotCols）与聚合取值（buildPivotRows）必须共用这一条
 * 判定，否则表头里存在的组合列在行 __agg 中找不到键。
 */
export declare function isPivotValueCol(c: RjColumn): boolean;
/** 透视度量列的稳定指标键：只有 colId 没有 field 的表达式列也要能唯一编码进组合列 id */
export declare function pivotValueKey(c: RjColumn): string;
export interface RowModelOptions {
    rowKey: () => string | undefined;
    rowHeight: () => number;
    detailHeight: () => number;
    fullWidthHeight: () => number;
    hasDetailSlot: () => boolean;
    /** 是否启用分组页脚行 */
    groupFooter?: () => boolean;
    /**
     * 组行显示标签的取法（客户端分组专用）：用被分组列的 formatter 把组值转成显示文本。
     * 不给就原样用原始值。只影响 __groupLabels 的显示，__groupValue/组键/组 path 仍为原始值。
     */
    groupLabelOf?: (col: RjColumn | undefined, value: any, row: RjRowData) => any;
    /** 服务端权威分组：分组/聚合由后端完成，客户端不重建组树 */
    serverGrouping?: () => boolean;
    /** SSRM：判定某行是否为可展开的服务端分组行（缺省按组行有子行即可展开） */
    isServerSideGroup?: (data: RjRowData) => boolean;
    isFullWidthRow: (row: RjRowData) => boolean;
    loadData?: (params: RjLoadServerParams) => Promise<{
        list?: any[];
        rows?: any[];
        total: number;
    }>;
    dataMode: () => RjDataMode;
    pageSize: () => number;
    treeData: () => boolean;
    childrenField: () => string;
    parentField: () => string;
    /** SSRM：每块行数（serverSide 模式） */
    ssrmBlockSize?: () => number;
    /** SSRM：缓存中最多保留的已加载块数 */
    ssrmMaxBlocks?: () => number;
    /** SSRM：视口外额外保留块数 */
    ssrmOverflow?: () => number;
    /** 公式：有序叶子列（按可见顺序，A/B/C 字母按索引映射），由主组件注入 */
    formulaColumns?: () => RjColumn[];
    /** 公式：单元格级公式表，key=`${rowKey}::${colId}` → 公式文本 */
    cellFormulas?: () => Map<string, string>;
    /** 引擎生成列/行的文案（透视总计等），由主组件按当前语言注入；缺省回落中文 */
    labels?: () => {
        total: string;
        grandTotal: string;
        totalOf: (title: string) => string;
    };
}
/**
 * 服务端加载上下文：loadData 透出的排序 / 过滤 / 分组 / 查询条件快照。
 * 声明在模块层并导出：useRowModel 的返回值携带 setLoadCtx，留在函数体内会让生成的
 * .d.ts 出现 TS4060（private name），发布类型声明就断了。
 */
export interface LoadCtx {
    sort: RjSortState[];
    filters: {
        field: string;
        model: RjFilterModel;
    }[];
    quickFilterText: string;
    floatFilters?: {
        colId: string;
        value: string;
    }[];
    rowGroup?: {
        field: string;
        aggFunc?: string;
    }[];
    advancedFilter?: AdvFilterGroup | null;
    queryConditions?: RjQueryCondition[];
}
export declare function useRowModel(userRows: () => RjRowData[], opts: RowModelOptions): {
    rev: import("vue").Ref<number, number>;
    quickFilter: import("vue").Ref<string, string>;
    filterModels: import("vue").Reactive<Map<string, RjFilterModel>>;
    floatFilters: import("vue").Reactive<Map<string, string>>;
    advancedFilter: import("vue").Ref<{
        operator: "or" | "and";
        items: (any | {
            colId: string;
            condition: {
                op: string;
                value1?: any;
                value2?: any;
            };
            filterType?: string | undefined;
        })[];
    } | null, AdvFilterGroup | {
        operator: "or" | "and";
        items: (any | {
            colId: string;
            condition: {
                op: string;
                value1?: any;
                value2?: any;
            };
            filterType?: string | undefined;
        })[];
    } | null>;
    queryConditions: import("vue").Ref<{
        field: string;
        operator: import("./types").RjQueryOperator;
        value?: any;
        value1?: any;
        value2?: any;
        valueText?: string | undefined;
    }[], RjQueryCondition[] | {
        field: string;
        operator: import("./types").RjQueryOperator;
        value?: any;
        value1?: any;
        value2?: any;
        valueText?: string | undefined;
    }[]>;
    sortStates: import("vue").Ref<{
        field: string;
        dir: "desc" | "asc";
    }[], RjSortState[] | {
        field: string;
        dir: "desc" | "asc";
    }[]>;
    rowGroupFields: import("vue").Ref<string[], string[]>;
    rowLimit: import("vue").Ref<number, number>;
    pivotState: import("vue").Ref<{
        cols: string[];
        values: string[];
        active: boolean;
    }, {
        cols: string[];
        values: string[];
        active: boolean;
    } | {
        cols: string[];
        values: string[];
        active: boolean;
    }>;
    expandedGroups: import("vue").Ref<Set<string> & Omit<Set<string>, keyof Set<any>>, Set<string> | (Set<string> & Omit<Set<string>, keyof Set<any>>)>;
    expandedTree: import("vue").Ref<Set<string> & Omit<Set<string>, keyof Set<any>>, Set<string> | (Set<string> & Omit<Set<string>, keyof Set<any>>)>;
    expandedDetails: import("vue").Ref<Set<string | number> & Omit<Set<string | number>, keyof Set<any>>, Set<string | number> | (Set<string | number> & Omit<Set<string | number>, keyof Set<any>>)>;
    serverGroupCollapsed: import("vue").Ref<Set<string> & Omit<Set<string>, keyof Set<any>>, Set<string> | (Set<string> & Omit<Set<string>, keyof Set<any>>)>;
    defaultExpandAll: import("vue").Ref<boolean, boolean>;
    flashRows: import("vue").Ref<Set<string | number> & Omit<Set<string | number>, keyof Set<any>>, Set<string | number> | (Set<string | number> & Omit<Set<string | number>, keyof Set<any>>)>;
    processed: import("vue").ComputedRef<{
        displayRows: RjDisplayRow[];
        filteredCount: number;
    }>;
    offsets: import("vue").ComputedRef<number[]>;
    totalHeight: import("vue").ComputedRef<number>;
    summaryRow: import("vue").ComputedRef<RjRowData | null>;
    pivotCols: (allCols: RjColumn[]) => RjColumn[];
    setPipelineColumns: (cols: RjColumn[]) => void;
    sourceRows: () => RjRowData[];
    applyTransaction: (tx: RjTransaction) => void;
    setRowValue: (row: RjRowData, col: RjColumn, value: any) => boolean;
    setRowData: (rows: RjRowData[]) => void;
    touch: () => void;
    touchOrder: () => void;
    expandGroup: (path: string, expand: boolean) => void;
    toggleTree: (key: string) => void;
    toggleDetail: (key: string | number) => void;
    expandAll: () => void;
    collapseAll: () => void;
    isServerGroupView: () => boolean;
    setServerGroupCollapsed: (path: string, isCollapsed: boolean) => void;
    resetServerGroupView: (clearCollapsed?: boolean) => void;
    loadServerGroupChildren: (info: SgNeedLoad) => Promise<void>;
    filterTypeOf: typeof filterTypeOf;
    comparatorOf: (col: RjColumn | undefined, dir: 'asc' | 'desc') => (a: RjRowData, b: RjRowData) => number;
    serverRows: import("vue").Ref<RjRowData[], RjRowData[]>;
    serverTotal: import("vue").Ref<number, number>;
    serverLoading: import("vue").Ref<boolean, boolean>;
    loadingMore: import("vue").Ref<boolean, boolean>;
    fetchMore: () => void;
    fetchPage: (page: number, size: number) => Promise<void>;
    reloadServer: () => void;
    setLoadCtx: (ctx: LoadCtx) => void;
    allServerLoaded: () => boolean;
    firstExpansionDone: import("vue").Ref<boolean, boolean>;
    ssrmStore: () => SsrmStore;
    ensureServerBlocks: (first: number, last: number) => Promise<void>;
    refreshServerSide: (purge?: boolean) => Promise<void>;
    purgeServerSideCache: () => void;
    ssrmBatcher: SsrmTxBatcher;
};
export {};
