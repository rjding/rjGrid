import type { InjectionKey, ComputedRef } from 'vue';
/** 内置图标名（可扩展的语义键） */
export declare const RJ_DEFAULT_ICONS: {
    readonly sortAscending: "▲";
    readonly sortDescending: "▼";
    readonly sortUnSort: "⇅";
    readonly filter: "▼";
    readonly columnMenu: "⋮";
    readonly rowDrag: "⠿";
    readonly menuGeneral: "☰";
    readonly menuFilter: "⏷";
    readonly menuColumns: "▤";
    readonly checked: "✓";
    readonly indeterminate: "–";
    readonly rowGroupOpen: "▾";
    readonly rowGroupClose: "▸";
    readonly expand: "▸";
    readonly collapse: "▾";
    readonly pin: "📌";
    readonly visible: "👁";
    readonly hidden: "🚫";
    readonly remove: "✕";
    /** 浮层/对话框关闭按钮（与 remove 同字形，语义分开便于单独覆盖） */
    readonly close: "✕";
    readonly add: "+";
    readonly submenuRight: "▸";
};
export type RjIconName = keyof typeof RJ_DEFAULT_ICONS;
export type RjIcons = Record<RjIconName, string>;
/** 用户可传入的部分覆盖 */
export type RjIconsOverride = Partial<RjIcons>;
/** 合并默认图标与覆盖（空串/未定义不覆盖）——纯函数 */
export declare function mergeIcons(overrides?: RjIconsOverride): RjIcons;
/** 注入键：网格根 provide，子组件 inject 消费 */
export declare const RJ_ICONS_KEY: InjectionKey<ComputedRef<RjIcons>>;
