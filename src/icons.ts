// rj-grid 图标体系：集中管理界面字形，支持通过 gridOptions.icons 覆盖（对标 AG Grid icons 模块）
// 说明：默认使用文本/表情字形，零依赖；覆盖值同样按文本渲染。
import type { InjectionKey, ComputedRef } from 'vue'

/** 内置图标名（可扩展的语义键） */
export const RJ_DEFAULT_ICONS = {
  // 排序
  sortAscending: '▲',
  sortDescending: '▼',
  sortUnSort: '⇅',
  // 表头按钮
  filter: '▼',
  columnMenu: '⋮',
  rowDrag: '⠿',
  // 列菜单页签
  menuGeneral: '☰',
  menuFilter: '⏷',
  menuColumns: '▤',
  // 复选框
  checked: '✓',
  indeterminate: '–',
  // 分组/树展开
  rowGroupOpen: '▾',
  rowGroupClose: '▸',
  expand: '▸',
  collapse: '▾',
  // 面板操作
  pin: '📌',
  visible: '👁',
  hidden: '🚫',
  remove: '✕',
  /** 浮层/对话框关闭按钮（与 remove 同字形，语义分开便于单独覆盖） */
  close: '✕',
  add: '+',
  // 子菜单箭头
  submenuRight: '▸'
} as const

export type RjIconName = keyof typeof RJ_DEFAULT_ICONS
export type RjIcons = Record<RjIconName, string>

/** 用户可传入的部分覆盖 */
export type RjIconsOverride = Partial<RjIcons>

/** 合并默认图标与覆盖（空串/未定义不覆盖）——纯函数 */
export function mergeIcons(overrides?: RjIconsOverride): RjIcons {
  const out: RjIcons = { ...RJ_DEFAULT_ICONS }
  if (!overrides) return out
  for (const k of Object.keys(overrides) as RjIconName[]) {
    const v = overrides[k]
    if (v != null && v !== '') (out as Record<string, string>)[k] = v
  }
  return out
}

/** 注入键：网格根 provide，子组件 inject 消费 */
export const RJ_ICONS_KEY: InjectionKey<ComputedRef<RjIcons>> = Symbol('rj-icons')
