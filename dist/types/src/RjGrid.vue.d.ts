import './styles/rj-grid.scss';
import type { RjCellParams, RjCellActionCtx, RjColumn, RjDataMode, RjEditorOption, RjExportScopeResolved, RjFilterModel, RjGridState, RjLoadServerParams, RjMenuItem, RjContextMenuItem, RjContextMenuCtx, RjPrintParams, RjRowData, RjServerExportParams, RjSortState, RjTransaction, RjQueryAction, RjQueryFieldDef, RjRowFormConfig, RjSavedView } from './types';
import { type RjDisplayRow } from './useRowModel';
import { type RjThemeParams } from './theme';
import { type RjMessages } from './locale';
import { type RjNlqResult } from './nlq';
import type { AdvFilterGroup } from './filtering';
type RjEventListener = (event: any) => void;
declare function addEventListener(type: string, cb: RjEventListener): () => void;
declare function removeEventListener(type: string, cb: RjEventListener): void;
/** 向总线派发事件；单个监听器抛错不影响其它监听器与表格本身 */
declare function dispatchEvent(type: string, payload?: any): void;
/** 打开内置行编辑弹窗：字段由当前叶子列生成，缺省作用于选中行（rowForm=false 时为空操作） */
declare function openRowForm(rows?: RjRowData[]): void;
/** 打开内置新增弹窗：空白表单（preset 可预置默认值），字段准入优先走 addColumns 钩子 */
declare function openRowFormAdd(preset?: RjRowData): void;
declare function getState(): RjGridState;
declare function setState(s: RjGridState): void;
declare function scrollTo(rowIndex: number, colId?: string): void;
declare const _default: __VLS_WithTemplateSlots<import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    columns: RjColumn<RjRowData>[];
    rows?: RjRowData[] | undefined;
    rowKey?: string | undefined;
    height?: string | number | undefined;
    loading?: boolean | undefined;
    theme?: RjThemeParams | "light" | "dark" | undefined;
    /** 未显式指定主题时，是否自动跟随宿主 <html> 的 dark/light class（element-plus/vben/tailwind 约定）；默认 true */
    detectHostTheme?: boolean | undefined;
    density?: "small" | "medium" | "large" | undefined;
    /** 语言：'zh' | 'en' | 区域标识（内部归一），默认中文 */
    lang?: string | undefined;
    /** 局部文案覆盖（对标 AG Grid localeText）：按 key 覆盖内置目录 */
    localeText?: RjMessages | undefined;
    showToolbar?: boolean | undefined;
    quickFilterEnabled?: boolean | undefined;
    /** 表头下方浮动筛选行（每列即时输入） */
    floatingFilters?: boolean | undefined;
    /** 分组页脚行：每个展开分组底部显示聚合汇总 */
    groupFooter?: boolean | undefined;
    /** 服务端权威分组（仅非 client 模式生效）：分组定义下推后端，客户端不重建组树 */
    serverSideGrouping?: boolean | undefined;
    /** 分组显示模式：singleColumn=单列聚合(各级合并到一列、缩进显示完整路径)；multipleColumns=各级各占一列 */
    groupDisplayType?: "singleColumn" | "multipleColumns" | undefined;
    /** 分组行复选框：选中组=级联选中其下所有数据行，组行本身不计入 selectedRows（AG Grid groupSelectsChildren） */
    groupSelectsChildren?: boolean | undefined;
    toolPanel?: boolean | undefined;
    groupable?: boolean | undefined;
    showGroupPanel?: boolean | undefined;
    chartable?: boolean | undefined;
    exportable?: boolean | undefined;
    /** 工具栏各导出/打印按钮单独显隐（仅在 exportable 为真时生效）；默认全 true，可按需关掉其中任意几个 */
    showPrint?: boolean | undefined;
    showCsv?: boolean | undefined;
    showPdf?: boolean | undefined;
    showExcel?: boolean | undefined;
    colReorder?: boolean | undefined;
    resizable?: boolean | undefined;
    rowSelection?: false | "multiple" | "single" | undefined;
    /** 单击数据行单元格即选中该行（替换式，无需再点复选框）；按住 Ctrl/Shift/Alt 仍走区域选择，复选框保留多选，双击仍编辑。默认 true */
    selectOnCellClick?: boolean | undefined;
    keepSelectionCrossPage?: boolean | undefined;
    editable?: boolean | undefined;
    rangeSelection?: boolean | undefined;
    clipboard?: boolean | undefined;
    contextMenu?: boolean | ((ctx: any) => RjMenuItem[]) | undefined;
    /** 声明式自定义右键菜单（与 col.actions 同风格）：数组或按上下文生成，追加在内置菜单项之后；声明后无需再开 contextMenu */
    contextMenus?: RjContextMenuItem[] | ((ctx: RjContextMenuCtx) => RjContextMenuItem[]) | undefined;
    /** 右键菜单内置「查看该行 JSON」项（命中数据行时显示，配套主题化弹层）；默认开，`:row-json="false"` 关 */
    rowJson?: boolean | undefined;
    rowDraggable?: boolean | undefined;
    stateKey?: string | undefined;
    dataMode?: RjDataMode | undefined;
    loadData?: ((p: RjLoadServerParams) => Promise<{
        list?: any[] | undefined;
        rows?: any[] | undefined;
        total: number;
    }>) | undefined;
    pageSize?: number | undefined;
    /** 分页键显示位置（仅服务端分页模式 dataMode='pagination'+loadData 时出现）：top 工具条右上（与查询同行，查询后即翻页）/ bottom 底栏功能键块左侧 / both 两处 */
    pagerPosition?: "top" | "bottom" | "both" | undefined;
    /** SSRM：块大小（serverSide 模式） */
    ssrmBlockSize?: number | undefined;
    /** SSRM：缓存中最多保留的已加载块数（0=不限） */
    ssrmMaxBlocksInCache?: number | undefined;
    /** SSRM：视口外额外保留块数 */
    ssrmCacheOverflow?: number | undefined;
    /** SSRM：判断某行是否为可展开的服务端分组 */
    isServerSideGroup?: ((data: any) => boolean) | undefined;
    treeData?: boolean | undefined;
    childrenField?: string | undefined;
    parentField?: string | undefined;
    defaultExpandAll?: boolean | undefined;
    showSummary?: boolean | undefined;
    pinnedTopRows?: RjRowData[] | undefined;
    pinnedBottomRows?: RjRowData[] | undefined;
    fullWidthRow?: ((row: RjRowData) => boolean) | undefined;
    detailHeight?: number | undefined;
    fullWidthHeight?: number | undefined;
    getRowClass?: ((params: {
        row: RjRowData;
        rowIndex: number;
    }) => string) | undefined;
    suppressVirtualCols?: boolean | undefined;
    /** 导出/打印的默认数据范围（缺 auto：有选中就导选中）；工具栏菜单里可逐次改选 */
    exportRange?: "auto" | RjExportScopeResolved | undefined;
    /**
     * 后端导出回调（按查询条件出全量数据）：传了才在导出菜单里出现「后端导出」项。
     * 组件不直接跟后端打交道，只把生效列 + 当前查询状态 + 分页快照 + 选中 key 透出去。
     */
    serverExport?: ((params: RjServerExportParams) => void | Promise<void>) | undefined;
    exportFileName?: string | undefined;
    /**
     * 打印 / PDF 单次最大行数护栏：浏览器打印靠把整表排版进隐藏 iframe，
     * 上万行会生成十几 MB HTML 并让主线程卡死（页面假死）。超过此上限只打印前 N 行并提示，
     * 需全量请先筛选 / 用分页 / 走后端导出，或按宿主机器性能调大本值。置 0 或负数则不限。
     */
    printMaxRows?: number | undefined;
    /** 导出取值口径：默认导出「所见即所得」的格式化文本（与屏幕一致、单文件内口径统一）；
     *  置 true 则导出原始类型值，让 Excel 里数字仍是数字（对齐 AG Grid useCellValuesForExports） */
    exportRawValues?: boolean | undefined;
    /** 底部状态栏：显示行数/选区/区域聚合（求和/平均/计数/最小/最大） */
    statusBar?: boolean | undefined;
    /** 状态栏参与的聚合项（仅对含数值的选区列生效） */
    statusAggregations?: ("sum" | "avg" | "min" | "max" | "count")[] | undefined;
    /** 无障碍：网格的 aria-label */
    ariaLabel?: string | undefined;
    /** 开启编辑撤销/重做（Ctrl+Z / Ctrl+Y），对标 AG Grid undoRedoCellEditing */
    undoRedoCellEditing?: boolean | undefined;
    /** 撤销历史步数上限，默认 50 */
    undoRedoCellEditingLimit?: number | undefined;
    /** 复制时附带列标题行（对标 copyHeadersToClipboard） */
    copyHeadersToClipboard?: boolean | undefined;
    /** 粘贴前对剪贴板文本的转换钩子（对标 pasteTransformer） */
    pasteTransformer?: ((text: string) => string) | undefined;
    /** 脏格标记：编辑后与初始值不一致的单元格标脏，供保存工作流（对标 AG Grid dirty cells） */
    markDirtyCells?: boolean | undefined;
    /** 鼠标悬停行高亮跟随（斑马纹之上的动态层），默认开启 */
    rowHover?: boolean | undefined;
    /** 图标覆盖（对标 AG Grid gridOptions.icons）：按语义名替换界面字形 */
    icons?: Partial<import("./icons").RjIcons> | undefined;
    /** 查询条件栏：开启后网格上方出现可增删的「字段 + 运算符 + 值」条件；client 即时过滤 / 服务端透出给 loadData */
    queryable?: boolean | undefined;
    /** 自定义视图：把「查询字段 + 条件 + 列布局 + 排序/分组」存成可命名快照（依赖 stateKey 落本地） */
    viewable?: boolean | undefined;
    /** 查询字段候选覆盖（不传则由列定义推导）；可为枚举列补 options */
    queryFields?: RjQueryFieldDef[] | undefined;
    /** 查询栏「重置」旁的自定义操作按钮（修改/删除…；confirm 走内置确认框） */
    queryActions?: RjQueryAction[] | undefined;
    /** 内置行编辑/新增弹窗：false 关闭 openRowForm/openRowFormAdd 能力；对象可配 title/width/columns 与 addTitle/addColumns */
    rowForm?: boolean | RjRowFormConfig | undefined;
    /** 网格级字典加载器：列上 dict:'x'（或 options:{dict:'x'}）时调用，返回 {label,value}[] 或原始数组（异步可） */
    dictLoader?: ((key: string) => RjEditorOption[] | Promise<RjEditorOption[]>) | undefined;
    /** 网格级命名源加载器：列上 options:{ref:'name'} 时调用，返回接口原始数组（异步可），字段归一交给列上的 labelKey/valueKey/map */
    optionsLoader?: ((name: string) => unknown[] | Promise<unknown[]>) | undefined;
    /** 内置视图（只读，恒排在自建视图前） */
    builtinViews?: RjSavedView[] | undefined;
}>, {
    rows: () => never[];
    height: string;
    detectHostTheme: boolean;
    rowJson: boolean;
    density: string;
    showToolbar: boolean;
    quickFilterEnabled: boolean;
    floatingFilters: boolean;
    groupFooter: boolean;
    serverSideGrouping: boolean;
    groupDisplayType: string;
    groupSelectsChildren: boolean;
    toolPanel: boolean;
    groupable: boolean;
    showGroupPanel: boolean;
    chartable: boolean;
    exportable: boolean;
    showPrint: boolean;
    showCsv: boolean;
    showPdf: boolean;
    showExcel: boolean;
    colReorder: boolean;
    resizable: boolean;
    rowSelection: boolean;
    selectOnCellClick: boolean;
    editable: boolean;
    rangeSelection: boolean;
    clipboard: boolean;
    contextMenu: boolean;
    rowDraggable: boolean;
    dataMode: string;
    pageSize: number;
    pagerPosition: string;
    ssrmBlockSize: number;
    ssrmMaxBlocksInCache: number;
    ssrmCacheOverflow: number;
    childrenField: string;
    parentField: string;
    defaultExpandAll: boolean;
    showSummary: boolean;
    pinnedTopRows: () => never[];
    pinnedBottomRows: () => never[];
    detailHeight: number;
    fullWidthHeight: number;
    exportRange: string;
    statusBar: boolean;
    statusAggregations: () => string[];
    ariaLabel: string;
    undoRedoCellEditing: boolean;
    undoRedoCellEditingLimit: number;
    copyHeadersToClipboard: boolean;
    markDirtyCells: boolean;
    rowHover: boolean;
    printMaxRows: number;
    queryable: boolean;
    viewable: boolean;
    queryFields: () => never[];
    queryActions: () => never[];
    rowForm: boolean;
    builtinViews: () => never[];
}>>, any, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "selection-change": (rows: RjRowData[]) => void;
    "cell-click": (p: RjCellParams, ev: MouseEvent) => void;
    "cell-dblclick": (p: RjCellParams, ev: MouseEvent) => void;
    "cell-action": (p: RjCellActionCtx) => void;
    "context-menu-action": (p: RjContextMenuCtx & {
        item: RjContextMenuItem;
    }) => void;
    "cell-value-changed": (p: {
        row: RjRowData;
        colId: string;
        newValue: any;
        oldValue: any;
    }) => void;
    "cells-changed": (ps: any[]) => void;
    "sort-change": (s: RjSortState[]) => void;
    "filter-change": () => void;
    "row-group-change": (f: string[]) => void;
    "pivot-change": (p: any) => void;
    "page-change": (p: {
        page: number;
        pageSize: number;
    }) => void;
    "view-change": (v: RjSavedView) => void;
    "detail-open": (row: RjRowData) => void;
    "row-drag-end": (p: {
        row: RjRowData;
        from: number;
        to: number;
    }) => void;
    "row-form-submit": (p: {
        rows: RjRowData[];
        changes: Record<string, any>;
        mode: "edit" | "add";
    }) => void;
    "row-form-add": (p: {
        row: RjRowData;
        changes: Record<string, any>;
    }) => void;
    ready: (api: any) => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    columns: RjColumn<RjRowData>[];
    rows?: RjRowData[] | undefined;
    rowKey?: string | undefined;
    height?: string | number | undefined;
    loading?: boolean | undefined;
    theme?: RjThemeParams | "light" | "dark" | undefined;
    /** 未显式指定主题时，是否自动跟随宿主 <html> 的 dark/light class（element-plus/vben/tailwind 约定）；默认 true */
    detectHostTheme?: boolean | undefined;
    density?: "small" | "medium" | "large" | undefined;
    /** 语言：'zh' | 'en' | 区域标识（内部归一），默认中文 */
    lang?: string | undefined;
    /** 局部文案覆盖（对标 AG Grid localeText）：按 key 覆盖内置目录 */
    localeText?: RjMessages | undefined;
    showToolbar?: boolean | undefined;
    quickFilterEnabled?: boolean | undefined;
    /** 表头下方浮动筛选行（每列即时输入） */
    floatingFilters?: boolean | undefined;
    /** 分组页脚行：每个展开分组底部显示聚合汇总 */
    groupFooter?: boolean | undefined;
    /** 服务端权威分组（仅非 client 模式生效）：分组定义下推后端，客户端不重建组树 */
    serverSideGrouping?: boolean | undefined;
    /** 分组显示模式：singleColumn=单列聚合(各级合并到一列、缩进显示完整路径)；multipleColumns=各级各占一列 */
    groupDisplayType?: "singleColumn" | "multipleColumns" | undefined;
    /** 分组行复选框：选中组=级联选中其下所有数据行，组行本身不计入 selectedRows（AG Grid groupSelectsChildren） */
    groupSelectsChildren?: boolean | undefined;
    toolPanel?: boolean | undefined;
    groupable?: boolean | undefined;
    showGroupPanel?: boolean | undefined;
    chartable?: boolean | undefined;
    exportable?: boolean | undefined;
    /** 工具栏各导出/打印按钮单独显隐（仅在 exportable 为真时生效）；默认全 true，可按需关掉其中任意几个 */
    showPrint?: boolean | undefined;
    showCsv?: boolean | undefined;
    showPdf?: boolean | undefined;
    showExcel?: boolean | undefined;
    colReorder?: boolean | undefined;
    resizable?: boolean | undefined;
    rowSelection?: false | "multiple" | "single" | undefined;
    /** 单击数据行单元格即选中该行（替换式，无需再点复选框）；按住 Ctrl/Shift/Alt 仍走区域选择，复选框保留多选，双击仍编辑。默认 true */
    selectOnCellClick?: boolean | undefined;
    keepSelectionCrossPage?: boolean | undefined;
    editable?: boolean | undefined;
    rangeSelection?: boolean | undefined;
    clipboard?: boolean | undefined;
    contextMenu?: boolean | ((ctx: any) => RjMenuItem[]) | undefined;
    /** 声明式自定义右键菜单（与 col.actions 同风格）：数组或按上下文生成，追加在内置菜单项之后；声明后无需再开 contextMenu */
    contextMenus?: RjContextMenuItem[] | ((ctx: RjContextMenuCtx) => RjContextMenuItem[]) | undefined;
    /** 右键菜单内置「查看该行 JSON」项（命中数据行时显示，配套主题化弹层）；默认开，`:row-json="false"` 关 */
    rowJson?: boolean | undefined;
    rowDraggable?: boolean | undefined;
    stateKey?: string | undefined;
    dataMode?: RjDataMode | undefined;
    loadData?: ((p: RjLoadServerParams) => Promise<{
        list?: any[] | undefined;
        rows?: any[] | undefined;
        total: number;
    }>) | undefined;
    pageSize?: number | undefined;
    /** 分页键显示位置（仅服务端分页模式 dataMode='pagination'+loadData 时出现）：top 工具条右上（与查询同行，查询后即翻页）/ bottom 底栏功能键块左侧 / both 两处 */
    pagerPosition?: "top" | "bottom" | "both" | undefined;
    /** SSRM：块大小（serverSide 模式） */
    ssrmBlockSize?: number | undefined;
    /** SSRM：缓存中最多保留的已加载块数（0=不限） */
    ssrmMaxBlocksInCache?: number | undefined;
    /** SSRM：视口外额外保留块数 */
    ssrmCacheOverflow?: number | undefined;
    /** SSRM：判断某行是否为可展开的服务端分组 */
    isServerSideGroup?: ((data: any) => boolean) | undefined;
    treeData?: boolean | undefined;
    childrenField?: string | undefined;
    parentField?: string | undefined;
    defaultExpandAll?: boolean | undefined;
    showSummary?: boolean | undefined;
    pinnedTopRows?: RjRowData[] | undefined;
    pinnedBottomRows?: RjRowData[] | undefined;
    fullWidthRow?: ((row: RjRowData) => boolean) | undefined;
    detailHeight?: number | undefined;
    fullWidthHeight?: number | undefined;
    getRowClass?: ((params: {
        row: RjRowData;
        rowIndex: number;
    }) => string) | undefined;
    suppressVirtualCols?: boolean | undefined;
    /** 导出/打印的默认数据范围（缺 auto：有选中就导选中）；工具栏菜单里可逐次改选 */
    exportRange?: "auto" | RjExportScopeResolved | undefined;
    /**
     * 后端导出回调（按查询条件出全量数据）：传了才在导出菜单里出现「后端导出」项。
     * 组件不直接跟后端打交道，只把生效列 + 当前查询状态 + 分页快照 + 选中 key 透出去。
     */
    serverExport?: ((params: RjServerExportParams) => void | Promise<void>) | undefined;
    exportFileName?: string | undefined;
    /**
     * 打印 / PDF 单次最大行数护栏：浏览器打印靠把整表排版进隐藏 iframe，
     * 上万行会生成十几 MB HTML 并让主线程卡死（页面假死）。超过此上限只打印前 N 行并提示，
     * 需全量请先筛选 / 用分页 / 走后端导出，或按宿主机器性能调大本值。置 0 或负数则不限。
     */
    printMaxRows?: number | undefined;
    /** 导出取值口径：默认导出「所见即所得」的格式化文本（与屏幕一致、单文件内口径统一）；
     *  置 true 则导出原始类型值，让 Excel 里数字仍是数字（对齐 AG Grid useCellValuesForExports） */
    exportRawValues?: boolean | undefined;
    /** 底部状态栏：显示行数/选区/区域聚合（求和/平均/计数/最小/最大） */
    statusBar?: boolean | undefined;
    /** 状态栏参与的聚合项（仅对含数值的选区列生效） */
    statusAggregations?: ("sum" | "avg" | "min" | "max" | "count")[] | undefined;
    /** 无障碍：网格的 aria-label */
    ariaLabel?: string | undefined;
    /** 开启编辑撤销/重做（Ctrl+Z / Ctrl+Y），对标 AG Grid undoRedoCellEditing */
    undoRedoCellEditing?: boolean | undefined;
    /** 撤销历史步数上限，默认 50 */
    undoRedoCellEditingLimit?: number | undefined;
    /** 复制时附带列标题行（对标 copyHeadersToClipboard） */
    copyHeadersToClipboard?: boolean | undefined;
    /** 粘贴前对剪贴板文本的转换钩子（对标 pasteTransformer） */
    pasteTransformer?: ((text: string) => string) | undefined;
    /** 脏格标记：编辑后与初始值不一致的单元格标脏，供保存工作流（对标 AG Grid dirty cells） */
    markDirtyCells?: boolean | undefined;
    /** 鼠标悬停行高亮跟随（斑马纹之上的动态层），默认开启 */
    rowHover?: boolean | undefined;
    /** 图标覆盖（对标 AG Grid gridOptions.icons）：按语义名替换界面字形 */
    icons?: Partial<import("./icons").RjIcons> | undefined;
    /** 查询条件栏：开启后网格上方出现可增删的「字段 + 运算符 + 值」条件；client 即时过滤 / 服务端透出给 loadData */
    queryable?: boolean | undefined;
    /** 自定义视图：把「查询字段 + 条件 + 列布局 + 排序/分组」存成可命名快照（依赖 stateKey 落本地） */
    viewable?: boolean | undefined;
    /** 查询字段候选覆盖（不传则由列定义推导）；可为枚举列补 options */
    queryFields?: RjQueryFieldDef[] | undefined;
    /** 查询栏「重置」旁的自定义操作按钮（修改/删除…；confirm 走内置确认框） */
    queryActions?: RjQueryAction[] | undefined;
    /** 内置行编辑/新增弹窗：false 关闭 openRowForm/openRowFormAdd 能力；对象可配 title/width/columns 与 addTitle/addColumns */
    rowForm?: boolean | RjRowFormConfig | undefined;
    /** 网格级字典加载器：列上 dict:'x'（或 options:{dict:'x'}）时调用，返回 {label,value}[] 或原始数组（异步可） */
    dictLoader?: ((key: string) => RjEditorOption[] | Promise<RjEditorOption[]>) | undefined;
    /** 网格级命名源加载器：列上 options:{ref:'name'} 时调用，返回接口原始数组（异步可），字段归一交给列上的 labelKey/valueKey/map */
    optionsLoader?: ((name: string) => unknown[] | Promise<unknown[]>) | undefined;
    /** 内置视图（只读，恒排在自建视图前） */
    builtinViews?: RjSavedView[] | undefined;
}>, {
    rows: () => never[];
    height: string;
    detectHostTheme: boolean;
    rowJson: boolean;
    density: string;
    showToolbar: boolean;
    quickFilterEnabled: boolean;
    floatingFilters: boolean;
    groupFooter: boolean;
    serverSideGrouping: boolean;
    groupDisplayType: string;
    groupSelectsChildren: boolean;
    toolPanel: boolean;
    groupable: boolean;
    showGroupPanel: boolean;
    chartable: boolean;
    exportable: boolean;
    showPrint: boolean;
    showCsv: boolean;
    showPdf: boolean;
    showExcel: boolean;
    colReorder: boolean;
    resizable: boolean;
    rowSelection: boolean;
    selectOnCellClick: boolean;
    editable: boolean;
    rangeSelection: boolean;
    clipboard: boolean;
    contextMenu: boolean;
    rowDraggable: boolean;
    dataMode: string;
    pageSize: number;
    pagerPosition: string;
    ssrmBlockSize: number;
    ssrmMaxBlocksInCache: number;
    ssrmCacheOverflow: number;
    childrenField: string;
    parentField: string;
    defaultExpandAll: boolean;
    showSummary: boolean;
    pinnedTopRows: () => never[];
    pinnedBottomRows: () => never[];
    detailHeight: number;
    fullWidthHeight: number;
    exportRange: string;
    statusBar: boolean;
    statusAggregations: () => string[];
    ariaLabel: string;
    undoRedoCellEditing: boolean;
    undoRedoCellEditingLimit: number;
    copyHeadersToClipboard: boolean;
    markDirtyCells: boolean;
    rowHover: boolean;
    printMaxRows: number;
    queryable: boolean;
    viewable: boolean;
    queryFields: () => never[];
    queryActions: () => never[];
    rowForm: boolean;
    builtinViews: () => never[];
}>>> & Readonly<{
    "onSelection-change"?: ((rows: RjRowData[]) => any) | undefined;
    "onCell-click"?: ((p: RjCellParams, ev: MouseEvent) => any) | undefined;
    "onCell-dblclick"?: ((p: RjCellParams, ev: MouseEvent) => any) | undefined;
    "onCell-action"?: ((p: RjCellActionCtx) => any) | undefined;
    "onContext-menu-action"?: ((p: RjContextMenuCtx & {
        item: RjContextMenuItem;
    }) => any) | undefined;
    "onCell-value-changed"?: ((p: {
        row: RjRowData;
        colId: string;
        newValue: any;
        oldValue: any;
    }) => any) | undefined;
    "onCells-changed"?: ((ps: any[]) => any) | undefined;
    "onSort-change"?: ((s: RjSortState[]) => any) | undefined;
    "onFilter-change"?: (() => any) | undefined;
    "onRow-group-change"?: ((f: string[]) => any) | undefined;
    "onPivot-change"?: ((p: any) => any) | undefined;
    "onPage-change"?: ((p: {
        page: number;
        pageSize: number;
    }) => any) | undefined;
    "onView-change"?: ((v: RjSavedView) => any) | undefined;
    "onDetail-open"?: ((row: RjRowData) => any) | undefined;
    "onRow-drag-end"?: ((p: {
        row: RjRowData;
        from: number;
        to: number;
    }) => any) | undefined;
    "onRow-form-submit"?: ((p: {
        rows: RjRowData[];
        changes: Record<string, any>;
        mode: "edit" | "add";
    }) => any) | undefined;
    "onRow-form-add"?: ((p: {
        row: RjRowData;
        changes: Record<string, any>;
    }) => any) | undefined;
    onReady?: ((api: any) => any) | undefined;
}>, {
    density: "small" | "medium" | "large";
    ariaLabel: string;
    editable: boolean;
    height: string | number;
    rows: RjRowData[];
    pageSize: number;
    queryFields: RjQueryFieldDef[];
    detectHostTheme: boolean;
    showToolbar: boolean;
    quickFilterEnabled: boolean;
    floatingFilters: boolean;
    groupFooter: boolean;
    serverSideGrouping: boolean;
    groupDisplayType: "singleColumn" | "multipleColumns";
    groupSelectsChildren: boolean;
    toolPanel: boolean;
    groupable: boolean;
    showGroupPanel: boolean;
    chartable: boolean;
    exportable: boolean;
    showPrint: boolean;
    showCsv: boolean;
    showPdf: boolean;
    showExcel: boolean;
    colReorder: boolean;
    resizable: boolean;
    rowSelection: false | "multiple" | "single";
    selectOnCellClick: boolean;
    rangeSelection: boolean;
    clipboard: boolean;
    contextMenu: boolean | ((ctx: any) => RjMenuItem[]);
    rowJson: boolean;
    rowDraggable: boolean;
    dataMode: RjDataMode;
    pagerPosition: "top" | "bottom" | "both";
    ssrmBlockSize: number;
    ssrmMaxBlocksInCache: number;
    ssrmCacheOverflow: number;
    childrenField: string;
    parentField: string;
    defaultExpandAll: boolean;
    showSummary: boolean;
    pinnedTopRows: RjRowData[];
    pinnedBottomRows: RjRowData[];
    detailHeight: number;
    fullWidthHeight: number;
    exportRange: "auto" | RjExportScopeResolved;
    printMaxRows: number;
    statusBar: boolean;
    statusAggregations: ("sum" | "avg" | "min" | "max" | "count")[];
    undoRedoCellEditing: boolean;
    undoRedoCellEditingLimit: number;
    copyHeadersToClipboard: boolean;
    markDirtyCells: boolean;
    rowHover: boolean;
    queryable: boolean;
    viewable: boolean;
    queryActions: RjQueryAction[];
    rowForm: boolean | RjRowFormConfig;
    builtinViews: RjSavedView[];
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>, {
    toolbar?(_: {
        api: {
            getDisplayedRowAtIndex: (i: number) => RjRowData;
            getDisplayedRowsCount: () => number;
            /** 当前虚拟可见行区间 [start, end)（对标 AG Grid getVirtualRowRanges） */
            getVisibleRange: () => {
                start: number;
                end: number;
            };
            applyTransaction: (tx: RjTransaction) => void;
            applyTransactionAsync: (tx: RjTransaction) => Promise<void>;
            refreshServerSide: (params?: {
                purge?: boolean | undefined;
            } | undefined) => void;
            purgeServerSideCache: () => void;
            setRowData: (rows: RjRowData[]) => void;
            updateRow: (row: RjRowData) => void;
            getCellValue: (rowIndex: number, field: string) => any;
            setCellValue: (rowIndex: number, field: string, value: any) => void;
            getSelectedRows: () => RjRowData[];
            getSelectedKeys: () => (string | number)[];
            openRowForm: (rows?: RjRowData[] | undefined) => void;
            openRowFormAdd: (preset?: RjRowData | undefined) => void;
            setRowSelection: (row: RjRowData, selected: boolean) => void;
            selectAll: () => void;
            clearSelection: () => void;
            setSort: (sorts: RjSortState[]) => void;
            setFilterModel: (field: string, model: RjFilterModel | null) => void;
            clearAllFilters: () => void;
            setQuickFilter: (text: string) => void;
            setAdvancedFilter: (model: AdvFilterGroup | null) => void;
            getAdvancedFilter: () => {
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
            } | null;
            openAdvancedFilter: () => void;
            setRowGroup: (fields: string[]) => void;
            /** NLQ/外部设置「取前 N」显示限量（0=不限量）；供重置等场景显式复位 */
            setRowLimit: (n: number) => void;
            expandAll: () => void;
            collapseAll: () => void;
            setPivot: (cols: string[], values: string[]) => void;
            scrollTo: typeof scrollTo;
            startEditing: (rowIndex: number, colId: string) => void;
            stopEditing: () => void;
            undoCellEditing: () => void;
            redoCellEditing: () => void;
            canUndo: () => boolean;
            canRedo: () => boolean;
            isDirty: () => boolean;
            isCellDirty: (rowIndex: number, colId: string) => boolean;
            getDirtyCells: () => {
                row: RjRowData;
                colId: string;
                oldValue: any;
                newValue: any;
            }[];
            getDirtyRows: () => RjRowData[];
            clearDirtyCells: () => void;
            recalculate: (_force?: boolean | undefined) => void;
            setCellFormula: (rowIndex: number, colId: string, formula: string) => void;
            getCellFormula: (rowIndex: number, colId: string) => string | undefined;
            hasFormula: () => boolean;
            getCircularRefs: () => {
                row: number;
                colId: string;
            }[];
            exportData: (params?: (RjPrintParams & {
                type?: "csv" | "excel" | "pdf" | undefined;
            }) | undefined) => void;
            exportCurrentAsCsv: () => void;
            print: (params?: RjPrintParams | undefined) => void;
            getPrintHtml: (params?: RjPrintParams | undefined) => string;
            copySelectedToClipboard: () => void;
            getState: typeof getState;
            setState: typeof setState;
            refresh: () => void;
            refreshCells: () => void;
            getRangeSelection: () => {
                start: {
                    r: number;
                    c: number;
                };
                end: {
                    r: number;
                    c: number;
                };
            } | null;
            clearRangeSelection: () => void;
            getColumns: () => {
                colId: string;
                field: string | undefined;
                title: string | undefined;
            }[];
            isColumnHidden: (colId: string) => boolean;
            setColumnVisible: (colId: string, visible: boolean) => void;
            setColumnPinned: (colId: string, pinned: "left" | "right" | null) => void;
            setColumnWidth: (colId: string, width: number) => void;
            autoSizeColumn: (colId: string) => void;
            autoSizeAll: () => void;
            sizeColumnsToFit: () => void;
            /** 清除宽度覆盖：把列宽还原到列定义/内容自适应默认值（配合 autoSizeAll 做「自适应↔还原」切换） */
            resetColumnWidths: () => void;
            setTheme: (params: RjThemeParams) => void;
            getTheme: () => {
                preset?: "legacy" | "alpine" | "quartz" | "material" | undefined;
                mode?: "light" | "dark" | "auto" | undefined;
                accentColor?: string | undefined;
                backgroundColor?: string | undefined;
                oddRowBackgroundColor?: string | undefined;
                headerBackgroundColor?: string | undefined;
                borderColor?: string | undefined;
                foregroundColor?: string | undefined;
                secondaryForegroundColor?: string | undefined;
                fontSize?: string | number | undefined;
                radius?: string | number | undefined;
                vars?: Record<string, string> | undefined;
            };
            setLang: (lang: string) => void;
            setLocaleText: (patch: RjMessages) => void;
            parseQuery: (text: string) => RjNlqResult;
            applyQuery: (text: string) => RjNlqResult;
            forEachNode: (fn: (data: RjRowData, index: number, drow: RjDisplayRow) => void) => void;
            addEventListener: typeof addEventListener;
            removeEventListener: typeof removeEventListener;
            dispatchEvent: typeof dispatchEvent;
        };
    }): any;
    "query-actions"?(_: {
        api: {
            getDisplayedRowAtIndex: (i: number) => RjRowData;
            getDisplayedRowsCount: () => number;
            /** 当前虚拟可见行区间 [start, end)（对标 AG Grid getVirtualRowRanges） */
            getVisibleRange: () => {
                start: number;
                end: number;
            };
            applyTransaction: (tx: RjTransaction) => void;
            applyTransactionAsync: (tx: RjTransaction) => Promise<void>;
            refreshServerSide: (params?: {
                purge?: boolean | undefined;
            } | undefined) => void;
            purgeServerSideCache: () => void;
            setRowData: (rows: RjRowData[]) => void;
            updateRow: (row: RjRowData) => void;
            getCellValue: (rowIndex: number, field: string) => any;
            setCellValue: (rowIndex: number, field: string, value: any) => void;
            getSelectedRows: () => RjRowData[];
            getSelectedKeys: () => (string | number)[];
            openRowForm: (rows?: RjRowData[] | undefined) => void;
            openRowFormAdd: (preset?: RjRowData | undefined) => void;
            setRowSelection: (row: RjRowData, selected: boolean) => void;
            selectAll: () => void;
            clearSelection: () => void;
            setSort: (sorts: RjSortState[]) => void;
            setFilterModel: (field: string, model: RjFilterModel | null) => void;
            clearAllFilters: () => void;
            setQuickFilter: (text: string) => void;
            setAdvancedFilter: (model: AdvFilterGroup | null) => void;
            getAdvancedFilter: () => {
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
            } | null;
            openAdvancedFilter: () => void;
            setRowGroup: (fields: string[]) => void;
            /** NLQ/外部设置「取前 N」显示限量（0=不限量）；供重置等场景显式复位 */
            setRowLimit: (n: number) => void;
            expandAll: () => void;
            collapseAll: () => void;
            setPivot: (cols: string[], values: string[]) => void;
            scrollTo: typeof scrollTo;
            startEditing: (rowIndex: number, colId: string) => void;
            stopEditing: () => void;
            undoCellEditing: () => void;
            redoCellEditing: () => void;
            canUndo: () => boolean;
            canRedo: () => boolean;
            isDirty: () => boolean;
            isCellDirty: (rowIndex: number, colId: string) => boolean;
            getDirtyCells: () => {
                row: RjRowData;
                colId: string;
                oldValue: any;
                newValue: any;
            }[];
            getDirtyRows: () => RjRowData[];
            clearDirtyCells: () => void;
            recalculate: (_force?: boolean | undefined) => void;
            setCellFormula: (rowIndex: number, colId: string, formula: string) => void;
            getCellFormula: (rowIndex: number, colId: string) => string | undefined;
            hasFormula: () => boolean;
            getCircularRefs: () => {
                row: number;
                colId: string;
            }[];
            exportData: (params?: (RjPrintParams & {
                type?: "csv" | "excel" | "pdf" | undefined;
            }) | undefined) => void;
            exportCurrentAsCsv: () => void;
            print: (params?: RjPrintParams | undefined) => void;
            getPrintHtml: (params?: RjPrintParams | undefined) => string;
            copySelectedToClipboard: () => void;
            getState: typeof getState;
            setState: typeof setState;
            refresh: () => void;
            refreshCells: () => void;
            getRangeSelection: () => {
                start: {
                    r: number;
                    c: number;
                };
                end: {
                    r: number;
                    c: number;
                };
            } | null;
            clearRangeSelection: () => void;
            getColumns: () => {
                colId: string;
                field: string | undefined;
                title: string | undefined;
            }[];
            isColumnHidden: (colId: string) => boolean;
            setColumnVisible: (colId: string, visible: boolean) => void;
            setColumnPinned: (colId: string, pinned: "left" | "right" | null) => void;
            setColumnWidth: (colId: string, width: number) => void;
            autoSizeColumn: (colId: string) => void;
            autoSizeAll: () => void;
            sizeColumnsToFit: () => void;
            /** 清除宽度覆盖：把列宽还原到列定义/内容自适应默认值（配合 autoSizeAll 做「自适应↔还原」切换） */
            resetColumnWidths: () => void;
            setTheme: (params: RjThemeParams) => void;
            getTheme: () => {
                preset?: "legacy" | "alpine" | "quartz" | "material" | undefined;
                mode?: "light" | "dark" | "auto" | undefined;
                accentColor?: string | undefined;
                backgroundColor?: string | undefined;
                oddRowBackgroundColor?: string | undefined;
                headerBackgroundColor?: string | undefined;
                borderColor?: string | undefined;
                foregroundColor?: string | undefined;
                secondaryForegroundColor?: string | undefined;
                fontSize?: string | number | undefined;
                radius?: string | number | undefined;
                vars?: Record<string, string> | undefined;
            };
            setLang: (lang: string) => void;
            setLocaleText: (patch: RjMessages) => void;
            parseQuery: (text: string) => RjNlqResult;
            applyQuery: (text: string) => RjNlqResult;
            forEachNode: (fn: (data: RjRowData, index: number, drow: RjDisplayRow) => void) => void;
            addEventListener: typeof addEventListener;
            removeEventListener: typeof removeEventListener;
            dispatchEvent: typeof dispatchEvent;
        };
        rows: RjRowData[];
        openRowForm: typeof openRowForm;
        openRowFormAdd: typeof openRowFormAdd;
    }): any;
    "row-detail"?(_: {
        row: RjRowData;
        api: {
            getDisplayedRowAtIndex: (i: number) => RjRowData;
            getDisplayedRowsCount: () => number;
            /** 当前虚拟可见行区间 [start, end)（对标 AG Grid getVirtualRowRanges） */
            getVisibleRange: () => {
                start: number;
                end: number;
            };
            applyTransaction: (tx: RjTransaction) => void;
            applyTransactionAsync: (tx: RjTransaction) => Promise<void>;
            refreshServerSide: (params?: {
                purge?: boolean | undefined;
            } | undefined) => void;
            purgeServerSideCache: () => void;
            setRowData: (rows: RjRowData[]) => void;
            updateRow: (row: RjRowData) => void;
            getCellValue: (rowIndex: number, field: string) => any;
            setCellValue: (rowIndex: number, field: string, value: any) => void;
            getSelectedRows: () => RjRowData[];
            getSelectedKeys: () => (string | number)[];
            openRowForm: (rows?: RjRowData[] | undefined) => void;
            openRowFormAdd: (preset?: RjRowData | undefined) => void;
            setRowSelection: (row: RjRowData, selected: boolean) => void;
            selectAll: () => void;
            clearSelection: () => void;
            setSort: (sorts: RjSortState[]) => void;
            setFilterModel: (field: string, model: RjFilterModel | null) => void;
            clearAllFilters: () => void;
            setQuickFilter: (text: string) => void;
            setAdvancedFilter: (model: AdvFilterGroup | null) => void;
            getAdvancedFilter: () => {
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
            } | null;
            openAdvancedFilter: () => void;
            setRowGroup: (fields: string[]) => void;
            /** NLQ/外部设置「取前 N」显示限量（0=不限量）；供重置等场景显式复位 */
            setRowLimit: (n: number) => void;
            expandAll: () => void;
            collapseAll: () => void;
            setPivot: (cols: string[], values: string[]) => void;
            scrollTo: typeof scrollTo;
            startEditing: (rowIndex: number, colId: string) => void;
            stopEditing: () => void;
            undoCellEditing: () => void;
            redoCellEditing: () => void;
            canUndo: () => boolean;
            canRedo: () => boolean;
            isDirty: () => boolean;
            isCellDirty: (rowIndex: number, colId: string) => boolean;
            getDirtyCells: () => {
                row: RjRowData;
                colId: string;
                oldValue: any;
                newValue: any;
            }[];
            getDirtyRows: () => RjRowData[];
            clearDirtyCells: () => void;
            recalculate: (_force?: boolean | undefined) => void;
            setCellFormula: (rowIndex: number, colId: string, formula: string) => void;
            getCellFormula: (rowIndex: number, colId: string) => string | undefined;
            hasFormula: () => boolean;
            getCircularRefs: () => {
                row: number;
                colId: string;
            }[];
            exportData: (params?: (RjPrintParams & {
                type?: "csv" | "excel" | "pdf" | undefined;
            }) | undefined) => void;
            exportCurrentAsCsv: () => void;
            print: (params?: RjPrintParams | undefined) => void;
            getPrintHtml: (params?: RjPrintParams | undefined) => string;
            copySelectedToClipboard: () => void;
            getState: typeof getState;
            setState: typeof setState;
            refresh: () => void;
            refreshCells: () => void;
            getRangeSelection: () => {
                start: {
                    r: number;
                    c: number;
                };
                end: {
                    r: number;
                    c: number;
                };
            } | null;
            clearRangeSelection: () => void;
            getColumns: () => {
                colId: string;
                field: string | undefined;
                title: string | undefined;
            }[];
            isColumnHidden: (colId: string) => boolean;
            setColumnVisible: (colId: string, visible: boolean) => void;
            setColumnPinned: (colId: string, pinned: "left" | "right" | null) => void;
            setColumnWidth: (colId: string, width: number) => void;
            autoSizeColumn: (colId: string) => void;
            autoSizeAll: () => void;
            sizeColumnsToFit: () => void;
            /** 清除宽度覆盖：把列宽还原到列定义/内容自适应默认值（配合 autoSizeAll 做「自适应↔还原」切换） */
            resetColumnWidths: () => void;
            setTheme: (params: RjThemeParams) => void;
            getTheme: () => {
                preset?: "legacy" | "alpine" | "quartz" | "material" | undefined;
                mode?: "light" | "dark" | "auto" | undefined;
                accentColor?: string | undefined;
                backgroundColor?: string | undefined;
                oddRowBackgroundColor?: string | undefined;
                headerBackgroundColor?: string | undefined;
                borderColor?: string | undefined;
                foregroundColor?: string | undefined;
                secondaryForegroundColor?: string | undefined;
                fontSize?: string | number | undefined;
                radius?: string | number | undefined;
                vars?: Record<string, string> | undefined;
            };
            setLang: (lang: string) => void;
            setLocaleText: (patch: RjMessages) => void;
            parseQuery: (text: string) => RjNlqResult;
            applyQuery: (text: string) => RjNlqResult;
            forEachNode: (fn: (data: RjRowData, index: number, drow: RjDisplayRow) => void) => void;
            addEventListener: typeof addEventListener;
            removeEventListener: typeof removeEventListener;
            dispatchEvent: typeof dispatchEvent;
        };
    }): any;
    "full-row"?(_: {
        row: RjRowData;
        api: {
            getDisplayedRowAtIndex: (i: number) => RjRowData;
            getDisplayedRowsCount: () => number;
            /** 当前虚拟可见行区间 [start, end)（对标 AG Grid getVirtualRowRanges） */
            getVisibleRange: () => {
                start: number;
                end: number;
            };
            applyTransaction: (tx: RjTransaction) => void;
            applyTransactionAsync: (tx: RjTransaction) => Promise<void>;
            refreshServerSide: (params?: {
                purge?: boolean | undefined;
            } | undefined) => void;
            purgeServerSideCache: () => void;
            setRowData: (rows: RjRowData[]) => void;
            updateRow: (row: RjRowData) => void;
            getCellValue: (rowIndex: number, field: string) => any;
            setCellValue: (rowIndex: number, field: string, value: any) => void;
            getSelectedRows: () => RjRowData[];
            getSelectedKeys: () => (string | number)[];
            openRowForm: (rows?: RjRowData[] | undefined) => void;
            openRowFormAdd: (preset?: RjRowData | undefined) => void;
            setRowSelection: (row: RjRowData, selected: boolean) => void;
            selectAll: () => void;
            clearSelection: () => void;
            setSort: (sorts: RjSortState[]) => void;
            setFilterModel: (field: string, model: RjFilterModel | null) => void;
            clearAllFilters: () => void;
            setQuickFilter: (text: string) => void;
            setAdvancedFilter: (model: AdvFilterGroup | null) => void;
            getAdvancedFilter: () => {
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
            } | null;
            openAdvancedFilter: () => void;
            setRowGroup: (fields: string[]) => void;
            /** NLQ/外部设置「取前 N」显示限量（0=不限量）；供重置等场景显式复位 */
            setRowLimit: (n: number) => void;
            expandAll: () => void;
            collapseAll: () => void;
            setPivot: (cols: string[], values: string[]) => void;
            scrollTo: typeof scrollTo;
            startEditing: (rowIndex: number, colId: string) => void;
            stopEditing: () => void;
            undoCellEditing: () => void;
            redoCellEditing: () => void;
            canUndo: () => boolean;
            canRedo: () => boolean;
            isDirty: () => boolean;
            isCellDirty: (rowIndex: number, colId: string) => boolean;
            getDirtyCells: () => {
                row: RjRowData;
                colId: string;
                oldValue: any;
                newValue: any;
            }[];
            getDirtyRows: () => RjRowData[];
            clearDirtyCells: () => void;
            recalculate: (_force?: boolean | undefined) => void;
            setCellFormula: (rowIndex: number, colId: string, formula: string) => void;
            getCellFormula: (rowIndex: number, colId: string) => string | undefined;
            hasFormula: () => boolean;
            getCircularRefs: () => {
                row: number;
                colId: string;
            }[];
            exportData: (params?: (RjPrintParams & {
                type?: "csv" | "excel" | "pdf" | undefined;
            }) | undefined) => void;
            exportCurrentAsCsv: () => void;
            print: (params?: RjPrintParams | undefined) => void;
            getPrintHtml: (params?: RjPrintParams | undefined) => string;
            copySelectedToClipboard: () => void;
            getState: typeof getState;
            setState: typeof setState;
            refresh: () => void;
            refreshCells: () => void;
            getRangeSelection: () => {
                start: {
                    r: number;
                    c: number;
                };
                end: {
                    r: number;
                    c: number;
                };
            } | null;
            clearRangeSelection: () => void;
            getColumns: () => {
                colId: string;
                field: string | undefined;
                title: string | undefined;
            }[];
            isColumnHidden: (colId: string) => boolean;
            setColumnVisible: (colId: string, visible: boolean) => void;
            setColumnPinned: (colId: string, pinned: "left" | "right" | null) => void;
            setColumnWidth: (colId: string, width: number) => void;
            autoSizeColumn: (colId: string) => void;
            autoSizeAll: () => void;
            sizeColumnsToFit: () => void;
            /** 清除宽度覆盖：把列宽还原到列定义/内容自适应默认值（配合 autoSizeAll 做「自适应↔还原」切换） */
            resetColumnWidths: () => void;
            setTheme: (params: RjThemeParams) => void;
            getTheme: () => {
                preset?: "legacy" | "alpine" | "quartz" | "material" | undefined;
                mode?: "light" | "dark" | "auto" | undefined;
                accentColor?: string | undefined;
                backgroundColor?: string | undefined;
                oddRowBackgroundColor?: string | undefined;
                headerBackgroundColor?: string | undefined;
                borderColor?: string | undefined;
                foregroundColor?: string | undefined;
                secondaryForegroundColor?: string | undefined;
                fontSize?: string | number | undefined;
                radius?: string | number | undefined;
                vars?: Record<string, string> | undefined;
            };
            setLang: (lang: string) => void;
            setLocaleText: (patch: RjMessages) => void;
            parseQuery: (text: string) => RjNlqResult;
            applyQuery: (text: string) => RjNlqResult;
            forEachNode: (fn: (data: RjRowData, index: number, drow: RjDisplayRow) => void) => void;
            addEventListener: typeof addEventListener;
            removeEventListener: typeof removeEventListener;
            dispatchEvent: typeof dispatchEvent;
        };
    }): any;
    loading?(_: {}): any;
    empty?(_: {}): any;
}>;
export default _default;
type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
type __VLS_TypePropsToRuntimeProps<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? {
        type: import('vue').PropType<__VLS_NonUndefinedable<T[K]>>;
    } : {
        type: import('vue').PropType<T[K]>;
        required: true;
    };
};
type __VLS_WithDefaults<P, D> = {
    [K in keyof Pick<P, keyof P>]: K extends keyof D ? __VLS_Prettify<P[K] & {
        default: D[K];
    }> : P[K];
};
type __VLS_Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
type __VLS_WithTemplateSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
