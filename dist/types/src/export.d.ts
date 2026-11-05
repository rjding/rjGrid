export declare function toCsvText(matrix: any[][]): string;
export declare function downloadCsv(matrix: any[][], fileName: string): void;
export interface XlsxSheet {
    name: string;
    matrix: any[][];
    colWidths?: number[];
    /** 每个样式 id：0 常规 1 表头 2 分组/汇总 3 数字 */
    rowStyles?: number[];
    /** 前多少行为表头（默认 1），用于冻结窗格 */
    headerRows?: number;
}
/** 多 sheet xlsx 工作簿 → Blob */
export declare function buildXlsxWorkbook(sheets: XlsxSheet[]): Blob;
/**
 * 单矩阵 → xlsx Blob（向后兼容）
 */
export declare function buildXlsxBlob(matrix: any[][], colWidths?: number[]): Blob;
export declare function downloadXlsx(matrix: any[][], fileName: string, colWidths?: number[]): void;
export declare function downloadXlsxWorkbook(sheets: XlsxSheet[], fileName: string): void;
export declare function toTsv(matrix: any[][]): string;
/** 解析剪贴板文本（TSV，兼容引号包裹单元格） */
export declare function parseTsv(text: string): string[][];
export declare function writeClipboard(text: string): Promise<boolean>;
export declare function readClipboard(): Promise<string>;
