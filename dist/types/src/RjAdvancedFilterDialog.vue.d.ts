import { type AdvFilterGroup } from './filtering';
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    model: AdvFilterGroup | null;
    columns: {
        colId: string;
        title: string;
        filterType: string;
    }[];
    x: number;
    y: number;
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    apply: (model: AdvFilterGroup) => void;
    clear: () => void;
    close: () => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    model: AdvFilterGroup | null;
    columns: {
        colId: string;
        title: string;
        filterType: string;
    }[];
    x: number;
    y: number;
}>>> & Readonly<{
    onClear?: (() => any) | undefined;
    onApply?: ((model: AdvFilterGroup) => any) | undefined;
    onClose?: (() => any) | undefined;
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
