import type { RjColumn } from './types';
export interface PanelLeaf {
    col: RjColumn;
    colId: string;
    field?: string;
    title?: string;
    hidden: boolean;
    pinned: 'left' | 'right' | null;
    aggFunc?: string;
}
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    leafList: PanelLeaf[];
    /**
     * 候选列（分组维 / 透视维 / 透视值）专用列源：应始终为用户真正声明的列。
     * 透视态下 leafList 会被引擎生成的 __pv* 列顶替，直接拿它做候选，
     * 用户可以把 `__pvrow0:kind` 再勾一次当透视维，把透视结果直接做塌。
     */
    pivotLeafList?: PanelLeaf[] | undefined;
    /**
     * 默认「全部指标」隐式态下引擎真正生效的度量 colId 集。
     * 面板候选按类型列出所有数值列，隐式态却只聚合已声明 aggFunc 的那几项，
     * 不拿这份基线画勾选态，会把未生效项也显示成已勾选。
     */
    pivotValueDefault?: string[] | undefined;
    groupedFields: string[];
    pivot: {
        cols: string[];
        values: string[];
        active: boolean;
    };
    filters?: {
        colId: string;
        kind: 'column' | 'float' | 'advanced';
        title: string;
        text: string;
    }[] | undefined;
    quickFilter?: string | undefined;
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "toggle-hide": (colId: string) => void;
    "toggle-pin": (colId: string, pin: "left" | "right" | null) => void;
    "col-drop": (from: string, to: string) => void;
    "group-add": (field: string) => void;
    "group-remove": (field: string) => void;
    "group-drop": (colId: string) => void;
    "pivot-enable": (v: boolean) => void;
    "pivot-toggle": (which: "values" | "cols", key: string) => void;
    "pivot-drop": (colId: string) => void;
    "set-agg": (field: string, agg: string | undefined) => void;
    "filter-remove": (colId: string, kind: "column" | "advanced" | "float") => void;
    "filters-clear-all": () => void;
    "quick-clear": () => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    leafList: PanelLeaf[];
    /**
     * 候选列（分组维 / 透视维 / 透视值）专用列源：应始终为用户真正声明的列。
     * 透视态下 leafList 会被引擎生成的 __pv* 列顶替，直接拿它做候选，
     * 用户可以把 `__pvrow0:kind` 再勾一次当透视维，把透视结果直接做塌。
     */
    pivotLeafList?: PanelLeaf[] | undefined;
    /**
     * 默认「全部指标」隐式态下引擎真正生效的度量 colId 集。
     * 面板候选按类型列出所有数值列，隐式态却只聚合已声明 aggFunc 的那几项，
     * 不拿这份基线画勾选态，会把未生效项也显示成已勾选。
     */
    pivotValueDefault?: string[] | undefined;
    groupedFields: string[];
    pivot: {
        cols: string[];
        values: string[];
        active: boolean;
    };
    filters?: {
        colId: string;
        kind: 'column' | 'float' | 'advanced';
        title: string;
        text: string;
    }[] | undefined;
    quickFilter?: string | undefined;
}>>> & Readonly<{
    "onCol-drop"?: ((from: string, to: string) => any) | undefined;
    "onToggle-hide"?: ((colId: string) => any) | undefined;
    "onToggle-pin"?: ((colId: string, pin: "left" | "right" | null) => any) | undefined;
    "onGroup-add"?: ((field: string) => any) | undefined;
    "onGroup-remove"?: ((field: string) => any) | undefined;
    "onGroup-drop"?: ((colId: string) => any) | undefined;
    "onPivot-enable"?: ((v: boolean) => any) | undefined;
    "onPivot-toggle"?: ((which: "values" | "cols", key: string) => any) | undefined;
    "onPivot-drop"?: ((colId: string) => any) | undefined;
    "onSet-agg"?: ((field: string, agg: string | undefined) => any) | undefined;
    "onFilter-remove"?: ((colId: string, kind: "column" | "advanced" | "float") => any) | undefined;
    "onFilters-clear-all"?: (() => any) | undefined;
    "onQuick-clear"?: (() => any) | undefined;
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
