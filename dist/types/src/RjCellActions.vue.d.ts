import type { RjCellAction, RjCellParams } from './types';
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    actions: RjCellAction[];
    params: RjCellParams;
    /** 列宽（px）：决定能放下几个按钮 */
    width: number;
    /** 列级默认描边（默认 true） */
    border?: boolean | undefined;
    /** 按钮间距（px，默认 4） */
    gap?: number | undefined;
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    actions: RjCellAction[];
    params: RjCellParams;
    /** 列宽（px）：决定能放下几个按钮 */
    width: number;
    /** 列级默认描边（默认 true） */
    border?: boolean | undefined;
    /** 按钮间距（px，默认 4） */
    gap?: number | undefined;
}>>> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
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
