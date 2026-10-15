declare function open(): void;
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    condCount: number;
    colCount: number;
}>>, {
    openNew: typeof open;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    save: (payload: {
        name: string;
    }) => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    condCount: number;
    colCount: number;
}>>> & Readonly<{
    onSave?: ((payload: {
        name: string;
    }) => any) | undefined;
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
