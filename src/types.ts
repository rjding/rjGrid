// rj-grid 类型体系（自研私有数据网格，参考 AG Grid 功能规格）
import type { ComponentPublicInstance, VNode } from 'vue'
import type { RjThemeParams } from './theme'
import type { RjMessages } from './locale'
import type { RjNlqResult } from './nlq'

/** 通用行数据 */
export type RjRowData = Record<string, any>

/** 排序方向 */
export type RjSortDir = 'asc' | 'desc' | null

/** 冻结方向 */
export type RjFixed = 'left' | 'right' | false | undefined

/** 聚合函数 */
export type RjAggFunc = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last'
export type RjAggCustom = (rows: RjRowData[]) => any
export type RjAgg = RjAggFunc | RjAggCustom

/** 筛选类型 */
export type RjFilterType = 'text' | 'number' | 'date' | 'select'

/** 单元格筛选条件 */
export interface RjFilterCondition {
  op: string
  value1?: any
  value2?: any
}

/** 列筛选模型 */
export interface RjFilterModel {
  type: RjFilterType
  operator: 'and' | 'or'
  conditions: RjFilterCondition[]
}

// ---------------- 查询条件栏 / 自定义视图（queryable / viewable） ----------------

/** 查询字段类型（由列定义推导，决定可用运算符与输入控件） */
export type RjQueryFieldKind = 'text' | 'number' | 'date' | 'select'

/** 查询运算符 */
export type RjQueryOperator =
  | 'contains'
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'

/** 单个查询条件：字段 + 运算符 + 值（between 用 value1/value2） */
export interface RjQueryCondition {
  field: string
  operator: RjQueryOperator
  value?: any
  value1?: any
  value2?: any
  /** 展示用文本（值可能是 id 等，存一份便于视图卡片直显） */
  valueText?: string
}

/** 查询字段候选（可显式传入 queryFields 覆盖，否则由列定义推导） */
export interface RjQueryFieldDef {
  field: string
  title?: string
  kind?: RjQueryFieldKind
  /** select 型的候选项 */
  options?: RjEditorOption[]
}

/** 已保存的自定义视图快照 */
export interface RjSavedView {
  id: string
  name: string
  /** 该视图挂载了哪些查询字段 */
  queryFields: string[]
  /** 各字段填入的条件 */
  conditions: RjQueryCondition[]
  /** 列布局（顺序 + 显隐，取自列状态） */
  columns?: RjColStateItem[]
  /** 排序与行分组 */
  gridState?: { sort?: RjSortState[]; rowGroup?: string[] }
  /** 内置视图（只读） */
  builtin?: boolean
  createTime?: number
}

/** 查询栏操作按钮点击上下文：选中行 + 命令式 api + 内置行编辑/新增弹窗入口 */
export interface RjQueryActionCtx {
  /** 当前选中行（多选语义，未选中为空数组） */
  rows: RjRowData[]
  /** 网格命令式 API（applyTransaction / getSelectedRows 等） */
  api: any
  /** 打开内置行编辑弹窗（缺省用当前选中行） */
  openRowForm: (rows?: RjRowData[]) => void
  /** 打开内置新增弹窗：空白表单（可用 preset 预置默认值），确认后组装新行并插入表格 */
  openRowFormAdd: (preset?: RjRowData) => void
}

/** 查询栏「重置」旁的自定义操作按钮（声明式；另有 #query-actions 插槽覆盖轨） */
export interface RjQueryAction {
  name: string
  /** 前缀图标字形（可选，纯文本按钮直接省略） */
  icon?: string
  /** 危险操作样式（删除类），红色描边 */
  danger?: boolean
  /** 禁用态：布尔或按选中行动态求值（未选中时禁用交给宿主判定） */
  disabled?: boolean | ((rows: RjRowData[]) => boolean)
  /** 有值则先弹内置确认框，确认后才执行 onClick；函数形式可按选中行生成文案 */
  confirm?: string | ((rows: RjRowData[]) => string)
  onClick: (ctx: RjQueryActionCtx) => void | Promise<void>
}

