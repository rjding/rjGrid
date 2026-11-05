export interface EditChange<T = any> {
    /** 变更目标（此处为行数据对象引用） */
    target: T;
    /** 列 id（colId / field） */
    field: string;
    oldValue: any;
    newValue: any;
}
export declare class EditHistory<T = any> {
    private undoStack;
    private redoStack;
    private limit;
    constructor(limit?: number);
    setLimit(n: number): void;
    /** 记录一次动作（一组变更）；清空重做栈 */
    push(group: EditChange<T>[]): void;
    private trim;
    canUndo(): boolean;
    canRedo(): boolean;
    get undoDepth(): number;
    get redoDepth(): number;
    /** 弹出一组待反向应用（写回 oldValue）的变更 */
    undo(): EditChange<T>[] | null;
    /** 弹出一组待正向应用（写回 newValue）的变更 */
    redo(): EditChange<T>[] | null;
    clear(): void;
}
