import type { RjImportExtraField } from './types';
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    /** 宿主 importFile 回调进行中：按钮转「导入中…」并禁用，失败时保留弹框以便换文件重试 */
    busy?: boolean | undefined;
    /** 宿主侧失败原因（后台回执文案）：显示在选文件热区下方，重新选文件时由本弹框发 clear-error 请宿主清掉 */
    error?: string | undefined;
    /** 宿主自定义的额外表单字段：本弹框只渲染与收集，不懂其业务含义 */
    fields?: RjImportExtraField[] | undefined;
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    close: () => void;
    template: () => void;
    submit: (file: File, extras: Record<string, unknown>) => void;
    "clear-error": () => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    /** 宿主 importFile 回调进行中：按钮转「导入中…」并禁用，失败时保留弹框以便换文件重试 */
    busy?: boolean | undefined;
    /** 宿主侧失败原因（后台回执文案）：显示在选文件热区下方，重新选文件时由本弹框发 clear-error 请宿主清掉 */
    error?: string | undefined;
    /** 宿主自定义的额外表单字段：本弹框只渲染与收集，不懂其业务含义 */
    fields?: RjImportExtraField[] | undefined;
}>>> & Readonly<{
    onTemplate?: (() => any) | undefined;
    onClose?: (() => any) | undefined;
    onSubmit?: ((file: File, extras: Record<string, unknown>) => any) | undefined;
    "onClear-error"?: (() => any) | undefined;
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