/** 内置行编辑弹窗配置（rowForm=false 关闭能力，true/缺省用默认规则） */
export interface RjRowFormConfig {
  title?: string
  /** 弹窗宽度（px），默认 560 */
  width?: number
  /** 哪些列进入表单；缺省：有 field、非引擎内部列且声明了 editor/editable */
  columns?: (col: RjColumn) => boolean
  /** 新增弹窗标题（缺省走词条「新增」；与编辑标题分开，一个 rowForm 配置同时管两个弹窗） */
  addTitle?: string
  /** 哪些列进入「新增」表单；缺省沿用 columns 钩子或默认规则（宿主常需放行编码/主键列） */
  addColumns?: (col: RjColumn) => boolean
}

/** 编辑器类型 */
export type RjEditorType =
  | 'input'
  | 'number'
  | 'date'
  | 'select'
  | 'richSelect'
  | 'largeText'
  | 'checkbox'
  | 'custom'

export interface RjEditorOption {
  label: string
  value: any
  /** 树形子节点：载体源含 childrenKey 时保留层级（下拉按树渲染，显示/标签映射自动拍平） */
  children?: RjEditorOption[]
}

/**
 * 统一选项载体：一份数据源同时驱动 显示(value→label) / select 筛选候选 / select 编辑器 / NLQ 枚举。
 * 数组＝静态候选；函数＝工厂（可同步/异步，网格级按列只解析一次）；对象＝按 load/ref/dict 取数，
 * 再用 map 或 labelKey/valueKey 归一，childrenKey（默认 'children'）命中数组即保留为 children 树，
 * 供下拉按层级渲染（显示标签映射会自动深度优先拍平，父/子节点均可命中 value→label）。
 */
export type RjOptionSource =
  | RjEditorOption[]
  | ((row?: RjRowData) => RjEditorOption[] | Promise<RjEditorOption[]>)
  | {
      /** 静态候选（对象式） */
      items?: RjEditorOption[]
      /** 宿主直接给的接口函数（返回原始数组，交给 labelKey/valueKey/map 归一） */
      load?: () => unknown[] | Promise<unknown[]>
      /** 命名源：交网格级 optionsLoader(name) 解析 */
      ref?: string
      /** 字典 key：交网格级 dictLoader(key) 解析 */
      dict?: string
      /** 自定义映射：接口单项 → {label,value} */
      map?: (item: any) => RjEditorOption
      /** 字段映射（默认 label/name → label，value/id/code → value） */
      labelKey?: string
      valueKey?: string
      /** 传入即递归拍平树（默认 'children'） */
      childrenKey?: string
    }

/** 编辑器配置 */
export interface RjEditorConfig {
  type?: RjEditorType
  options?: RjEditorOption[] | ((row: RjRowData) => RjEditorOption[])
  props?: Record<string, any>
  /** type=custom 时自定义编辑器组件 */
  component?: any
  /** 提交前校验，返回错误信息则阻止提交 */
  validator?: (
    newValue: any,
    row: RjRowData,
    column: RjColumn
  ) => string | null | undefined | Promise<string | null | undefined>
  /** 是否即时提交（值改变即保存），默认 false 失焦/回车提交 */
  alwaysUpdate?: boolean
  /** 下拉选择后是否立即结束编辑 */
  fullRowSelect?: boolean
}

/** 单元格渲染参数（cell-<field> 插槽 / cellRenderer 函数入参） */
export interface RjCellParams {
  value: any
  row: RjRowData
  rowIndex: number
  column: RjColumn
  colIndex: number
  highlighted?: boolean
}

/** 内置操作列按钮的点击上下文：单元格参数 + 当前动作 + 命令式 api */
export interface RjCellActionCtx extends RjCellParams {
  action: RjCellAction
  /** 网格命令式 API（可能未就绪时为 undefined） */
  api?: any
}

