// 声明式自定义右键菜单（contextMenus）→ 内部 RjMenuItem 的纯函数转换。
// 单独成模块：与 cellActions.ts 同理，转换/过滤规则是行为回归的高风险点，无 DOM 也必须可单测。
import type { RjContextMenuCtx, RjContextMenuItem, RjMenuItem } from './types'

/** 布尔直通 / 函数按上下文求值；v 缺省返回 def */
function flagOf(
  v: boolean | ((c: RjContextMenuCtx) => boolean) | undefined,
  ctx: RjContextMenuCtx,
  def = false
): boolean {
  if (v == null) return def
  return typeof v === 'function' ? !!v(ctx) : !!v
}

/**
 * 将宿主声明的 contextMenus 转为内部菜单项：
 * - visible 缺省=可见（勿再取反，参照 cellActions.filterVisibleActions 的回归教训）
 * - separator 直通；首项/连续/全不可见导致的悬空分隔线会被剪掉
 * - children 递归（一级子菜单）；子项全不可见时父项不再显示展开箭头
 * - 点击统一交给 run（由网格处理 confirm / onClick / 事件派发）
 */
export function buildCustomMenuItems(
  items: RjContextMenuItem[] | undefined,
  ctx: RjContextMenuCtx,
  run: (item: RjContextMenuItem, ctx: RjContextMenuCtx) => void
): RjMenuItem[] {
  const out: RjMenuItem[] = []
  for (const it of items || []) {
    if (!flagOf(it.visible, ctx, true)) continue
    if (it.separator) {
      // 悬空分隔线：菜单为空或上一项就是分隔线时跳过
      if (!out.length || out[out.length - 1].isSeparator) continue
      out.push({ isSeparator: true })
      continue
    }
    const children = it.children?.length
      ? buildCustomMenuItems(it.children, ctx, run)
      : undefined
    // 子项被 visible 剪光 → 视为普通项（无展开箭头）
    const hasSub = !!children && children.some((c) => !c.isSeparator)
    out.push({
      name: (it.icon ? it.icon + ' ' : '') + (it.label || it.name || ''),
      danger: it.danger,
      disabled: () => flagOf(it.disabled, ctx),
      children: hasSub ? children : undefined,
      action: hasSub ? undefined : () => run(it, ctx)
    })
  }
  // 尾部悬空分隔线（后面项全被 visible 剪掉）
  while (out.length && out[out.length - 1].isSeparator) out.pop()
  return out
}

/**
 * 自定义段（已经 buildCustomMenuItems 转换过的 RjMenuItem）与内置段拼接：
 * 两侧都非空时补一条分隔线，任一为空则原样返回（空菜单不弹由网格侧判 length）。
 */
export function joinMenuSections(builtIn: RjMenuItem[], custom: RjMenuItem[]): RjMenuItem[] {
  if (!custom.length) return builtIn
  if (!builtIn.length) return custom
  // 内置段已以分隔线收尾时不叠加，避免双悬空线
  if (builtIn[builtIn.length - 1].isSeparator) return [...builtIn, ...custom]
  return [...builtIn, { isSeparator: true }, ...custom]
}

/**
 * 右键目标是否在可编辑元素内（单元格编辑器 / 浮动筛选输入框 / 弹层搜索框）：
 * 是则网格不接管菜单，保留浏览器原生复制/粘贴右键菜单。
 * 入参为任意 event.target，非 Element 时返回 false。
 */
export function isEditableContextTarget(target: unknown): boolean {
  const el = target as HTMLElement | null
  return !!el?.closest?.('input,textarea,[contenteditable]:not([contenteditable="false"])')
}

/**
 * 用户是否在网格内选中了文字（准备右键复制）：是则右键不接管，
 * 放行浏览器原生菜单的「复制」——否则选中单元格文本后右键只会弹组件菜单，值拷不出去。
 * 入参：网格根节点 + window.getSelection() 结果；选区起点或终点任一在网格内即算。
 */
export function hasUserTextSelection(
  root: Node | null | undefined,
  sel: { isCollapsed?: boolean; anchorNode?: Node | null; focusNode?: Node | null; toString?: () => string } | null
): boolean {
  if (!root || !sel || sel.isCollapsed) return false
  if (!String(sel.toString?.() ?? '')) return false
  const inRoot = (n: Node | null | undefined) => !!n && root.contains(n)
  return inRoot(sel.anchorNode) || inRoot(sel.focusNode)
}
