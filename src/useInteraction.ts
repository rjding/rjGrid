// rj-grid 交互：活动单元格 / 区域选择(Range) / 键盘导航 / 复制粘贴 / 填充柄 / 查找(Ctrl+F)
import { computed, ref, watch } from 'vue'
import type { RjFindMatch, RjRowData } from './types'
import type { RjLeafCol } from './useColumnState'
import type { RjDisplayRow } from './useRowModel'
import { parseTsv, toTsv, writeClipboard } from './export'
import { isMac, lowerBound } from './utils'

export interface InteractionCtx {
  /** 全局列序：冻结左 + 普通 + 冻结右（与视觉顺序一致） */
  gridCols: () => RjLeafCol[]
  displayRows: () => RjDisplayRow[]
  offsets: () => number[]
  rowHeight: () => number
  getCellValue: (row: RjRowData, colIndex: number) => any
  /**
   * 单元格的「文本」视图：复制/查找用。与 getCellValue 分离——图片列的原始值是
   * data URI / URL 列表，直接写进剪贴板或被查找匹配都会污染结果。
   */
  getCellText?: (row: RjRowData, colIndex: number) => any
  setCellValue: (row: RjRowData, colId: string, value: any) => void
  isCellEditable: (row: RjRowData, colIndex: number) => boolean
  startEdit: (r: number, c: number) => void
  scrollToCell: (r: number, c: number) => void
  viewportSize: () => { w: number; h: number }
  gridLeft: () => number
  gridTop: () => number
  onCellsChanged: (
    changes: { row: RjRowData; colId: string; newValue: any; oldValue: any }[]
  ) => void
  rangeChanged?: (range: RangePos | null) => void
  /** 复制时是否附带表头行（列标题） */
  copyHeaders?: () => boolean
  /** 粘贴前对原始剪贴板文本的转换钩子（返回转换后文本） */
  pasteTransformer?: (text: string) => string
}

export interface CellPos {
  r: number
  c: number
}

export interface RangePos {
  start: CellPos
  end: CellPos
}

const norm = (rp: RangePos): { r1: number; r2: number; c1: number; c2: number } => ({
  r1: Math.min(rp.start.r, rp.end.r),
  r2: Math.max(rp.start.r, rp.end.r),
  c1: Math.min(rp.start.c, rp.end.c),
  c2: Math.max(rp.start.c, rp.end.c)
})

