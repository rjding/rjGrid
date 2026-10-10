// rj-grid 列状态：宽度 / 顺序 / 冻结 / 显隐 / 多级表头 / flex / 持久化
import { reactive } from 'vue'
import type { RjColumn, RjColStateItem } from './types'
import { colIdOf, collectLeaves, clampWidth } from './utils'

export interface RjLeafCol {
  col: RjColumn
  colId: string
  /** 当前宽度（px） */
  width: number
  /** 全宽坐标系下的左偏移（仅 normal 区有意义） */
  x: number
  fixed: 'left' | 'right' | null
  /** normal 区内的顺序号（列虚拟滚动二分用） */
  idx: number
}

export interface RjHeaderCell {
  col: RjColumn
  colId: string
  colSpan: number
  rowSpan: number
  level: number
  isGroup: boolean
}

export function useColumnState(sourceColumns: () => RjColumn[]) {
  // colId -> 用户状态（响应式容器，computed 自动追踪）
  const widthMap = reactive(new Map<string, number>())
  /**
   * colId -> 内容自适应宽（初始化时按「文本+图标」测得，数据变化时重测）。
   * 与 widthMap 分开：只有用户手动拖拽/显式定宽才进 widthMap（会被持久化保存），
   * 自适应播种不写 widthMap，因此不会被当成「用户调整过的宽度」存进视图。
   */
  const autoWidthMap = reactive(new Map<string, number>())
  /**
   * 显隐覆盖（三态）：true=强制隐藏，false=强制显示，无记录=跟随列定义。
   * 旧语义只登记 true（生效隐藏 = hideMap || col.hidden 的 OR 叠加），
   * 导致列定义里 hidden:true 的列既打不开、面板又把它误显示成可见。
   */
  const hideMap = reactive(new Map<string, boolean>())
  /**
   * 冻结覆盖（三态）：'left' / 'right' = 强制钉到该侧，null = 强制不冻结，无记录 = 跟随列定义 fixed。
   * 只存 truthy 覆盖（旧语义 delete 即取消）会让列定义里写了 fixed 的列根本取消不了：
   * 删掉覆盖后下一句就回落到 fixed，图上看起来「点了没反应」。
   */
  const pinMap = reactive(new Map<string, 'left' | 'right' | null>())
  /** 叶子列 id 的相对顺序（-1 表示原始序） */
  const orderMap = reactive(new Map<string, number>())

  let viewportWidth = 0
  let suppressVirtualCols = false

  const allLeaves = (): RjColumn[] => collectLeaves(sourceColumns())

  /** 生效隐藏：用户覆盖优先，未覆盖时跟随列定义 hidden / visible */
  function isHiddenCol(col: RjColumn): boolean {
    const override = hideMap.get(colIdOf(col))
    if (override !== undefined) return override
    return !!col.hidden || col.visible === false
  }
  /** 按 colId 查生效隐藏（供 toggleHide / 外部 api 用） */
  function isColumnHidden(colId: string): boolean {
    const col = allLeaves().find((c) => colIdOf(c) === colId)
    if (col) return isHiddenCol(col)
    return !!hideMap.get(colId)
  }

  function setViewportWidth(w: number) {
    viewportWidth = w
  }
  function setSuppressVirtual(v: boolean) {
    suppressVirtualCols = v
  }

  /** 按 colId 查生效冻结（面板与布局共用，避免各处重抄覆盖优先级） */
  function pinOf(col: RjColumn): 'left' | 'right' | null {
    const override = pinMap.get(colIdOf(col))
    if (override !== undefined) return override
    return col.fixed || null
  }

  /** 当前可见叶子列（含隐藏判定前的全量，供面板使用） */
  function listLeafColumns(): RjColumn[] {
    return allLeaves()
  }

  /** 面板用：叶子列 + 当前 UI 状态（响应式；hidden 为生效显隐，非仅用户覆盖） */
  function listLeafUi(): {
    col: RjColumn
    colId: string
    hidden: boolean
    pinned: 'left' | 'right' | null
  }[] {
    return orderedIds()
      .map((id) => {
        const col = allLeaves().find((c) => colIdOf(c) === id)
        return col
          ? {
              col,
              colId: id,
              hidden: isHiddenCol(col),
              // 面板必须报「生效冻结」而非「用户覆盖」：只读 pinMap 会把「定义里就 fixed」
              // 的列报成未冻结，与 computeLayout 摆的位置自相矛盾
              pinned: pinOf(col)
            }
          : null
      })
      .filter(Boolean) as {
      col: RjColumn
      colId: string
      hidden: boolean
      pinned: 'left' | 'right' | null
    }[]
  }

  /** 计算三区列布局 */
  function computeLayout() {
    const visible = allLeaves().filter((c) => !isHiddenCol(c))
    // 排序：orderMap 优先，未登记的保持原始序排在其后
    const maxOrder = Math.max(0, ...Array.from(orderMap.values()))
    const ordered = visible.map((c, i) => {
      const id = colIdOf(c)
      const o = orderMap.get(id)
      return { c, key: o == null ? maxOrder + 1 + i : o }
    })
    ordered.sort((a, b) => a.key - b.key)
    const cols = ordered.map((l) => l.c)

    const baseW = (c: RjColumn): number => {
      const id = colIdOf(c)
      return clampWidth(widthMap.get(id) ?? c.width ?? autoWidthMap.get(id) ?? 120, c)
    }

    const left: RjColumn[] = []
    const normal: RjColumn[] = []
    const right: RjColumn[] = []
    cols.forEach((c) => {
      const p = pinOf(c)
      if (p === 'left') left.push(c)
      else if (p === 'right') right.push(c)
      else normal.push(c)
    })

    const toLeaf = (c: RjColumn, fixed: 'left' | 'right' | null): RjLeafCol => ({
      col: c,
      colId: colIdOf(c),
      width: baseW(c),
      x: 0,
      fixed,
      idx: 0
    })

    const leftLeaves = left.map((c) => toLeaf(c, 'left'))
    const rightLeaves = right.map((c) => toLeaf(c, 'right'))
    const normalLeaves = normal.map((c, i) => ({ ...toLeaf(c, null), idx: i }))

    const leftW = leftLeaves.reduce((s, l) => s + l.width, 0)
    const rightW = rightLeaves.reduce((s, l) => s + l.width, 0)

    // flex 分配
    const flexCols = normalLeaves.filter((l) => l.col.flex)
    if (flexCols.length && viewportWidth > 0) {
      const fixedNormal = normalLeaves.reduce((s, l) => s + (l.col.flex ? 0 : l.width), 0)
      const remain = Math.max(viewportWidth - leftW - rightW - fixedNormal, 0)
      const totalFlex = flexCols.reduce((s, l) => s + (l.col.flex || 1), 0)
      flexCols.forEach((l) => {
        l.width = Math.max(
          Math.floor((remain * (l.col.flex || 1)) / totalFlex),
          l.col.minWidth || 40
        )
      })
    }

    // 全局 x 坐标（逻辑全宽：冻结左 + 普通 + 冻结右），依次累加保证单调递增供二分查找
    let x = 0
    leftLeaves.forEach((l) => {
      l.x = x
      x += l.width
    })
    const normalStartX = x
    normalLeaves.forEach((l, i) => {
      l.idx = i
      l.x = x
      x += l.width
    })
    rightLeaves.forEach((l) => {
      l.x = x
      x += l.width
    })

    return {
      leftLeaves,
      normalLeaves,
      rightLeaves,
      totalWidth: x,
      leftWidth: leftW,
      rightWidth: rightW,
      /** 普通区起始 x（用于列虚拟滚动坐标换算） */
      normalStartX,
      /** 是否启用列虚拟滚动 */
      virtualCols: !suppressVirtualCols && normalLeaves.length > 40,
      allCols: cols
    }
  }

  /** 多级表头行（第一维是层，含 rowspan/colspan） */
  function computeHeaderRows(): { rows: RjHeaderCell[][]; depth: number } {
    const cols = sourceColumns()
    const depth = (function d(list: RjColumn[]): number {
      let m = 1
      list.forEach((c) => {
        if (c.children?.length) m = Math.max(m, 1 + d(c.children))
      })
      return m
    })(cols)
    const rows: RjHeaderCell[][] = Array.from({ length: depth }, () => [])
    const isHidden = (c: RjColumn) => isHiddenCol(c)
    const walk = (list: RjColumn[], level: number) => {
      list.forEach((c) => {
        if (isHidden(c)) return
        if (c.children?.length) {
          const visChildren = c.children.filter((ch) => !isHidden(ch))
          if (!visChildren.length) return
          const leafCount = collectLeaves([c]).filter((l) => !isHidden(l)).length
          const cell: RjHeaderCell = {
            col: c,
            colId: colIdOf(c),
            colSpan: leafCount,
            rowSpan: 1,
            level,
            isGroup: true
          }
          rows[level].push(cell)
          walk(c.children, level + 1)
        } else {
          const p = pinOf(c)
          rows[level].push({
            col: c,
            colId: colIdOf(c),
            colSpan: 1,
            rowSpan: depth - level,
            level,
            isGroup: false
          })
          void p
        }
      })
    }
    walk(cols, 0)
    return { rows, depth }
  }

  // ---------------- 操作 ----------------

  function resize(colId: string, width: number) {
    const col = allLeaves().find((c) => colIdOf(c) === colId)
    widthMap.set(colId, clampWidth(width, col || undefined))
  }

  /** 播种内容自适应宽（主组件初始化/数据变化时调用）：不进 widthMap，故不会被持久化 */
  function setAutoWidth(colId: string, width: number) {
    autoWidthMap.set(colId, width)
  }

  /**
   * 是否已有「用户/定义」主导的宽度（有则跳过自适应）：
   * widthMap=用户拖拽或持久化恢复；显式 width；flex 列由视口分配。三者任一成立都不自动撑宽。
   */
  function hasSizedWidth(colId: string): boolean {
    if (widthMap.has(colId)) return true
    const col = allLeaves().find((c) => colIdOf(c) === colId)
    return !!col?.width || !!col?.flex
  }

  /** 自适应宽度：按比例缩放普通区（非冻结、非 flex）列，使总宽填满视口 */
  function sizeToFit() {
    if (viewportWidth <= 0) return
    const visible = allLeaves().filter((c) => !isHiddenCol(c))
    const pinnedW = visible
      .filter((c) => pinOf(c))
      .reduce((s, c) => s + clampWidth(widthMap.get(colIdOf(c)) ?? c.width ?? 120, c), 0)
    const normal = visible.filter((c) => !pinOf(c) && !c.flex)
    if (!normal.length) return
    const avail = Math.max(viewportWidth - pinnedW, 0)
    const cur = normal.map((c) => clampWidth(widthMap.get(colIdOf(c)) ?? c.width ?? 120, c))
    const total = cur.reduce((s, w) => s + w, 0)
    if (total <= 0) return
    const factor = avail / total
    normal.forEach((c, i) => {
      widthMap.set(colIdOf(c), clampWidth(Math.round(cur[i] * factor), c))
    })
  }

  /** 清除所有宽度覆盖（回退到列定义 width / 内容自适应默认宽），供「列宽自适应」二次点击还原用 */
  function clearWidths() {
    widthMap.clear()
  }

  function moveColumn(dragId: string, targetId: string) {
    if (dragId === targetId) return
    const ordered = orderedIds()
    const from = ordered.indexOf(dragId)
    const to = ordered.indexOf(targetId)
    if (from < 0 || to < 0) return
    ordered.splice(from, 1)
    ordered.splice(to, 0, dragId)
    ordered.forEach((id, i) => orderMap.set(id, i))
  }

  /** 当前全量叶子顺序（含隐藏列） */
  function orderedIds(): string[] {
    const leaves = allLeaves().map(colIdOf)
    const known = Array.from(orderMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => id)
      .filter((id) => leaves.includes(id))
    const rest = leaves.filter((id) => !known.includes(id))
    return [...known, ...rest]
  }

  /**
   * 设置冻结：传 'left' / 'right' 钉住，传 null 显式取消冻结（包括取消列定义里的 fixed）。
   * 不再用 delete 表示取消 —— 那样对 fixed 列等于没取消。
   */
  function togglePin(colId: string, pin: 'left' | 'right' | null) {
    pinMap.set(colId, pin)
  }

  /**
   * 切换显隐：不传 hide 则按生效态翻转，传 hide 则显式登记（可强制显示列定义 hidden 的列）。
   * 对「本就跟随列定义」的列首次翻转会写入覆盖项，从此该列由用户状态主导。
   */
  function toggleHide(colId: string, hide?: boolean) {
    hideMap.set(colId, hide ?? !isColumnHidden(colId))
  }

  // ---------------- 持久化 ----------------

  function getColumnState(): RjColStateItem[] {
    return orderedIds().map((id, i) => {
      const item: RjColStateItem = { colId: id, order: i }
      if (widthMap.has(id)) item.width = widthMap.get(id)
      // 三态都入库：hide=false 是「强制打开列定义 hidden 列」的覆盖，不存下来刷新就丢
      if (hideMap.has(id)) item.hide = hideMap.get(id) === true
      // 三态都入库：pinned:null 是「强制取消列定义 fixed」的覆盖，不存下来刷新就丢
      const p = pinMap.get(id)
      if (p !== undefined) item.pinned = p
      return item
    })
  }

  function applyColumnState(items?: RjColStateItem[] | null) {
    if (!items?.length) return
    widthMap.clear()
    hideMap.clear()
    pinMap.clear()
    orderMap.clear()
    items.forEach((it, i) => {
      if (it.width) widthMap.set(it.colId, it.width)
      if (it.hide !== undefined) hideMap.set(it.colId, !!it.hide)
      if (it.pinned !== undefined) pinMap.set(it.colId, it.pinned)
      orderMap.set(it.colId, it.order ?? i)
    })
  }

  function resetColumnState() {
    widthMap.clear()
    hideMap.clear()
    pinMap.clear()
    orderMap.clear()
  }

  return {
    setViewportWidth,
    setSuppressVirtual,
    listLeafColumns,
    listLeafUi,
    isColumnHidden,
    pinOf,
    computeLayout,
    computeHeaderRows,
    resize,
    setAutoWidth,
    hasSizedWidth,
    sizeToFit,
    clearWidths,
    moveColumn,
    togglePin,
    toggleHide,
    orderedIds,
    getColumnState,
    applyColumnState,
    resetColumnState
  }
}
