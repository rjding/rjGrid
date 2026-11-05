import type { RjQueryAction, RjQueryCondition, RjQueryFieldDef, RjRowData } from './types';
declare const _default: __VLS_WithTemplateSlots<import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    fields: RjQueryFieldDef[];
    modelValue: RjQueryCondition[];
    /** 重置旁的自定义操作按钮（queryActions prop） */
    actions?: RjQueryAction[] | undefined;
    /** 当前选中行：供按钮禁用态实时求值 */
    selectedRows?: RjRowData[] | undefined;
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (v: RjQueryCondition[]) => void;
    search: () => void;
    reset: () => void;
    "action-click": (a: RjQueryAction) => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    fields: RjQueryFieldDef[];
    modelValue: RjQueryCondition[];
    /** 重置旁的自定义操作按钮（queryActions prop） */
    actions?: RjQueryAction[] | undefined;
    /** 当前选中行：供按钮禁用态实时求值 */
    selectedRows?: RjRowData[] | undefined;
}>>> & Readonly<{
    onSearch?: (() => any) | undefined;
    onReset?: (() => any) | undefined;
    "onUpdate:modelValue"?: ((v: RjQueryCondition[]) => any) | undefined;
    "onAction-click"?: ((a: RjQueryAction) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>, Readonly<{
    actions?: ((props: {
        rows: RjRowData[];
    }) => unknown) | undefined;
}> & {
    actions?: ((props: {
        rows: RjRowData[];
    }) => unknown) | undefined;
}>;
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
type __VLS_WithTemplateSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
