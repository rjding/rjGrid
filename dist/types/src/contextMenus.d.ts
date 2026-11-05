import type { RjContextMenuCtx, RjContextMenuItem, RjMenuItem } from './types';
/**
 * 将宿主声明的 contextMenus 转为内部菜单项：
 * - visible 缺省=可见（勿再取反，参照 cellActions.filterVisibleActions 的回归教训）
 * - separator 直通；首项/连续/全不可见导致的悬空分隔线会被剪掉
 * - children 递归（一级子菜单）；子项全不可见时父项不再显示展开箭头
 * - 点击统一交给 run（由网格处理 confirm / onClick / 事件派发）
 */
export declare function buildCustomMenuItems(items: RjContextMenuItem[] | undefined, ctx: RjContextMenuCtx, run: (item: RjContextMenuItem, ctx: RjContextMenuCtx) => void): RjMenuItem[];
/**
 * 自定义段（已经 buildCustomMenuItems 转换过的 RjMenuItem）与内置段拼接：
 * 两侧都非空时补一条分隔线，任一为空则原样返回（空菜单不弹由网格侧判 length）。
 */
export declare function joinMenuSections(builtIn: RjMenuItem[], custom: RjMenuItem[]): RjMenuItem[];
/**
 * 右键目标是否在可编辑元素内（单元格编辑器 / 浮动筛选输入框 / 弹层搜索框）：
 * 是则网格不接管菜单，保留浏览器原生复制/粘贴右键菜单。
 * 入参为任意 event.target，非 Element 时返回 false。
 */
export declare function isEditableContextTarget(target: unknown): boolean;
/**
 * 用户是否在网格内选中了文字（准备右键复制）：是则右键不接管，
 * 放行浏览器原生菜单的「复制」——否则选中单元格文本后右键只会弹组件菜单，值拷不出去。
 * 入参：网格根节点 + window.getSelection() 结果；选区起点或终点任一在网格内即算。
 */
export declare function hasUserTextSelection(root: Node | null | undefined, sel: {
    isCollapsed?: boolean;
    anchorNode?: Node | null;
    focusNode?: Node | null;
    toString?: () => string;
} | null): boolean;
