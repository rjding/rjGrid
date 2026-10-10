import type { RjColumn, RjFilterModel } from './types';
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    column: RjColumn;
    filterType: 'text' | 'number' | 'date' | 'select';
    model: RjFilterModel | null;
    x?: number | undefined;
    y?: number | undefined;
    uniqueValues?: any[] | undefined;
    /** 内联模式：作为列菜单“筛选”页签嵌入，不做绝对定位 */
    inline?: boolean | undefined;
}>, {
    x: number;
    y: number;
    inline: boolean;
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    apply: (model: RjFilterModel) => void;
    clear: () => void;
    advanced: () => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    column: RjColumn;
    filterType: 'text' | 'number' | 'date' | 'select';
    model: RjFilterModel | null;
    x?: number | undefined;
    y?: number | undefined;
    uniqueValues?: any[] | undefined;
    /** 内联模式：作为列菜单“筛选”页签嵌入，不做绝对定位 */
    inline?: boolean | undefined;
}>, {
    x: number;
    y: number;
    inline: boolean;
}>>> & Readonly<{
    onClear?: (() => any) | undefined;
    onApply?: ((model: RjFilterModel) => any) | undefined;
    onAdvanced?: (() => any) | undefined;
}>, {
    x: number;
    y: number;
    inline: boolean;
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
