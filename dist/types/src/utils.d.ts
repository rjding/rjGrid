import type { RjAgg, RjAggFunc, RjColumn, RjExportScope, RjExportScopeResolved, RjRowData } from './types';
/** a.b.c 路径取值 */
export declare function getValueByPath(obj: any, path?: string): any;
/** a.b.c 路径写值（沿途对象不存在则忽略） */
export declare function setValueByPath(obj: any, path: string, value: any): boolean;
/** 深拷贝（数据友好型，跳过函数/DOM） */
export declare function cloneValue<T>(v: T): T;
/** 列唯一 id */
export declare function colIdOf(col?: RjColumn | null): string;
/** 收集叶子列（展开多级表头） */
export declare function collectLeaves(cols: RjColumn[]): RjColumn[];
/**
 * 组装公式求值上下文的列清单：当前布局列（可见列 / 透视生成列）在前，
 * 被隐藏的声明列追加在后。
 *
 * 公式引用的是数据字段，不该受列显隐影响：只喂可见列时，
 * `=usedVolume / capacityVolume` 在依赖列隐藏时标识符解析不到，单元格只能降级 #NAME?。
 * 隐藏列必须追加在尾部：A1/B2 这类字母引用按上下文下标映射，
 * 插在中间会让历史单元格公式整体错位。
 * pivot=true 时列源已被引擎生成的 __pv* 列顶替（既有守卫），原样返回不掺声明列。
 */
export declare function formulaColumnContext(shown: RjColumn[], declared: RjColumn[], isHidden: (colId: string) => boolean, pivot?: boolean): RjColumn[];
/** 行集合来源（由主组件按当前状态交进来，本层不做任何副作用） */
export interface RjExportRowSource {
    /** 选中行（含跨页保留） */
    selected: RjRowData[];
    /** 展示行（含分组/页脚，按屏上顺序） */
    display: {
        type: string;
        isFooter?: boolean;
        data: RjRowData;
    }[];
    /** 源数据全集（未过滤/排序） */
    source: RjRowData[];
}
/**
 * auto 落地：有选中就导选中，否则导当前视图；其余档原样返回。
 * 没选中时不得落成 selected，否则用户得到一份只有表头的空文件。
 */
export declare function resolveExportScope(scope: RjExportScope | undefined, selCount: number): RjExportScopeResolved;
/**
 * 范围 → 行集合（CSV / Excel / 打印 / PDF 共用一套判定，不再各写一分支）。
 * withGroups：CSV 与打印把分组行也写进文档（分组的「数据」与「分组」两个口径都在同一张表里）；
 * Excel 有独立「分组」sheet，数据 sheet 只要干细行，故传 false。
 */
export declare function pickExportRows(scope: RjExportScopeResolved, src: RjExportRowSource, withGroups: boolean): RjRowData[];
export declare function uid(prefix?: string): string;
/** 列宽限幅 */
export declare function clampWidth(w: number, col?: RjColumn): number;
/** 字符串的加权显示宽度（全角计 2，半角计 1） */
export declare function textWidthUnits(s: string): number;
export declare function measureColWidth(title: string, texts: string[], opt?: {
    unitW?: number;
    padPx?: number;
    min?: number;
    max?: number;
}): number;
export declare function formatDate(v: any, datetime?: boolean): string;
/**
 * 图片值转可读文本（导出 / 剪贴板 / 拖拽浮影 / tooltip 共用）：
 * 取 URL 文件名，多值用 ", " 连接；data: 内联图无文件名，跳过以免把巨长 URI 写进单元格。
 */
export declare function imageText(value: any): string;
/** 按列预设类型格式化单元格值（导出与默认渲染共用）；布尔列文案由调用端按语言传入 */
export declare function formatByType(col: RjColumn, value: any, boolLabels?: [string, string]): string;
/**
 * 解析用户输入的数字串（会计/货币友好），供数字编辑器提交前统一转换：
 * - 容忍千分位逗号 / 空格 / 下划线、货币符号（¥ $ € £ ₹）、前后正负号
 * - 会计负数括号：`(1,234.50)` → -1234.5
 * - 无法解析（空串、纯符号、乱码）返回 null
 */
export declare function parseNumericInput(raw: any): number | null;
/**
 * 选项打字匹配排序（RichSelect 型前：前缀匹配优先于包含匹配，保持各档原相对顺序）。
 * 空查询原样返回；无任何命中返回空数组（供 UI 显示"无匹配项"）。
 */
export declare function rankOptions<T extends {
    label?: any;
    value?: any;
}>(options: T[], query: string): T[];
/** 智能比较：数字/日期/中文字符串 */
export declare function defaultComparator(a: any, b: any): number;
export declare const AGG_FUNCS: Record<RjAggFunc, (rows: RjRowData[], values: any[]) => any>;
export declare function runAgg(func: RjAgg | undefined, rows: RjRowData[], values: any[]): any;
/** 聚合函数 → 文案 key（由调用端经 t() 取词，保证语言切换时聚合标签同步） */
export declare const AGG_LABELS: Record<RjAggFunc, string>;
/** 二分查找：有序数组 arr 中找第一个 >= target 的下标 */
export declare function lowerBound(arr: number[] | {
    length: number;
    [i: number]: number;
}, target: number, key?: (i: number) => number): number;
/**
 * 行拖拽落位换算：把「被拖行从显示槽 from 移到显示槽 to」换算为
 * 「从源数据数组移除被拖行后，应把被拖行插入的下标」。
 * - rowCount：显示行总数
 * - isData(i)：第 i 个显示行是否为参与重排的数据行（组行 / 页脚行等不计入）
 * - isMoved(i)：第 i 个显示行是否为被拖拽的那一行
 *
 * 落位后被拖行占据显示槽 to：排在它之前的数据行 = 显示下标 < to 的数据行（不含被拖行自身）。
 * 下移（from < to）时，原本位于槽 to 的那一行会因让位上移到 to-1，仍排在被拖行之前，故再 +1；
 * 上移（from > to）时被拖行本就不在 [0, to) 内，无需修正。
 * （行拖拽仅在无排序 / 分组 / 透视 / 树形态下开放，此时槽 to 必为数据行，+1 不会越界。）
 */
export declare function rowMoveInsertIndex(rowCount: number, isData: (i: number) => boolean, isMoved: (i: number) => boolean, from: number, to: number): number;
/**
 * 拖拽整行快照的宽度预算：按列宽顺序累计，达到 maxW 即止（至少保留 1 格），
 * 返回要渲染的单元格数量，使跟手浮影不会宽过视口。cells 为空返回 0。
 */
export declare function ghostCellCount<T extends {
    w: number;
}>(cells: T[], maxW: number): number;
/**
 * 自然语言「取前 N 行」(TopN) 的截断：limit<=0 或非有限数视为不限量，原样返回。
 * limit 落在 (0, len] 时截取前 limit 行；纯函数便于单测，调用点负责响应式。
 */
export declare function applyRowLimit<T>(rows: T[], limit: number): T[];
export declare function throttleRaf<T extends (...args: any[]) => void>(fn: T): T;
export declare function debounce<T extends (...args: any[]) => void>(fn: T, wait?: number): T & {
    cancel: () => void;
};
/** 是否 Mac（Ctrl/Cmd 适配） */
export declare const isMac: () => boolean;
/** 触发下载 */
export declare function downloadBlob(blob: Blob, fileName: string): void;
/** 取元素在容器内的相对坐标 */
export declare function inRect(el: Element | null, rect: DOMRect): {
    x: number;
    y: number;
} | null;
export declare const stop: (e: Event) => void;