/** 内置操作列按钮（列上声明 actions 数组即由组件渲染，无需写 #cell 插槽） */
export interface RjCellAction {
  /** 唯一标识（事件去重/键） */
  name: string
  /** 按钮文本 */
  label?: string
  /** 前缀图标字形 */
  icon?: string
  /** 危险样式（描红）：删除等 */
  danger?: boolean
  /** 是否描边（未设则跟随列级 actionsBorder，默认描边） */
  border?: boolean
  /** 禁用：布尔或按行求值 */
  disabled?: boolean | ((ctx: RjCellActionCtx) => boolean)
  /** 显隐：布尔或按行求值（不可见的动作不参行也不入溢出菜单） */
  visible?: boolean | ((ctx: RjCellActionCtx) => boolean)
  /** 需二次确认的提示文案（走内置确认框），字符串或按行求值 */
  confirm?: string | ((ctx: RjCellActionCtx) => string)
  /** 点击处理 */
  onClick?: (ctx: RjCellActionCtx) => void
}

/** 迷你图配置 */
export interface RjSparklineConfig {
  style: 'bar' | 'line' | 'spider'
  color?: string
  /** 数据取值字段（默认取本列值，约定为 number[]） */
  valueField?: string
}

/** 图片单元格配置（列 type: 'image' 时生效） */
export interface RjImageConfig {
  /** 解析图片地址（默认取单元格值；值可为 url 字符串或以逗号分隔的多个 url） */
  src?: (params: RjCellParams) => string | string[] | null | undefined
  /** 缩略图边长（px），默认 24；被 width/height 覆盖 */
  size?: number
  /** 显式宽/高（px） */
  width?: number
  height?: number
  /** 外形：square=直角 / rounded=圆角（默认） / circle=圆形（头像） */
  shape?: 'square' | 'rounded' | 'circle'
  /** 填充方式，默认 cover */
  fit?: 'cover' | 'contain' | 'fill'
  /** 一个单元格最多显示几张图（值为数组/逗号串时生效），默认 1 */
  max?: number
  /** 懒加载：仅解码视口附近的图（虚拟滚动下大幅降低开销），默认 true */
  lazy?: boolean
  /** 点击放大预览，默认 true */
  preview?: boolean
  /** 加载失败或无值时的占位文本（默认回落为单元格文本） */
  fallback?: string
  /** 无障碍替代文本（默认取列标题） */
  alt?: string
}

/** 列定义（对标 AG Grid ColDef） */
export interface RjColumn<T = RjRowData> {
  /** 字段名，支持 a.b.c 路径；无 field 时可配 valueGetter */
  field?: string
  /** 唯一标识，默认取 field */
  colId?: string
  title?: string
  /** 固定宽度 */
  width?: number
  minWidth?: number
  maxWidth?: number
  /** 剩余空间弹性分配 */
  flex?: number
  fixed?: RjFixed
  hidden?: boolean
  visible?: boolean // 与 hidden 等价，二者其一
  /** 子列（多级表头） */
  children?: RjColumn<T>[]

  // ---- 排序 ----
  sortable?: boolean
  initialSort?: RjSortDir
  comparator?: (a: any, b: any, rowA: T, rowB: T) => number

  // ---- 筛选 ----
  filter?: boolean | RjFilterType
  filterValueGetter?: (row: T) => any
  /** 筛选值显示转换（select 面板用） */
  filterValueMap?: Record<string, string>

  // ---- 取值/格式化（可传函数，或字符串表达式如 'data.price * 100'）----
  valueGetter?: ((row: T) => any) | string
  formatter?: ((params: RjCellParams) => string | number) | string
  /** 编辑提交前解析输入（字符串→目标类型，对标 AG Grid valueParser） */
  valueParser?: (params: { newValue: any; oldValue: any; row: T; column: RjColumn }) => any
  /** 预设类型，控制对齐与格式化 */
  type?: 'text' | 'num' | 'money' | 'percent' | 'date' | 'datetime' | 'boolean' | 'link' | 'image'
  /** 图片单元格配置（type: 'image' 时生效） */
  image?: RjImageConfig
  align?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'

  // ---- 公式（Excel 风格，对标 AG Grid Formula）----
  /** 列级公式：对该视图每一行求值并写入本列 field（如 '=qty*price'、'=SUM(B:B)'） */
  formula?: string
  /** 允许在编辑时把输入的 '=...' 作为公式存入该单元格（覆盖列级公式） */
  allowFormula?: boolean

