export type CellValue = number | string | boolean | null | undefined;
export type FormulaValue = number | string | boolean;
/** 求值上下文：列顺序 + 行数 + 取值器（0 基行列） */
export interface FormulaCtx {
    /** 有序列标识（colId 或 field），A/B/C 按索引映射 */
    columns: string[];
    /** 数据行数（用于整列/相对行的边界与 #REF! 判定） */
    rowCount: number;
    /** 读取原始单元格值 */
    getValue: (col: number, row: number) => CellValue;
}
/** 单元格坐标（0 基） */
export interface CellCoord {
    col: number;
    row: number;
}
/** 依赖项：某段列区间内的行范围（whole=true 表示整列跨所有行） */
export interface FormulaDep {
    c1: number;
    c2: number;
    r1: number;
    r2: number;
    whole: boolean;
}
export declare const ERR: {
    readonly REF: "#REF!";
    readonly VALUE: "#VALUE!";
    readonly NAME: "#NAME?";
    readonly DIV0: "#DIV/0!";
    readonly NUM: "#NUM!";
    readonly NA: "#N/A";
    readonly CIRC: "#CIRCULAR!";
};
/** 是否为公式文本（以 = 开头） */
export declare function isFormula(v: any): v is string;
export declare function lettersToCol(s: string): number;
export declare function colToLetters(idx: number): string;
type NumNode = {
    t: 'num';
    v: number;
};
type StrNode = {
    t: 'str';
    v: string;
};
type BoolNode = {
    t: 'bool';
    v: boolean;
};
type RefNode = {
    t: 'ref';
    token: string;
};
type FuncNode = {
    t: 'func';
    name: string;
    args: AstNode[];
};
type BinNode = {
    t: 'bin';
    op: string;
    l: AstNode;
    r: AstNode;
};
type UnNode = {
    t: 'un';
    op: string;
    e: AstNode;
};
type PctNode = {
    t: 'pct';
    e: AstNode;
};
export type AstNode = NumNode | StrNode | BoolNode | RefNode | FuncNode | BinNode | UnNode | PctNode;
/** 对外解析：失败返回 null */
export declare function parse(input: string): AstNode | null;
/** 提取依赖（供依赖图 / 循环检测使用） */
export declare function collectDeps(ast: AstNode, ctx: FormulaCtx): FormulaDep[];
/**
 * 求值公式，返回结果值；错误以哨兵字符串返回（不抛出）。
 * @param input 公式文本（可含前导 =）
 * @param ctx   求值上下文
 * @param at    当前单元格坐标（相对/整列引用解析用）
 */
export declare function evaluate(input: string, ctx: FormulaCtx, at: CellCoord): FormulaValue;
/** 解析并求值（已编译 AST 复用场景） */
export declare function evaluateAst(ast: AstNode, ctx: FormulaCtx, at: CellCoord): FormulaValue;
export {};
