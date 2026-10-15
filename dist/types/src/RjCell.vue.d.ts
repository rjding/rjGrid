import type { RjFindMatch } from './types';
import type { RjLeafCol } from './useColumnState';
import type { RjDisplayRow } from './useRowModel';
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    leaf: RjLeafCol;
    drow: RjDisplayRow;
    rowIndex: number;
    colIndex: number;
    x: number;
    width: number;
    height: number;
    /** rowSpan 跨行格的提升层级（普通格不传） */
    z?: number | undefined;
    value: any;
    checked?: boolean | undefined;
    indeterminate?: boolean | undefined;
    editing?: boolean | undefined;
    flash?: boolean | undefined;
    /** 脏格：当前值与初始值不一致（编辑未保存），显示角标 */
    dirty?: boolean | undefined;
    treeExpandable?: boolean | undefined;
    hasDetail?: boolean | undefined;
    detailOpen?: boolean | undefined;
    isAnchor?: boolean | undefined;
    isGroupAnchor?: boolean | undefined;
    /** 分组显示模式：singleColumn 时组锚单元格展示完整层级路径 */
    groupDisplay?: "singleColumn" | "multipleColumns" | undefined;
    matches?: RjFindMatch[] | null | undefined;
    activeMatch?: RjFindMatch | null | undefined;
    gridSlots?: Record<string, any> | undefined;
    display: string;
}>>, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "edit-commit": (v: any) => void;
    "edit-cancel": () => void;
    "toggle-check": () => void;
    "toggle-expand": (key: string | number) => void;
    "toggle-detail": (key: string | number) => void;
    "row-drag-start": (ev: PointerEvent) => void;
    "img-preview": (url: string) => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<__VLS_TypePropsToRuntimeProps<{
    leaf: RjLeafCol;
    drow: RjDisplayRow;
    rowIndex: number;
    colIndex: number;
    x: number;
    width: number;
    height: number;
    /** rowSpan 跨行格的提升层级（普通格不传） */
    z?: number | undefined;
    value: any;
    checked?: boolean | undefined;
    indeterminate?: boolean | undefined;
    editing?: boolean | undefined;
    flash?: boolean | undefined;
    /** 脏格：当前值与初始值不一致（编辑未保存），显示角标 */
    dirty?: boolean | undefined;
    treeExpandable?: boolean | undefined;
    hasDetail?: boolean | undefined;
    detailOpen?: boolean | undefined;
    isAnchor?: boolean | undefined;
    isGroupAnchor?: boolean | undefined;
    /** 分组显示模式：singleColumn 时组锚单元格展示完整层级路径 */
    groupDisplay?: "singleColumn" | "multipleColumns" | undefined;
    matches?: RjFindMatch[] | null | undefined;
    activeMatch?: RjFindMatch | null | undefined;
    gridSlots?: Record<string, any> | undefined;
    display: string;
}>>> & Readonly<{
    "onEdit-commit"?: ((v: any) => any) | undefined;
    "onEdit-cancel"?: (() => any) | undefined;
    "onToggle-check"?: (() => any) | undefined;
    "onToggle-expand"?: ((key: string | number) => any) | undefined;
    "onToggle-detail"?: ((key: string | number) => any) | undefined;
    "onRow-drag-start"?: ((ev: PointerEvent) => any) | undefined;
    "onImg-preview"?: ((url: string) => any) | undefined;
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
