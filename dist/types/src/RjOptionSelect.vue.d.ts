import type { RjEditorOption } from './types';
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    options?: RjEditorOption[] | undefined;
    modelValue?: any;
    multiple?: boolean | undefined;
    placeholder?: string | undefined;
}>, {
    options: () => never[];
    modelValue: undefined;
    multiple: boolean;
    placeholder: string;
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (v: any) => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<{
    options?: RjEditorOption[] | undefined;
    modelValue?: any;
    multiple?: boolean | undefined;
    placeholder?: string | undefined;
}>, {
    options: () => never[];
    modelValue: undefined;
    multiple: boolean;
    placeholder: string;
}>>> & Readonly<{
    "onUpdate:modelValue"?: ((v: any) => any) | undefined;
}>, {
    options: RjEditorOption[];
    placeholder: string;
    modelValue: any;
    multiple: boolean;
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
