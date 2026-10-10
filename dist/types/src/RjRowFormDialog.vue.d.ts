import type { RjFormField } from './rowForm';
import type { RjRowData } from './types';
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    fields: RjFormField[];
    rows: RjRowData[];
    title?: string | undefined;
    width?: number | undefined;
    /** add=新增模式（空白表单）；缺省 edit=编辑模式（预填选中行） */
    mode?: "edit" | "add" | undefined;
}>, {
    width: number;
    mode: string;
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    submit: (changes: Record<string, any>) => void;
    close: () => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    fields: RjFormField[];
    rows: RjRowData[];
    title?: string | undefined;
    width?: number | undefined;
    /** add=新增模式（空白表单）；缺省 edit=编辑模式（预填选中行） */
    mode?: "edit" | "add" | undefined;
}>, {
    width: number;
    mode: string;
}>>> & Readonly<{
    onClose?: (() => any) | undefined;
    onSubmit?: ((changes: Record<string, any>) => any) | undefined;
}>, {
    mode: 'edit' | 'add';
    width: number;
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