  // ---- 样式 ----
  cellClass?: string | ((params: RjCellParams) => string)
  headerClass?: string
  /** 列头 tooltip：默认取列标题（窄列被截断时可看全名），传空串可关闭 */
  headerTooltip?: string
  /**
   * 显式指定为合计行的标签列（显示「总计」）。
   * 不指定时引擎自动选：无聚合值、非图片/迷你图、且未被自定义插槽接管的列（左冻结优先）。
   * 与 `#cell-xxx` 插槽共用时，插槽需自行兜底 `params.value`，否则组件算出的标签会被吞。
   */
  summaryLabel?: boolean
  cellStyle?: Record<string, string> | ((params: RjCellParams) => Record<string, string>)

  // ---- 自定义渲染 ----
  /** 渲染函数（等价于 cell-<field> 插槽，优先级低于插槽） */
  cellRenderer?: (params: RjCellParams) => VNode | VNode[] | string | number
  headerComponent?: any

  // ---- 内置操作列（按钮超出列宽自动收入“更多▾”下拉菜单）----
  /** 操作按钮组：声明后组件直接渲染带边框按钮（#cell 插槽 / cellRenderer 仍优先） */
  actions?: RjCellAction[]
  /** 操作列按钮默认是否描边（默认 true）；单个 action.border 可覆盖 */
  actionsBorder?: boolean
  /** 操作列按钮间距（px，默认 4） */
  actionsGap?: number

  // ---- 编辑 ----
  editable?: boolean | ((row: T) => boolean)
  editor?: RjEditorConfig | RjEditorType
  /**
   * 统一选项载体：一处声明同时喂给 显示 / select 筛选 / select 编辑器 / NLQ（异步自动加载 + 按源缓存）。
   * 向后兼容：显式 col.formatter / editor.options / filterValueMap 一律优先，本载体仅在其缺位时填充。
   */
  options?: RjOptionSource
  /** options 的糖：等价 options:{dict}，走网格级 dictLoader 按字典 key 取候选 */
  dict?: string
  /** 编辑值新旧合并钩子 */
  onCellValueChanged?: (params: { newValue: any; oldValue: any; row: T; column: RjColumn }) => void

  // ---- 合并单元格 ----
  colSpan?: (row: T) => number
  rowSpan?: (row: T) => number

  // ---- 聚合/分组/透视 ----
  /** 分组与合计行中该列的聚合方式 */
  aggFunc?: RjAgg
  /** 允许拖入分组面板 */
  rowGroup?: boolean
  /** 允许作为透视列 */
  allowPivot?: boolean
  /** 初始参与行分组 */
  initialRowGroup?: boolean
  /** 初始作为透视列 */
  initialPivot?: boolean

  // ---- 其他 ----
  /** 迷你图 */
  sparkline?: RjSparklineConfig
  /** 行拖拽列（该列单元格显示拖拽手柄） */
  rowDrag?: boolean
  /** 复选框列 */
  checkbox?: boolean
  /** 抑制排序（如操作列） */
  suppressSort?: boolean
  /** 抑制列头右侧的列菜单图标（如复选/拖拽等窄控制列，避免与内容重叠并保证与表体对齐） */
  suppressMenu?: boolean
  /** 抑制导出 */
  suppressExport?: boolean
  tooltip?: string | ((params: RjCellParams) => string)
  /** 单元格点击是否阻止事件冒泡 */
  wrapText?: boolean
}

/** 排序状态 */
export interface RjSortState {
  field: string
  dir: Exclude<RjSortDir, null>
}

/** 列筛选持久化项 */
export interface RjColumnFilterState {
  field: string
  model: RjFilterModel
}

/** 列状态持久化项 */
export interface RjColStateItem {
  colId: string
  width?: number
  hide?: boolean
  pinned?: 'left' | 'right' | null
  order?: number
}

