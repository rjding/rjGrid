import type { InjectionKey } from 'vue';
import type { RjColumn, RjEditorOption, RjOptionSource } from './types';
/** 列字段归一选项（对象式源携带 map/labelKey/valueKey/childrenKey 时生效） */
interface RjOptionShape {
    map?: (item: any) => RjEditorOption;
    labelKey?: string;
    valueKey?: string;
    childrenKey?: string;
}
/** 网格注入给子组件（RjEditor / RjFilterMenu）的只读访问器 */
export interface RjOptionsAccessor {
    /** 该列解析出的候选；未就绪或未声明时 undefined */
    list: (col: RjColumn) => RjEditorOption[] | undefined;
    /** 该列 value→label；未命中时 undefined */
    label: (col: RjColumn, value: any) => string | undefined;
}
/** 注入键：网格根 provide 访问器，子组件 inject 消费（仿 RJ_LOCALE_KEY / RJ_ICONS_KEY） */
export declare const RJ_OPTIONS_KEY: InjectionKey<RjOptionsAccessor>;
/** 子组件默认访问器（单独使用、未 inject 到时回退，全部返回 undefined 不影响原行为） */
export declare const defaultOptionsAccessor: RjOptionsAccessor;
/**
 * 把任意接口返回归一成 RjEditorOption[]：
 * - map 命中优先（完全自定义）；
 * - 否则按 labelKey/valueKey（或默认字段）取；
 * - childrenKey（默认 'children'）命中数组即保留为 children，递归归一（不再拍平），供下拉按层级渲染。
 */
export declare function normalizeOptions(raw: unknown, shape?: RjOptionShape): RjEditorOption[];
/** 深度优先拍平选项树（丢弃 children 引用），供 value→label 映射 / 枚举候选等需要扁平列表的消费点 */
export declare function flattenOptions(options: RjEditorOption[]): RjEditorOption[];
/**
 * 按搜索词剪枝选项树（大小写不敏 contains）：
 * - 节点自身命中 → 保留该节点及其完整子树（可继续下钻）；
 * - 自身未命中但有后代命中 → 作为祖先路径保留（children 为剪枝后的子集）；
 * - 空查询原样返回。返回全新节点对象，不污染缓存。
 */
export declare function filterOptionTree(options: RjEditorOption[], query: string): RjEditorOption[];
/** 树渲染行：option + 层级深度 + 是否可展开 + 当前是否已展开 */
export interface RjOptionRow {
    option: RjEditorOption;
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
}
/**
 * 按展开集合把（已剪枝的）选项树铺成可渲染的可见行（深度优先）。
 * expanded 以 String(value) 为键；未展开节点的子树不进入可见行。
 */
export declare function flattenTreeForRender(options: RjEditorOption[], expanded: Set<string>): RjOptionRow[];
/** 收集树中所有“有子节点”的 value（String 化），用于默认展开全部 */
export declare function collectParentKeys(options: RjEditorOption[], acc?: Set<string>): Set<string>;
/** 解析选项源所需的网格级加载器 */
export interface RjOptionLoaders {
    dictLoader?: (key: string) => unknown | Promise<unknown>;
    optionsLoader?: (name: string) => unknown | Promise<unknown>;
}
/** 解析一个列的选项源为候选数组（异步；失败静默回落空数组 → 显示原样回落原始值） */
export declare function resolveOptions(source: RjOptionSource | undefined, dict: string | undefined, loaders: RjOptionLoaders): Promise<RjEditorOption[]>;
/**
 * 计算列选项源的缓存键：dict/ref 按 key 归并（两列同字典只加载一次），
 * 静态数组 / 函数按列或函数身份。返回 null 表示该列无选项载体。
 */
export declare function sourceCacheKey(col: RjColumn): string | null;
/** 递归收集声明了 options/dict 的列（含多级表头子列） */
export declare function collectOptionCols(cols: RjColumn[], out?: RjColumn[]): RjColumn[];
export {};