export function useInteraction(ctx: InteractionCtx) {
  const active = ref<CellPos | null>(null)
  const range = ref<RangePos | null>(null)
  const cutting = ref(false)
  const draggingRange = ref(false)
  const draggingFill = ref(false)
  const fillPreview = ref<RangePos | null>(null)
  /** 追加的多选区（Ctrl+拖拽），主选区 range.value 之外的已提交区域 */
  const extraRanges = ref<RangePos[]>([])

  function commitRange() {
    const rp = range.value
    if (!rp) return
    const dup = extraRanges.value.some(
      (x) =>
        x.start.r === rp.start.r &&
        x.start.c === rp.start.c &&
        x.end.r === rp.end.r &&
        x.end.c === rp.end.c
    )
    if (!dup)
      extraRanges.value = [...extraRanges.value, { start: { ...rp.start }, end: { ...rp.end } }]
  }

  function allRanges(): RangePos[] {
    const out = [...extraRanges.value]
    if (range.value) out.push(range.value)
    return out
  }

  // ---------------- 查找 ----------------
  const findOpen = ref(false)
  const findQuery = ref('')
  const findMatches = ref<RjFindMatch[]>([])
  const findActive = ref(0)

  /** 剪贴板取值：有文本视图就用它（图片列降级为文件名），否则回落原始值 */
  const cellCopyText = (row: RjRowData, colIndex: number): any =>
    ctx.getCellText ? ctx.getCellText(row, colIndex) : ctx.getCellValue(row, colIndex)

  const cellText = (row: RjDisplayRow, colIndex: number): string => {
    const cols = ctx.gridCols()
    const col = cols[colIndex]
    if (!col) return ''
    const v = ctx.getCellText
      ? ctx.getCellText(row.data, colIndex)
      : ctx.getCellValue(row.data, colIndex)
    return v == null ? '' : String(v)
  }

  function applyFind() {
    findMatches.value = []
    findActive.value = 0
    const q = findQuery.value.toLowerCase()
    if (!q) return
    const rows = ctx.displayRows()
    const cols = ctx.gridCols()
    const limit = Math.min(rows.length, 3000)
    outer: for (let r = 0; r < limit; r++) {
      const row = rows[r]
      if (row.type !== 'row') continue
      for (let c = 0; c < cols.length; c++) {
        if (cols[c].col.checkbox || cols[c].col.rowDrag) continue
        const text = cellText(row, c).toLowerCase()
        let idx = text.indexOf(q)
        while (idx >= 0) {
          findMatches.value.push({
            rowIndex: r,
            colId: cols[c].colId,
            start: idx,
            end: idx + q.length
          })
          if (findMatches.value.length >= 5000) break outer
          idx = text.indexOf(q, idx + q.length)
        }
      }
    }
  }

  watch(findQuery, () => applyFind())

  function gotoMatch(i: number) {
    if (!findMatches.value.length) return
    findActive.value = (i + findMatches.value.length) % findMatches.value.length
    const m = findMatches.value[findActive.value]
    const c = ctx.gridCols().findIndex((cc) => cc.colId === m.colId)
    if (c >= 0) {
      active.value = { r: m.rowIndex, c }
      ctx.scrollToCell(m.rowIndex, c)
    }
  }

  function matchOf(rowIndex: number, colId: string): RjFindMatch[] | null {
    if (!findOpen.value || !findMatches.value.length) return null
    const list = findMatches.value.filter((m) => m.rowIndex === rowIndex && m.colId === colId)
    return list.length ? list : null
  }

  function activeMatchOf(rowIndex: number, colId: string): RjFindMatch | null {
    const m = findMatches.value[findActive.value]
    return m && m.rowIndex === rowIndex && m.colId === colId ? m : null
  }

  // ---------------- 指针交互 ----------------

  function cellFromPoint(x: number, y: number): CellPos | null {
    const rows = ctx.displayRows()
    if (!rows.length) return null
    const offs = ctx.offsets()
    // 行：offs[i] 为第 i 行顶部像素，accY 落在 [offs[i], offs[i+1]) → 应属第 i 行；
    // lowerBound 返回首个 >= accY 的下标（即 i+1），故须减 1。
    const accY = y + scrollTop()
    let r = lowerBound(offs.length ? offs : [0], accY, (i) => offs[i]) - 1
    if (r >= rows.length) r = rows.length - 1
    if (r < 0) r = 0
    // 列：线性扫（列数有限）
    const cols = ctx.gridCols()
    const accX = x + scrollLeft()
    let c = 0
    let acc = 0
    for (let i = 0; i < cols.length; i++) {
      if (accX < acc + cols[i].width) {
        c = i
        break
      }
      acc += cols[i].width
      c = i
    }
    return { r, c }
  }

  // 滚动位置由主组件注入
  let getScroll: () => { top: number; left: number } = () => ({ top: 0, left: 0 })
  function bindScroll(fn: () => { top: number; left: number }) {
    getScroll = fn
  }
  const scrollTop = () => getScroll().top
  const scrollLeft = () => getScroll().left

  function onPointerDown(pos: CellPos, e: PointerEvent) {
    const ctrl = isMac() ? e.metaKey : e.ctrlKey
    if (ctrl) {
      // 追加多区域：将当前主选区并入 extras，开始新的主选区
      commitRange()
      active.value = pos
      range.value = { start: { ...pos }, end: { ...pos } }
      draggingRange.value = true
      fillPreview.value = null
      ctx.rangeChanged?.(range.value)
      return
    }
    extraRanges.value = []
    active.value = pos
    if (e.shiftKey) {
      range.value = { start: range.value?.start || { ...pos }, end: { ...pos } }
    } else {
      range.value = { start: { ...pos }, end: { ...pos } }
      draggingRange.value = true
      fillPreview.value = null
    }
    ctx.rangeChanged?.(range.value)
  }

  function onPointerMove(pos: CellPos | null, e: PointerEvent) {
    if (!pos) return
    if (draggingRange.value) {
      range.value = range.value ? { start: range.value.start, end: { ...pos } } : null
      ctx.rangeChanged?.(range.value)
    } else if (draggingFill.value && range.value) {
      fillPreview.value = { start: range.value.start, end: { ...pos } }
    }
    void e
  }

  function onPointerUp() {
    if (draggingFill.value && fillPreview.value && range.value) {
      applyFill(fillPreview.value)
    }
    draggingRange.value = false
    draggingFill.value = false
    fillPreview.value = null
  }

  function startFill() {
    if (!range.value) return
    draggingFill.value = true
  }

  /** 填充：把源区域值按行循环复制到目标区 */
  function applyFill(target: RangePos) {
    const src = norm(range.value || target)
    const tgt = norm(target)
    const rows = ctx.displayRows()
    const cols = ctx.gridCols()
    const changes: { row: RjRowData; colId: string; newValue: any; oldValue: any }[] = []
    const srcRowCount = src.r2 - src.r1 + 1
    for (let c = src.c1; c <= Math.min(src.c2, tgt.c2 >= src.c2 ? tgt.c2 : src.c2); c++) {
      const col = cols[c]
      if (!col || col.col.checkbox || col.col.rowDrag) continue
      for (let r = Math.max(src.r1, tgt.r1); r <= tgt.r2; r++) {
        const rowIdx = r
        if (rowIdx > src.r2) {
          const dr = rows[rowIdx]
          const sr = rows[src.r1 + ((rowIdx - src.r1) % srcRowCount)]
          if (!dr || !sr || dr.type !== 'row' || sr.type !== 'row') continue
          if (!ctx.isCellEditable(dr.data, c)) continue
          const nv = ctx.getCellValue(sr.data, c)
          const ov = ctx.getCellValue(dr.data, c)
          if (nv !== ov) {
            ctx.setCellValue(dr.data, col.colId, nv)
            changes.push({ row: dr.data, colId: col.colId, newValue: nv, oldValue: ov })
          }
        }
      }
    }
    if (changes.length) {
      range.value = { start: { r: tgt.r1, c: tgt.c1 }, end: { r: tgt.r2, c: tgt.c2 } }
      ctx.onCellsChanged(changes)
    }
  }

  // ---------------- 区域数据 / 剪贴板 ----------------

  function matrixOf(rp: RangePos, withHeader = false): any[][] {
    const { r1, r2, c1, c2 } = norm(rp)
    const rows = ctx.displayRows()
    const out: any[][] = []
    if (withHeader) {
      const cols = ctx.gridCols()
      const head: any[] = []
      for (let c = c1; c <= c2; c++) head.push(cols[c]?.col?.title ?? cols[c]?.colId ?? '')
      out.push(head)
    }
    for (let r = r1; r <= r2; r++) {
      const row = rows[r]
      if (!row) continue
      const line: any[] = []
      for (let c = c1; c <= c2; c++) line.push(row.type === 'row' ? cellCopyText(row.data, c) : '')
      out.push(line)
    }
    return out
  }

  function rangeMatrix(): any[][] | null {
    if (!range.value) return null
    return matrixOf(range.value)
  }

  async function copyRange(cut = false): Promise<boolean> {
    const list = allRanges()
    if (!list.length) return false
    cutting.value = cut
    const withHead = !!ctx.copyHeaders?.()
    const blocks = list.map((rp) => matrixOf(rp, withHead)).filter((m) => m && m.length)
    if (!blocks.length) return false
    return writeClipboard(blocks.map((m) => toTsv(m)).join('\r\n\r\n'))
  }

  async function pasteFromText(text: string): Promise<boolean> {
    if (!range.value && !active.value) return false
    const anchor = range.value?.start || active.value!
    if (ctx.pasteTransformer) text = ctx.pasteTransformer(text)
    const matrix = parseTsv(text)
    if (!matrix.length || (matrix.length === 1 && !matrix[0][0])) return false
    const rows = ctx.displayRows()
    const cols = ctx.gridCols()
    const changes: { row: RjRowData; colId: string; newValue: any; oldValue: any }[] = []
    matrix.forEach((line, dr) => {
      line.forEach((v, dc) => {
        const r = anchor.r + dr
        const c = anchor.c + dc
        const row = rows[r]
        const col = cols[c]
        if (!row || !col || row.type !== 'row') return
        if (!ctx.isCellEditable(row.data, c)) return
        const ov = ctx.getCellValue(row.data, c)
        const nv = typeof ov === 'number' && v !== '' && !isNaN(Number(v)) ? Number(v) : v
        if (nv !== ov) {
          ctx.setCellValue(row.data, col.colId, nv)
          changes.push({ row: row.data, colId: col.colId, newValue: nv, oldValue: ov })
        }
      })
    })
    if (cutting.value && range.value) {
      // 剪切：源清空
      const { r1, r2, c1, c2 } = norm(range.value)
      for (let r = r1; r <= r2; r++) {
        const row = rows[r]
        if (!row || row.type !== 'row') continue
        for (let c = c1; c <= c2; c++) {
          const col = cols[c]
          if (!col || !ctx.isCellEditable(row.data, c)) continue
          const ov = ctx.getCellValue(row.data, c)
          if (ov !== null) {
            ctx.setCellValue(row.data, col.colId, null)
            changes.push({ row: row.data, colId: col.colId, newValue: null, oldValue: ov })
          }
        }
      }
      cutting.value = false
    }
    if (changes.length) ctx.onCellsChanged(changes)
    return changes.length > 0
  }

  // ---------------- 键盘 ----------------

  function moveActive(dr: number, dc: number, extend = false) {
    const curActive = active.value
    const base = extend && range.value ? range.value.end : curActive
    if (!base) {
      active.value = { r: 0, c: 0 }
      return
    }
    const rows = ctx.displayRows()
    const cols = ctx.gridCols()
    const r = Math.min(Math.max(base.r + dr, 0), Math.max(rows.length - 1, 0))
    const c = Math.min(Math.max(base.c + dc, 0), Math.max(cols.length - 1, 0))
    active.value = { r, c }
    if (extend) {
      // 首次扩展且尚无选区时，以扩展前的活动单元格为锚点，避免 range.value 为 null 崩溃
      const start = range.value ? range.value.start : curActive || { r, c }
      range.value = { start: { ...start }, end: { r, c } }
      ctx.rangeChanged?.(range.value)
    }
    ctx.scrollToCell(r, c)
  }

  /** 返回 true 表示已处理，外部不再默认行为 */
  function onKeydown(e: KeyboardEvent, editing: boolean): boolean {
    const ctrl = isMac() ? e.metaKey : e.ctrlKey
    if (editing) return false
    switch (e.key) {
      case 'ArrowUp':
        moveActive(-1, 0, e.shiftKey)
        e.preventDefault()
        return true
      case 'ArrowDown':
        if (e.shiftKey) moveActive(1, 0, true)
        else moveActive(1, 0)
        e.preventDefault()
        return true
      case 'ArrowLeft':
        if (e.shiftKey) moveActive(0, -1, true)
        else moveActive(0, -1)
        e.preventDefault()
        return true
      case 'ArrowRight':
        if (e.shiftKey) moveActive(0, 1, true)
        else moveActive(0, 1)
        e.preventDefault()
        return true
      case 'Tab': {
        if (active.value) moveActive(0, e.shiftKey ? -1 : 1)
        e.preventDefault()
        return true
      }
      case 'Enter': {
        if (active.value) {
          const rows = ctx.displayRows()
          const cols = ctx.gridCols()
          const row = rows[active.value.r]
          const col = cols[active.value.c]
          if (row?.type === 'row' && col && ctx.isCellEditable(row.data, active.value.c)) {
            ctx.startEdit(active.value.r, active.value.c)
          } else moveActive(1, 0)
        }
        e.preventDefault()
        return true
      }
      case 'F2': {
        if (active.value) ctx.startEdit(active.value.r, active.value.c)
        e.preventDefault()
        return true
      }
      case 'Escape':
        range.value = null
        extraRanges.value = []
        fillPreview.value = null
        ctx.rangeChanged?.(null)
        return true
      case ' ': {
        if (ctrl && active.value) {
          selectColumn(active.value.c)
          e.preventDefault()
          return true
        }
        if (e.shiftKey && active.value) {
          selectRow(active.value.r)
          e.preventDefault()
          return true
        }
        return false
      }
      case 'Home':
        if (active.value) {
          active.value = { ...active.value, c: 0 }
          ctx.scrollToCell(active.value.r, 0)
        }
        e.preventDefault()
        return true
      case 'End':
        if (active.value) {
          const c = ctx.gridCols().length - 1
          active.value = { ...active.value, c }
          ctx.scrollToCell(active.value.r, c)
        }
        e.preventDefault()
        return true
      case 'PageDown':
      case 'PageUp': {
        const { h } = ctx.viewportSize()
        const step = Math.max(Math.round(h / ctx.rowHeight()) - 1, 1)
        moveActive(e.key === 'PageDown' ? step : -step, 0)
        e.preventDefault()
        return true
      }
    }
    if (ctrl && (e.key === 'c' || e.key === 'C')) {
      copyRange(false)
      e.preventDefault()
      return true
    }
    if (ctrl && (e.key === 'x' || e.key === 'X')) {
      copyRange(true)
      e.preventDefault()
      return true
    }
    if (ctrl && (e.key === 'f' || e.key === 'F')) {
      findOpen.value = true
      e.preventDefault()
      return true
    }
    if (ctrl && (e.key === 'a' || e.key === 'A')) {
      const rows = ctx.displayRows()
      const cols = ctx.gridCols()
      if (rows.length && cols.length) {
        range.value = { start: { r: 0, c: 0 }, end: { r: rows.length - 1, c: cols.length - 1 } }
        ctx.rangeChanged?.(range.value)
      }
      e.preventDefault()
      return true
    }
    return false
  }

  /** 普通粘贴（由 paste 事件兜底，兼容无 clipboard 权限场景） */
  function onPaste(e: ClipboardEvent): boolean {
    if (editingRef.value) return false
    const text = e.clipboardData?.getData('text/plain')
    if (text && (range.value || active.value)) {
      pasteFromText(text)
      e.preventDefault()
      return true
    }
    return false
  }
  const editingRef = ref(false)

  function clearSelection() {
    active.value = null
    range.value = null
    extraRanges.value = []
    fillPreview.value = null
    ctx.rangeChanged?.(null)
  }

  /** 选择整列（单元格区域） */
  function selectColumn(colIndex: number, additive = false) {
    const rows = ctx.displayRows()
    const cols = ctx.gridCols()
    if (!rows.length || !cols[colIndex]) return
    if (additive) commitRange()
    else extraRanges.value = []
    active.value = { r: 0, c: colIndex }
    range.value = { start: { r: 0, c: colIndex }, end: { r: rows.length - 1, c: colIndex } }
    ctx.rangeChanged?.(range.value)
  }

  /** 选择整行（单元格区域） */
  function selectRow(rowIndex: number, additive = false) {
    const rows = ctx.displayRows()
    const cols = ctx.gridCols()
    if (!cols.length || !rows[rowIndex]) return
    if (additive) commitRange()
    else extraRanges.value = []
    active.value = { r: rowIndex, c: 0 }
    range.value = { start: { r: rowIndex, c: 0 }, end: { r: rowIndex, c: cols.length - 1 } }
    ctx.rangeChanged?.(range.value)
  }

  /** 任意选区的画布坐标矩形（用于多选区高亮） */
  function rangeRectOf(
    rp: RangePos
  ): { left: number; top: number; width: number; height: number } | null {
    const { r1, r2, c1, c2 } = norm(rp)
    const cols = ctx.gridCols()
    const offs = ctx.offsets()
    const rows = ctx.displayRows()
    if (!cols[c1] || !cols[c2] || !rows[r1]) return null
    const left = cols[c1].x
    const right = cols[c2].x + cols[c2].width
    const top = offs[r1] ?? 0
    const last = Math.min(r2, rows.length - 1)
    const bottom = (offs[last] ?? 0) + (rows[last]?.height ?? ctx.rowHeight())
    return { left, top, width: right - left, height: bottom - top }
  }

  /** 区域框样式（逻辑坐标，不含滚动） */
  const rangeRect = computed(() => {
    const rp = fillPreview.value || range.value
    if (!rp) return null
    const { r1, r2, c1, c2 } = norm(rp)
    const cols = ctx.gridCols()
    const offs = ctx.offsets()
    const rows = ctx.displayRows()
    if (!rows.length || !cols.length) return null
    let x = 0
    for (let i = 0; i < c1 && i < cols.length; i++) x += cols[i].width
    let w = 0
    for (let i = c1; i <= c2 && i < cols.length; i++) w += cols[i].width
    const top = offs[r1] ?? 0
    const lastH = rows[r2]?.height ?? ctx.rowHeight()
    const bottom = (offs[r2] ?? 0) + lastH
    return { left: x, top, width: w, height: bottom - top }
  })

  const activeRect = computed(() => {
    const a = active.value
    if (!a) return null
    const cols = ctx.gridCols()
    const offs = ctx.offsets()
    const rows = ctx.displayRows()
    const col = cols[a.c]
    const row = rows[a.r]
    if (!col || !row) return null
    let x = 0
    for (let i = 0; i < a.c && i < cols.length; i++) x += cols[i].width
    return { left: x, top: offs[a.r] ?? 0, width: col.width, height: row.height }
  })

  return {
    active,
    range,
    extraRanges,
    allRanges,
    rangeRectOf,
    selectColumn,
    selectRow,
    commitRange,
    draggingRange,
    draggingFill,
    startFill,
    rangeRect,
    activeRect,
    cellFromPoint,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeydown,
    onPaste,
    editingRef,
    copyRange,
    pasteFromText,
    rangeMatrix,
    clearSelection,
    moveActive,
    // find
    findOpen,
    findQuery,
    findMatches,
    findActive,
    gotoMatch,
    matchOf,
    activeMatchOf,
    bindScroll
  }
}