/** 网格完整状态（用于持久化 / getState / setState） */
export interface RjGridState {
  columns?: RjColStateItem[]
  sort?: RjSortState[]
  filters?: RjColumnFilterState[]
  quickFilter?: string
  /** 浮动筛选行 colId→文本 */
  floatFilters?: Record<string, string>
  /** 高级过滤表达式树 */
  advancedFilter?: { operator: 'and' | 'or'; items: any[] } | null
  rowGroup?: string[]
  pivot?: { cols: string[]; values: string[]; active: boolean }
  /** 查询条件栏快照（queryable 模式下随状态一起持久化） */
  queryConditions?: RjQueryCondition[]
}

/** 事件参数 */
export interface RjCellEventParams extends RjCellParams {
  event: MouseEvent | KeyboardEvent
}

export interface RjSelectionEventParams {
  rows: RjRowData[]
  keys: (string | number)[]
}

/** 服务端加载参数 */
export interface RjLoadServerParams {
  start: number
  end: number
  page: number
  pageSize: number
  sort: RjSortState[]
  filters: RjColumnFilterState[]
  quickFilterText: string
  /** 浮动筛选行下发项 */
  floatFilters?: { colId: string; value: string }[]
  /** 行分组下推：字段及其聚合方式（服务端可据此返回已分组/聚合的行） */
  rowGroup?: { field: string; aggFunc?: string }[]
  /** 高级过滤：跨列 AND/OR 表达式树（服务端模式需后端应用；结构见 filtering.AdvFilterGroup） */
  advancedFilter?: { operator: 'and' | 'or'; items: any[] } | null
  /** 查询条件栏：queryable 模式下生效（已填值）的条件，服务端模式需后端应用 */
  queryConditions?: RjQueryCondition[]
  signal?: AbortSignal
  /** SSRM：请求类型 select=普通行块 group=分组子块 */
  type?: 'select' | 'group'
  /** SSRM：分组展开时所属父组信息（type=group 时有值） */
  group?: { rowGroupKey: string; level: number; path: any[] }
}

export interface RjLoadServerResult {
  rows: RjRowData[]
  pageSize?: number
  lastRow?: number
  success: boolean
}

/** 数据模式 */
export type RjDataMode = 'client' | 'infinite' | 'pagination' | 'serverSide'

/** 事务（实时更新） */
export interface RjTransaction {
  add?: RjRowData[]
  addIndex?: number
  update?: RjRowData[]
  remove?: RjRowData[]
  upsert?: RjRowData[]
}

/**
 * 导出/打印的数据范围（五档，菜单只列前四档可用项）：
 *  - auto     有选中行就导选中、否则导当前视图（默认）
 *  - selected 仅选中行（含 keepSelectionCrossPage 跨页保留的行）
 *  - view     当前视图：屏上生效的列 + 过滤/排序/分组后的行（分页/服务端模式即当前已加载部分）
 *  - all      源数据全集（不做过滤与排序）；分页/服务端模式下仍只有已加载行，要全量请用 server
 *  - server  交给宿主的后端导出：组件只把「生效列 + 查询状态 + 分页快照 + 选中 key」透出去
 */
export type RjExportScope = 'auto' | 'selected' | 'view' | 'all' | 'server'

/** 落地后的具体范围（不含 auto） */
export type RjExportScopeResolved = Exclude<RjExportScope, 'auto'>

/** 后端导出入参（范围为 server 时回调 props.serverExport） */
export interface RjServerExportParams {
  /** 目标格式（后端导出不提供 PDF/打印：那是浏览器打印渲染，应由前端范围完成） */
  type: 'csv' | 'excel'
  fileName: string
  /** 当前生效列（按屏上顺序，已排除复选/拖拽控制列与隐藏列） */
  columns: { colId: string; field?: string; title?: string }[]
  /** 当前视图状态（筛选/排序/分组/快速搜索），宿主据此还原查询条件 */
  state: RjGridState
  /** 分页快照；客户端模式下 pageNo=1且 total=已加载行数 */
  paging: { pageNo: number; pageSize: number; total: number }
  /** 选中行的 rowKey 列表（宿主可按 key 精确导出选中） */
  selectedKeys: (string | number)[]
}

