import type { RjColumn, RjColStateItem } from './types';
export interface RjLeafCol {
    col: RjColumn;
    colId: string;
    /** 当前宽度（px） */
    width: number;
    /** 全宽坐标系下的左偏移（仅 normal 区有意义） */
    x: number;
    fixed: 'left' | 'right' | null;
    /** normal 区内的顺序号（列虚拟滚动二分用） */
    idx: number;
}
export interface RjHeaderCell {
    col: RjColumn;
    colId: string;
    colSpan: number;
    rowSpan: number;
    level: number;
    isGroup: boolean;
}
export declare function useColumnState(sourceColumns: () => RjColumn[]): {
    setViewportWidth: (w: number) => void;
    setSuppressVirtual: (v: boolean) => void;
    listLeafColumns: () => RjColumn[];
    listLeafUi: () => {
        col: RjColumn;
        colId: string;
        hidden: boolean;
        pinned: 'left' | 'right' | null;
    }[];
    isColumnHidden: (colId: string) => boolean;
    pinOf: (col: RjColumn) => 'left' | 'right' | null;
    computeLayout: () => {
        leftLeaves: RjLeafCol[];
        normalLeaves: {
            idx: number;
            col: RjColumn<import("./types").RjRowData>;
            colId: string;
            /** 当前宽度（px） */
            width: number;
            /** 全宽坐标系下的左偏移（仅 normal 区有意义） */
            x: number;
            fixed: "left" | "right" | null;
        }[];
        rightLeaves: RjLeafCol[];
        totalWidth: number;
        leftWidth: number;
        rightWidth: number;
        /** 普通区起始 x（用于列虚拟滚动坐标换算） */
        normalStartX: number;
        /** 是否启用列虚拟滚动 */
        virtualCols: boolean;
        allCols: RjColumn<import("./types").RjRowData>[];
    };
    computeHeaderRows: () => {
        rows: RjHeaderCell[][];
        depth: number;
    };
    resize: (colId: string, width: number) => void;
    setAutoWidth: (colId: string, width: number) => void;
    hasSizedWidth: (colId: string) => boolean;
    sizeToFit: () => void;
    clearWidths: () => void;
    moveColumn: (dragId: string, targetId: string) => void;
    togglePin: (colId: string, pin: 'left' | 'right' | null) => void;
    toggleHide: (colId: string, hide?: boolean) => void;
    orderedIds: () => string[];
    getColumnState: () => RjColStateItem[];
    applyColumnState: (items?: RjColStateItem[] | null) => void;
    resetColumnState: () => void;
};
