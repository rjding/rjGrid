import type { RjColumn, RjFilterModel } from './types';
interface ColMenuItem {
    colId: string;
    title: string;
    hidden: boolean;
    pinned: 'left' | 'right' | null;
}
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    col: RjColumn;
    colId: string;
    x: number;
    y: number;
    canSort?: boolean | undefined;
    canFilter?: boolean | undefined;
    canGroup?: boolean | undefined;
    sortDir?: "desc" | "asc" | null | undefined;
    /** 本列的生效冻结（父级用 colState.pinOf 传入，不是只看用户覆盖，否则列定义 fixed 的列不亮） */
    pinned?: "left" | "right" | null | undefined;
    filterType?: "number" | "text" | "date" | "select" | undefined;
    filterModel?: RjFilterModel | null | undefined;
    uniqueValues?: any[] | undefined;
    columns: ColMenuItem[];
}>, {
    canSort: boolean;
    canFilter: boolean;
    canGroup: boolean;
    sortDir: null;
    pinned: null;
    filterType: string;
    filterModel: null;
    uniqueValues: () => never[];
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    sort: (dir: "desc" | "asc" | null) => void;
    select: () => void;
    autosize: () => void;
    pin: (pos: "left" | "right" | null) => void;
    hide: () => void;
    group: () => void;
    "apply-filter": (model: RjFilterModel) => void;
    "clear-filter": () => void;
    advanced: () => void;
    "toggle-col-hide": (colId: string) => void;
    "toggle-col-pin": (colId: string, pin: "left" | "right" | null) => void;
    "col-drop": (from: string, to: string) => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    col: RjColumn;
    colId: string;
    x: number;
    y: number;
    canSort?: boolean | undefined;
    canFilter?: boolean | undefined;
    canGroup?: boolean | undefined;
    sortDir?: "desc" | "asc" | null | undefined;
    /** 本列的生效冻结（父级用 colState.pinOf 传入，不是只看用户覆盖，否则列定义 fixed 的列不亮） */
    pinned?: "left" | "right" | null | undefined;
    filterType?: "number" | "text" | "date" | "select" | undefined;
    filterModel?: RjFilterModel | null | undefined;
    uniqueValues?: any[] | undefined;
    columns: ColMenuItem[];
}>, {
    canSort: boolean;
    canFilter: boolean;
    canGroup: boolean;
    sortDir: null;
    pinned: null;
    filterType: string;
    filterModel: null;
    uniqueValues: () => never[];
}>>> & Readonly<{
    onAutosize?: (() => any) | undefined;
    onHide?: (() => any) | undefined;
    onPin?: ((pos: "left" | "right" | null) => any) | undefined;
    onSelect?: (() => any) | undefined;
    onSort?: ((dir: "desc" | "asc" | null) => any) | undefined;
    onGroup?: (() => any) | undefined;
    onAdvanced?: (() => any) | undefined;
    "onApply-filter"?: ((model: RjFilterModel) => any) | undefined;
    "onClear-filter"?: (() => any) | undefined;
    "onToggle-col-hide"?: ((colId: string) => any) | undefined;
    "onToggle-col-pin"?: ((colId: string, pin: "left" | "right" | null) => any) | undefined;
    "onCol-drop"?: ((from: string, to: string) => any) | undefined;
}>, {
    filterType: 'text' | 'number' | 'date' | 'select';
    uniqueValues: any[];
    canSort: boolean;
    canFilter: boolean;
    canGroup: boolean;
    sortDir: 'asc' | 'desc' | null;
    pinned: 'left' | 'right' | null;
    filterModel: RjFilterModel | null;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
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
