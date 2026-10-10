/**
 * 内置行编辑弹窗的纯逻辑：表单字段推导 + 批量写入 + 按钮禁用求值。
 * 不依赖 DOM / Vue，单测直接驱动（__tests__/rowForm.spec.ts）。
 */
import type {
  RjColumn,
  RjEditorConfig,
  RjEditorOption,
  RjQueryAction,
  RjRowData,
  RjRowFormConfig
} from './types'
import { colIdOf, getValueByPath, setValueByPath } from './utils'

/** 表单控件类型（由列的 editor/type 归一而来） */
export type RjFormFieldKind = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox'

/** 单个表单字段：弹窗按此渲染，validator/col 原样带上供提交校验 */
export interface RjFormField {
  field: string
  colId: string
  title: string
  kind: RjFormFieldKind
  options: RjEditorOption[]
  /** textarea 行数 */
  rows: number
  validator?: RjEditorConfig['validator']
  col: RjColumn
}

/** 列上的 editor 声明归一为配置对象（editor 可为裸类型字符串） */
export function normalizeEditor(col: RjColumn): RjEditorConfig | undefined {
  if (!col.editor) return undefined
  return typeof col.editor === 'string' ? { type: col.editor } : col.editor
}

/** 控件类型：editor.type 优先，否则由列预设 type 映射；custom 无法进表单，回落文本 */
export function formFieldKind(col: RjColumn, editor?: RjEditorConfig): RjFormFieldKind {
  switch (editor?.type) {
    case 'select':
    case 'richSelect':
      return 'select'
    case 'largeText':
      return 'textarea'
    case 'checkbox':
      return 'checkbox'
    case 'number':
      return 'number'
    case 'date':
      return 'date'
    case 'input':
    case 'custom':
      return 'text'
  }
  switch (col.type) {
    case 'num':
    case 'money':
    case 'percent':
      return 'number'
    case 'date':
    case 'datetime':
      return 'date'
    case 'boolean':
      return 'checkbox'
    default:
      return 'text'
  }
}

/**
 * 缺省准入：有 field、非引擎内部列（__check/__drag/__pv* 等）、
 * 且声明了 editor 或 editable —— 表单只收「可编辑字段」，展示列由宿主经 cfg.columns 放宽。
 */
function defaultInclude(col: RjColumn): boolean {
  if (!col.field || col.field.startsWith('__')) return false
  if (colIdOf(col).startsWith('__')) return false
  return !!col.editor || !!col.editable
}

/** 由可见叶子列生成表单字段（sampleRows 用于对函数形式的 editor.options 求值） */
export function buildFormFields(
  cols: RjColumn[],
  cfg: RjRowFormConfig | undefined,
  sampleRows: RjRowData[]
): RjFormField[] {
  const include = cfg?.columns || defaultInclude
  const out: RjFormField[] = []
  for (const col of cols) {
    if (!col.field || !include(col)) continue
    const editor = normalizeEditor(col)
    const kind = formFieldKind(col, editor)
    const rawOpts = editor?.options
    const options =
      kind === 'select'
        ? typeof rawOpts === 'function'
          ? rawOpts(sampleRows[0])
          : rawOpts || []
        : []
    out.push({
      field: col.field,
      colId: colIdOf(col),
      title: col.title || col.field,
      kind,
      options,
      rows: editor?.props?.rows || 4,
      validator: editor?.validator,
      col
    })
  }
  return out
}

/**
 * 把 { field: value } 批量写入每一行（原地改，配合 applyTransaction({ update }) 使用）。
 * changes 只含弹窗里勾选过的字段，未勾选字段天然不覆盖。
 */
export function applyFormChanges(rows: RjRowData[], changes: Record<string, any>): RjRowData[] {
  rows.forEach((row) => {
    for (const field of Object.keys(changes)) setValueByPath(row, field, changes[field])
  })
  return rows
}

/** 新增模式组行用写路径：与 setValueByPath 同口径，但沿途对象缺失时自动补建（空白新行没有现成嵌套结构） */
function ensureValueByPath(obj: any, path: string, value: any): void {
  const parts = path.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i]
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}
    cur = cur[k]
  }
  cur[parts[parts.length - 1]] = value
}

/**
 * 新增弹窗提交：由 preset 浅拷 + 表单值组装新行对象（不改动 preset 本身）。
 * 主键/默认值等由宿主在 row-form-add 里补齐后调后端，组件只负责形状。
 */
export function createFormRow(
  preset: RjRowData | undefined,
  changes: Record<string, any>
): RjRowData {
  const row: RjRowData = { ...(preset || {}) }
  for (const field of Object.keys(changes)) ensureValueByPath(row, field, changes[field])
  return row
}

/** 读某行在某字段上的当前值（表单预填用，走 a.b.c 路径） */
export function fieldValue(row: RjRowData, field: string): any {
  return getValueByPath(row, field)
}

/** 查询栏按钮禁用求值：布尔直通，函数按选中行判定 */
export function queryActionDisabled(action: RjQueryAction, rows: RjRowData[]): boolean {
  return typeof action.disabled === 'function' ? !!action.disabled(rows) : !!action.disabled
}

/** 查询栏按钮确认文案求值（无 confirm 返回空串） */
export function queryActionConfirm(action: RjQueryAction, rows: RjRowData[]): string {
  if (!action.confirm) return ''
  return typeof action.confirm === 'function' ? action.confirm(rows) : action.confirm
}
