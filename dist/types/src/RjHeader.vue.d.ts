import type { RjColumn } from './types';
import type { RjLeafCol } from './useColumnState';
export interface HeaderLevelCell {
    col: RjColumn;
    colId: string;
    title?: string;
    x: number;
    width: number;
    isGroup: boolean;
    leafCol?: RjLeafCol;
}
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    levelCells: HeaderLevelCell[][];
    totalWidth: number;
    scrollLeft: number;
    headerRowHeight: number;
    sortStates: {
        field: string;
        dir: string;
    }[];
    activeFilters: string[];
    reorderable?: boolean | undefined;
    gridSlots?: Record<string, any> | undefined;
    allLeaves: RjLeafCol[];
    headerChecked?: boolean | undefined;
    headerIndeterminate?: boolean | undefined;
    /** 浮动筛选行 */
    floating?: boolean | undefined;
    floatValues?: Record<string, string> | undefined;
    filterRowHeight?: number | undefined;
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    sort: (colId: string, field: string | undefined, additive: boolean) => void;
    "open-filter": (cell: HeaderLevelCell, el: MouseEvent) => void;
    "header-menu": (cell: HeaderLevelCell, ev: MouseEvent) => void;
    resize: (colId: string, width: number, done: boolean) => void;
    "col-drop": (dragId: string, targetId: string) => void;
    "col-draggroup": (dragId: string, ev: DragEvent) => void;
    "auto-width": (colId: string) => void;
    "toggle-check-all": () => void;
    "float-filter": (colId: string, value: string) => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    levelCells: HeaderLevelCell[][];
    totalWidth: number;
    scrollLeft: number;
    headerRowHeight: number;
    sortStates: {
        field: string;
        dir: string;
    }[];
    activeFilters: string[];
    reorderable?: boolean | undefined;
    gridSlots?: Record<string, any> | undefined;
    allLeaves: RjLeafCol[];
    headerChecked?: boolean | undefined;
    headerIndeterminate?: boolean | undefined;
    /** 浮动筛选行 */
    floating?: boolean | undefined;
    floatValues?: Record<string, string> | undefined;
    filterRowHeight?: number | undefined;
}>>> & Readonly<{
    onSort?: ((colId: string, field: string | undefined, additive: boolean) => any) | undefined;
    onResize?: ((colId: string, width: number, done: boolean) => any) | undefined;
    "onCol-drop"?: ((dragId: string, targetId: string) => any) | undefined;
    "onOpen-filter"?: ((cell: HeaderLevelCell, el: MouseEvent) => any) | undefined;
    "onHeader-menu"?: ((cell: HeaderLevelCell, ev: MouseEvent) => any) | undefined;
    "onCol-draggroup"?: ((dragId: string, ev: DragEvent) => any) | undefined;
    "onAuto-width"?: ((colId: string) => any) | undefined;
    "onToggle-check-all"?: (() => any) | undefined;
    "onFloat-filter"?: ((colId: string, value: string) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
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
