import type { RjFindMatch, RjRowData } from './types';
import type { RjLeafCol } from './useColumnState';
import type { RjDisplayRow } from './useRowModel';
export interface InteractionCtx {
    /** 全局列序：冻结左 + 普通 + 冻结右（与视觉顺序一致） */
    gridCols: () => RjLeafCol[];
    displayRows: () => RjDisplayRow[];
    offsets: () => number[];
    rowHeight: () => number;
    getCellValue: (row: RjRowData, colIndex: number) => any;
    /**
     * 单元格的「文本」视图：复制/查找用。与 getCellValue 分离——图片列的原始值是
     * data URI / URL 列表，直接写进剪贴板或被查找匹配都会污染结果。
     */
    getCellText?: (row: RjRowData, colIndex: number) => any;
    setCellValue: (row: RjRowData, colId: string, value: any) => void;
    isCellEditable: (row: RjRowData, colIndex: number) => boolean;
    startEdit: (r: number, c: number) => void;
    scrollToCell: (r: number, c: number) => void;
    viewportSize: () => {
        w: number;
        h: number;
    };
    gridLeft: () => number;
    gridTop: () => number;
    onCellsChanged: (changes: {
        row: RjRowData;
        colId: string;
        newValue: any;
        oldValue: any;
    }[]) => void;
    rangeChanged?: (range: RangePos | null) => void;
    /** 复制时是否附带表头行（列标题） */
    copyHeaders?: () => boolean;
    /** 粘贴前对原始剪贴板文本的转换钩子（返回转换后文本） */
    pasteTransformer?: (text: string) => string;
}
export interface CellPos {
    r: number;
    c: number;
}
export interface RangePos {
    start: CellPos;
    end: CellPos;
}
export declare function useInteraction(ctx: InteractionCtx): {
    active: import("vue").Ref<{
        r: number;
        c: number;
    } | null, CellPos | {
        r: number;
        c: number;
    } | null>;
    range: import("vue").Ref<{
        start: {
            r: number;
            c: number;
        };
        end: {
            r: number;
            c: number;
        };
    } | null, RangePos | {
        start: {
            r: number;
            c: number;
        };
        end: {
            r: number;
            c: number;
        };
    } | null>;
    extraRanges: import("vue").Ref<{
        start: {
            r: number;
            c: number;
        };
        end: {
            r: number;
            c: number;
        };
    }[], RangePos[] | {
        start: {
            r: number;
            c: number;
        };
        end: {
            r: number;
            c: number;
        };
    }[]>;
    allRanges: () => RangePos[];
    rangeRectOf: (rp: RangePos) => {
        left: number;
        top: number;
        width: number;
        height: number;
    } | null;
    selectColumn: (colIndex: number, additive?: boolean) => void;
    selectRow: (rowIndex: number, additive?: boolean) => void;
    commitRange: () => void;
    draggingRange: import("vue").Ref<boolean, boolean>;
    draggingFill: import("vue").Ref<boolean, boolean>;
    startFill: () => void;
    rangeRect: import("vue").ComputedRef<{
        left: number;
        top: number;
        width: number;
        height: number;
    } | null>;
    activeRect: import("vue").ComputedRef<{
        left: number;
        top: number;
        width: number;
        height: number;
    } | null>;
    cellFromPoint: (x: number, y: number) => CellPos | null;
    onPointerDown: (pos: CellPos, e: PointerEvent) => void;
    onPointerMove: (pos: CellPos | null, e: PointerEvent) => void;
    onPointerUp: () => void;
    onKeydown: (e: KeyboardEvent, editing: boolean) => boolean;
    onPaste: (e: ClipboardEvent) => boolean;
    editingRef: import("vue").Ref<boolean, boolean>;
    copyRange: (cut?: boolean) => Promise<boolean>;
    pasteFromText: (text: string) => Promise<boolean>;
    rangeMatrix: () => any[][] | null;
    clearSelection: () => void;
    moveActive: (dr: number, dc: number, extend?: boolean) => void;
    findOpen: import("vue").Ref<boolean, boolean>;
    findQuery: import("vue").Ref<string, string>;
    findMatches: import("vue").Ref<{
        rowIndex: number;
        colId: string;
        start: number;
        end: number;
    }[], RjFindMatch[] | {
        rowIndex: number;
        colId: string;
        start: number;
        end: number;
    }[]>;
    findActive: import("vue").Ref<number, number>;
    gotoMatch: (i: number) => void;
    matchOf: (rowIndex: number, colId: string) => RjFindMatch[] | null;
    activeMatchOf: (rowIndex: number, colId: string) => RjFindMatch | null;
    bindScroll: (fn: () => {
        top: number;
        left: number;
    }) => void;
};
