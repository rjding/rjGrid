// 编辑撤销/重做历史栈（框架无关纯逻辑，便于单元测试）
// 每个「用户动作」= 一个变更组（EditChange[]），支持单格编辑与批量粘贴/填充/删除整体撤销。

export interface EditChange<T = any> {
  /** 变更目标（此处为行数据对象引用） */
  target: T
  /** 列 id（colId / field） */
  field: string
  oldValue: any
  newValue: any
}

export class EditHistory<T = any> {
  private undoStack: EditChange<T>[][] = []
  private redoStack: EditChange<T>[][] = []
  private limit: number

  constructor(limit = 50) {
    this.limit = Math.max(1, limit | 0)
  }

  setLimit(n: number) {
    this.limit = Math.max(1, n | 0)
    this.trim()
  }

  /** 记录一次动作（一组变更）；清空重做栈 */
  push(group: EditChange<T>[]) {
    if (!group || !group.length) return
    this.undoStack.push(group.slice())
    this.redoStack.length = 0
    this.trim()
  }

  private trim() {
    while (this.undoStack.length > this.limit) this.undoStack.shift()
  }

  canUndo() {
    return this.undoStack.length > 0
  }
  canRedo() {
    return this.redoStack.length > 0
  }
  get undoDepth() {
    return this.undoStack.length
  }
  get redoDepth() {
    return this.redoStack.length
  }

  /** 弹出一组待反向应用（写回 oldValue）的变更 */
  undo(): EditChange<T>[] | null {
    const g = this.undoStack.pop()
    if (!g) return null
    this.redoStack.push(g)
    return g
  }

  /** 弹出一组待正向应用（写回 newValue）的变更 */
  redo(): EditChange<T>[] | null {
    const g = this.redoStack.pop()
    if (!g) return null
    this.undoStack.push(g)
    return g
  }

  clear() {
    this.undoStack.length = 0
    this.redoStack.length = 0
  }
}