/** 导出参数 */
export interface RjExportParams {
  fileName?: string
  /** 导出范围；不传则取 props.exportRange（默认 auto） */
  scope?: RjExportScope
  /** 旧字段：等价 scope='selected'（仅在未传 scope 时生效） */
  onlySelected?: boolean
  columnKeys?: string[]
  /** 旧字段：false 等价 scope='all'（仅在未传 scope 时生效） */
  currentView?: boolean
}

/** 打印 / PDF 选项（零依赖：隐藏 iframe + 浏览器打印，可另存为 PDF） */
export interface RjPrintOptions {
  /** 文档大标题（表格上方） */
  title?: string
  /** 页眉副标题（标题下、表格上的一行说明） */
  header?: string
  /** 页脚文本（表格下方） */
  footer?: string
  /** 纸张尺寸；'auto' 不写死 @page size */
  pageSize?: 'A4' | 'A5' | 'Letter' | 'Legal' | 'auto'
  /** 方向，默认 landscape（表格多为横向更容得下） */
  orientation?: 'portrait' | 'landscape'
  /** 页边距（mm），默认 10 */
  margins?: number
  /** 表格宽度自适应页面（table-layout:auto），默认按列宽比例固定布局 */
  scaleToFit?: boolean
  /** 是否显示网格线，默认 true */
  showGridLines?: boolean
  /** 斑马纹，默认 true */
  zebra?: boolean
  /** 深色表头（白字），默认 true */
  headerDark?: boolean
  /** 页码页脚（@page 底部居中，部分浏览器支持），默认 true */
  pageNumbers?: boolean
  /** 浏览器标签页/文档标题；缺省回落 title，两者皆空时用中性文本 */
  docTitle?: string
  /** 页码文案模板（{p}=当前页 {t}=总页数），由调用端按语言注入 */
  pageNumberText?: string
  /** 打印文档 <html lang>，默认 zh */
  docLang?: string
}

/** api.print / exportData({type:'pdf'}) 入参：导出范围 + 打印选项 */
export interface RjPrintParams extends RjExportParams, RjPrintOptions {}

/** 上下文菜单项（组件内部渲染结构） */
export interface RjMenuItem {
  name?: string
  icon?: string
  action?: () => void
  children?: RjMenuItem[]
  isSeparator?: boolean
  disabled?: () => boolean
  /** 危险项：红色文字（自定义右键菜单 danger 项映射而来） */
  danger?: boolean
}

export interface RjMenuContext {
  event: MouseEvent
  column?: RjColumn | null
  row?: RjRowData | null
  params?: RjCellParams | null
  api: RjGridApi
}

/** 自定义右键菜单项的求值上下文（visible/disabled/confirm/onClick 共用） */
export interface RjContextMenuCtx {
  /** 右键命中的数据行（非数据区/分组行为空） */
  row?: RjRowData | null
  column?: RjColumn | null
  colId?: string
  rowIndex?: number
  /** 右键单元格的原始值 */
  value?: any
  api?: any
  event: MouseEvent
}

/**
 * 声明式自定义右键菜单项：与 col.actions 同风格，网格上声明 contextMenus 数组即可，
 * 无需自己拼整个菜单（区别于旧 contextMenu 函数需返回底层 RjMenuItem 结构）。
 */
export interface RjContextMenuItem {
  /** 唯一标识（事件区分用） */
  name?: string
  /** 菜单项文本（缺省取 name） */
  label?: string
  /** 前缀图标（emoji / 图标字体文本，与 col.actions 同） */
  icon?: string
  /** 危险项：红色文字 */
  danger?: boolean
  /** 分隔线项 */
  separator?: boolean
  /** 禁用：布尔或按上下文求值 */
  disabled?: boolean | ((ctx: RjContextMenuCtx) => boolean)
  /** 显隐：布尔或按上下文求值（不可见的项不进菜单，缺省可见） */
  visible?: boolean | ((ctx: RjContextMenuCtx) => boolean)
  /** 危险操作二次确认文案（走内置确认框），字符串或按上下文求值 */
  confirm?: string | ((ctx: RjContextMenuCtx) => string)
  /** 子菜单（一级，悬停展开） */
  children?: RjContextMenuItem[]
  /** 点击处理 */
  onClick?: (ctx: RjContextMenuCtx) => void
}

