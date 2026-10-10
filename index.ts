import RjGrid from './src/RjGrid.vue'

export { RjGrid }

export type {
  RjColumn,
  RjRowData,
  RjCellParams,
  RjCellAction,
  RjCellActionCtx,
  RjGridApi,
  RjGridState,
  RjDataMode,
  RjLoadServerParams,
  RjLoadServerResult,
  RjFilterModel,
  RjFilterCondition,
  RjFilterType,
  RjSortState,
  RjSortDir,
  RjFixed,
  RjMenuItem,
  RjMenuContext,
  RjContextMenuItem,
  RjContextMenuCtx,
  RjCellEventParams,
  RjSelectionEventParams,
  RjPinnedRow,
  RjFindMatch,
  RjEditorType,
  RjEditorConfig,
  RjEditorOption,
  RjOptionSource,
  RjImageConfig,
  RjSparklineConfig,
  RjColStateItem,
  RjColumnFilterState,
  RjExportScope,
  RjExportScopeResolved,
  RjServerExportParams,
  RjTransaction,
  RjExportParams,
  RjPrintOptions,
  RjPrintParams,
  RjAgg,
  RjAggFunc,
  RjAggCustom,
  RjQueryCondition,
  RjQueryFieldDef,
  RjQueryFieldKind,
  RjQueryOperator,
  RjQueryAction,
  RjQueryActionCtx,
  RjRowFormConfig,
  RjSavedView
} from './src/types'

// 主题与图标参数类型（宿主传 theme / icons 时用于类型标注）
export type { RjThemeParams } from './src/theme'
export type { RjIconName, RjIcons, RjIconsOverride } from './src/icons'

export {
  deriveQueryFields,
  queryOpsOfKind,
  defaultQueryOperator,
  matchQueryValue
} from './src/query'
export { activeQueryConditions, rowPassesQuery, kindOfColumn } from './src/query'

// 行编辑/新增弹窗同口径纯内核（宿主可预算表单字段自建弹窗，与内置弹窗行为对齐）
export {
  buildFormFields,
  applyFormChanges,
  createFormRow,
  normalizeEditor,
  formFieldKind,
  queryActionDisabled,
  queryActionConfirm
} from './src/rowForm'
export type { RjFormField, RjFormFieldKind } from './src/rowForm'

export type { RjLeafCol } from './src/useColumnState'
export type { RjDisplayRow } from './src/useRowModel'

export { parseNLQ, explainNLQ } from './src/nlq'
export type { RjNlqResult, RjNlqColumn, RjNlqClause, RjNlqFilterType } from './src/nlq'
