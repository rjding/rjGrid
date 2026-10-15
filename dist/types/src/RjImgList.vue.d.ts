declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    urls: string[];
    style: Record<string, string>;
    shape: 'square' | 'rounded' | 'circle';
    lazy: boolean;
    alt: string;
    fallback: string;
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    preview: (url: string) => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    urls: string[];
    style: Record<string, string>;
    shape: 'square' | 'rounded' | 'circle';
    lazy: boolean;
    alt: string;
    fallback: string;
}>>> & Readonly<{
    onPreview?: ((url: string) => any) | undefined;
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