/** 合计行配置 */
export interface RjPinnedRow {
  [field: string]: any
}

/** 查找匹配项 */
export interface RjFindMatch {
  rowIndex: number
  colId: string
  start: number
  end: number
}

/** 命令式 API（expose） */
export interface RjGridApi extends ComponentPublicInstance {
  /** 数据操作 */
  getDisplayedRowAtIndex: (index: number) => RjRowData | undefined
  getDisplayedRowsCount: () => number
  /** 当前虚拟可见行区间 [start, end)（对标 AG Grid getVirtualRowRanges） */
  getVisibleRange: () => { start: number; end: number }
  applyTransaction: (tx: RjTransaction) => void
  applyTransactionAsync: (tx: RjTransaction) => Promise<void>
  /** SSRM：刷新服务端缓存（purge=true 清空全部块并重载视口） */
  refreshServerSide: (params?: { purge?: boolean }) => void
  /** SSRM：清空块缓存 */
  purgeServerSideCache: () => void
  setRowData: (rows: RjRowData[]) => void
  updateRow: (row: RjRowData) => void
  getCellValue: (rowIndex: number, field: string) => any
  setCellValue: (rowIndex: number, field: string, value: any) => void
  /** 选择 */
  getSelectedRows: () => RjRowData[]
  getSelectedKeys: () => (string | number)[]
  /** 内置行编辑弹窗：由列定义自动生成表单，确认后事务回填；缺省作用于当前选中行 */
  openRowForm: (rows?: RjRowData[]) => void
  /** 内置新增弹窗：空白表单（preset 可预置默认值），确认后 add 事务插入新行并抛 row-form-add */
  openRowFormAdd: (preset?: RjRowData) => void
  setRowSelection: (row: RjRowData, selected: boolean) => void
  selectAll: () => void
  clearSelection: () => void
  /** 排序/筛选 */
  setSort: (sorts: RjSortState[]) => void
  setFilterModel: (field: string, model: RjFilterModel | null) => void
  clearAllFilters: () => void
  setQuickFilter: (text: string) => void
  /** 高级过滤：跨列 AND/OR 表达式树 */
  setAdvancedFilter: (model: unknown | null) => void
  getAdvancedFilter: () => unknown
  openAdvancedFilter: () => void
  /** 分组/树/透视 */
  setRowGroup: (fields: string[]) => void
  /** 设置「取前 N」显示限量（0=不限量），供 NLQ/重置等场景复位 */
  setRowLimit: (n: number) => void
  expandAll: () => void
  collapseAll: () => void
  setPivot: (cols: string[], values: string[]) => void
  /** 滚动/编辑 */
  scrollTo: (rowIndex: number, colId?: string) => void
  startEditing: (rowIndex: number, colId: string) => void
  stopEditing: () => void
  /** 撤销/重做编辑（对标 AG Grid undoCellEditing/redoCellEditing） */
  undoCellEditing: () => void
  redoCellEditing: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  /** 脏格（对标 AG Grid dirty cells）：编辑未确认变更的标记与查询 */
  isDirty: () => boolean
  isCellDirty: (rowIndex: number, colId: string) => boolean
  getDirtyCells: () => { row: RjRowData; colId: string; oldValue: any; newValue: any }[]
  getDirtyRows: () => RjRowData[]
  clearDirtyCells: () => void
  /** 公式引擎（对标 AG Grid Formula） */
  /** 强制重算全部公式单元格（依赖拓扑 + 循环检测） */
  recalculate: (force?: boolean) => void
  /** 设置某单元格公式（以 = 开头；传空串则清除并恢复列级/原始值） */
  setCellFormula: (rowIndex: number, colId: string, formula: string) => void
  /** 读取某单元格的公式文本（无则 undefined） */
  getCellFormula: (rowIndex: number, colId: string) => string | undefined
  /** 当前是否存在任何公式（列级或单元格） */
  hasFormula: () => boolean
  /** 收集当前循环引用单元格坐标（row/col 为视图 0 基索引） */
  getCircularRefs: () => { row: number; colId: string }[]
  /** 导出/状态：scope 缺省时按 props.exportRange（默认 auto：有选中导选中） */
  exportData: (params?: RjPrintParams & { type?: 'csv' | 'excel' | 'pdf' }) => void
  exportCurrentAsCsv: () => void
  /** 打印（浏览器打印对话框） */
  print: (params?: RjPrintParams) => void
  /** 生成打印文档 HTML（不弹窗；供预览/测试/自定义容器） */
  getPrintHtml: (params?: RjPrintParams) => string
  copySelectedToClipboard: () => void
  getState: () => RjGridState
  setState: (state: RjGridState) => void
  refresh: () => void
  refreshCells: (opts?: { rowKeys?: (string | number)[]; colIds?: string[] }) => void
  /** 区域选择 */
  getRangeSelection: () => { start: { r: number; c: number }; end: { r: number; c: number } } | null
  clearRangeSelection: () => void
  /** 列便利方法（对标 AG Grid column API）：返回全部叶子列（含隐藏列）的坐标 */
  getColumns: () => { colId: string; field?: string; title?: string }[]
  /**
   * 设置列显隐（写入用户列状态层，不改动列定义）。
   * 显隐为三态覆盖：强制隐藏 / 强制显示 / 无覆盖时跟随列定义，
   * 因此 visible=true 可以打开列定义里标了 hidden:true 的列（与 AG Grid setVisible 一致）
   */
  setColumnVisible: (colId: string, visible: boolean) => void
  /** 读当前生效显隐（已叠加用户覆盖）；true=隐藏 */
  isColumnHidden: (colId: string) => boolean
  /** 设置列冻结：'left' | 'right' | null（null 取消冻结） */
  setColumnPinned: (colId: string, pinned: 'left' | 'right' | null) => void
  /** 设置列宽（px，内部按列的 minWidth/maxWidth 夹取） */
  setColumnWidth: (colId: string, width: number) => void
  /** 单列自适应内容宽度 */
  autoSizeColumn: (colId: string) => void
  /** 全部可见列自适应内容宽度 */
  autoSizeAll: () => void
  /** 列宽：按视口宽度等比缩放普通区列（对标 sizeColumnsToFit） */
  sizeColumnsToFit: () => void
  /** 清除全部列宽覆盖，还原到列定义/内容自适应默认宽（与 autoSizeAll 配合做自适应↔还原切换） */
  resetColumnWidths: () => void
  /** 主题引擎（对标 AG Grid Theming）：运行时替换预设/明暗/强调色等 */
  setTheme: (params: RjThemeParams) => void
  /** 读取当前生效的主题参数 */
  getTheme: () => RjThemeParams
  /** 语言：'zh' | 'en' | 区域标识（内部归一） */
  setLang: (lang: string) => void
  /** 局部覆盖文案（对标 localeText），按 key 合并、优先级最高 */
  setLocaleText: (patch: RjMessages) => void
  /** 自然语言查询（AI）：仅解析不应用，返回结构化意图 */
  parseQuery: (text: string) => RjNlqResult
  /** 自然语言查询（AI）：解析并应用到网格（筛选/排序/分组/搜索），返回解析结果 */
  applyQuery: (text: string) => RjNlqResult
  /** 遍历当前视图行（经筛选/排序/分组后的显示行，含组行等引擎生成行） */
  forEachNode: (fn: (data: RjRowData, index: number, drow: unknown) => void) => void
  /**
   * 动态事件总线（对标 AG Grid api.addEventListener）：按名订阅，返回退订函数。
   * 与模板 @emit 的区别是可运行时动态增删；常用列类事件：
   * columnVisible / columnMoved / columnPinned / columnResized / columnEverythingChanged
   */
  addEventListener: (type: string, cb: (event: any) => void) => () => void
  removeEventListener: (type: string, cb: (event: any) => void) => void
  /** 向总线主动派发事件（供宿主页面在自己改列后通知已订阅者） */
  dispatchEvent: (type: string, payload?: any) => void
}
