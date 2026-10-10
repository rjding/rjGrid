// rj-grid 打印 / PDF 导出器：零第三方依赖，走「隐藏 iframe + 浏览器打印」管线。
// 浏览器打印对话框可选「另存为 PDF」，即得矢量 PDF；同一管线服务打印与 PDF 导出。
// buildPrintHtml 为纯函数（不依赖 DOM、不含时间戳/随机），便于单元测试与快照。
import type { RjPrintOptions } from './types'

export type { RjPrintOptions }

/** 打印列描述（叶子列） */
export interface RjPrintColumn {
  title: string
  /** 期望宽度（px）；用于 colgroup 按比例分配，缩放适配时可忽略 */
  width?: number
  align?: 'left' | 'center' | 'right'
}

/** 多级列头单元格：colSpan 之和须等于列数 */
export interface RjPrintHeaderCell {
  title: string
  colSpan: number
  /** 跨行（叶子列在多级表头中占据到表头底部），默认 1 */
  rowSpan?: number
}

/** buildPrintHtml 输入：列 + 可选多级列头 + 纯数据行（不含表头） */
export interface RjPrintInput {
  columns: RjPrintColumn[]
  /** 外层在前，逐层向下；缺省时用 columns.title 作单层表头 */
  headerLevels?: RjPrintHeaderCell[][]
  /** 仅数据行；行内元素按 columns 顺序 */
  matrix: any[][]
  /** 与 matrix 对齐的行样式：0 普通 / 1 分组小计 / 2 总计汇总 */
  rowStyles?: number[]
}

const PAGE_SIZES: Record<string, string> = {
  A4: '297mm 210mm',
  A5: '210mm 148mm',
  Letter: '279.4mm 215.9mm',
  Legal: '355.6mm 215.9mm'
}

const escHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** 单元格值 → 文本（对象转 JSON，其余 String）；数字保持原样供右对齐判断 */
function cellText(v: any): string {
  if (v == null) return ''
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

/** 页码文案模板（内置中文兜底；实际取词由调用端经 pageNumberText 注入当前语言） */
export const DEFAULT_PAGE_TEXT = '第 {p} 页 / 共 {t} 页'

/** 将 "{p}/{t}" 模板转为 CSS @page content 值：文本段加引号，占位符转 counter() */
function pageContentCss(tpl: string): string {
  const quote = (s: string) => `"${s.replace(/"/g, '\\"')}"`
  const re = /\{p\}|\{t\}/g
  const seg: string[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(tpl))) {
    seg.push(quote(tpl.slice(last, m.index)), m[0] === '{p}' ? 'counter(page)' : 'counter(pages)')
    last = m.index + 3
  }
  seg.push(quote(tpl.slice(last)))
  return seg.join(' ')
}

function norm(
  o?: RjPrintOptions
): Required<
  Pick<
    RjPrintOptions,
    | 'pageSize'
    | 'orientation'
    | 'margins'
    | 'scaleToFit'
    | 'showGridLines'
    | 'zebra'
    | 'headerDark'
    | 'pageNumbers'
    | 'pageNumberText'
    | 'docLang'
  >
> &
  RjPrintOptions {
  return {
    pageSize: o?.pageSize ?? 'A4',
    orientation: o?.orientation ?? 'landscape',
    margins: o?.margins ?? 10,
    scaleToFit: o?.scaleToFit ?? false,
    showGridLines: o?.showGridLines ?? true,
    zebra: o?.zebra ?? true,
    headerDark: o?.headerDark ?? true,
    pageNumbers: o?.pageNumbers ?? true,
    pageNumberText: o?.pageNumberText ?? DEFAULT_PAGE_TEXT,
    docLang: o?.docLang ?? 'zh',
    ...o
  }
}

/** 构造打印文档 HTML（纯函数，确定性输出） */
export function buildPrintHtml(input: RjPrintInput, opts: RjPrintOptions = {}): string {
  const o = norm(opts)
  const cols = input.columns
  const n = cols.length
  const sizeKey = PAGE_SIZES[o.pageSize] ? o.pageSize : 'A4'
  const baseSize = PAGE_SIZES[sizeKey]
  const pageBox = o.pageSize === 'auto' ? '' : `size: ${baseSize};`
  const orient = o.orientation === 'portrait' ? 'portrait' : 'landscape'

  // 表头层级：缺省用单层列标题
  const levels: RjPrintHeaderCell[][] =
    input.headerLevels && input.headerLevels.length
      ? input.headerLevels
      : [cols.map((c) => ({ title: c.title, colSpan: 1 }))]

  // colgroup：按列宽比例（缩放适配时忽略固定宽，交给 table-layout:auto）
  const totalW = cols.reduce((s, c) => s + (c.width && c.width > 0 ? c.width : 120), 0) || 1
  const colgroup = o.scaleToFit
    ? ''
    : `<colgroup>${cols
        .map((c) => {
          const w = (c.width && c.width > 0 ? c.width : 120) / totalW
          return `<col style="width:${(w * 100).toFixed(3)}%"/>`
        })
        .join('')}</colgroup>`

  const thead = (() => {
    const occ: number[] = new Array(n).fill(0) // 每列被上方 rowspan 占用的剩余行数
    return `<thead>${levels
      .map((row) => {
        const parts: string[] = []
        let col = 0
        for (const cell of row) {
          while (col < n && occ[col] > 0) col++ // 跳过被上方占用的列
          const cSpan = Math.max(1, cell.colSpan || 1)
          const rSpan = Math.max(1, cell.rowSpan || 1)
          for (let c = col; c < col + cSpan && c < n; c++) occ[c] = rSpan
          const cAttr = cSpan > 1 ? ` colspan="${cSpan}"` : ''
          const rAttr = rSpan > 1 ? ` rowspan="${rSpan}"` : ''
          parts.push(`<th${cAttr}${rAttr}>${escHtml(cell.title)}</th>`)
          col += cSpan
        }
        for (let c = 0; c < n; c++) if (occ[c] > 0) occ[c]-- // 本行结束，占用计数递减
        return `<tr class="rj-hrow">${parts.join('')}</tr>`
      })
      .join('')}</thead>`
  })()

  const bodyRows = input.matrix
    .map((r, ri) => {
      const styleKind = input.rowStyles?.[ri] ?? 0
      const cls = styleKind === 1 ? ' class="rj-group"' : styleKind === 2 ? ' class="rj-total"' : ''
      const tds = r
        .map((v, ci) => {
          const align = cols[ci]?.align ?? (typeof v === 'number' ? 'right' : 'left')
          const a = align && align !== 'left' ? ` style="text-align:${align}"` : ''
          return `<td${a}>${escHtml(cellText(v))}</td>`
        })
        .join('')
      // 保证列数对齐（数据行短于列数时补空）
      const pad = n - r.length
      const padTds = pad > 0 ? '<td></td>'.repeat(pad) : ''
      return `<tr${cls}>${tds}${padTds}</tr>`
    })
    .join('')

  const titleHtml = o.title ? `<h1 class="rj-print-title">${escHtml(o.title)}</h1>` : ''
  const subHtml = o.header ? `<div class="rj-print-sub">${escHtml(o.header)}</div>` : ''
  const footHtml = o.footer ? `<div class="rj-print-footer">${escHtml(o.footer)}</div>` : ''

  const border = o.showGridLines ? '1px solid #c9ced6' : 'none'
  const headBg = o.headerDark ? '#4472c4' : '#eef1f6'
  const headColor = o.headerDark ? '#ffffff' : '#1f2329'
  const zebraRule = o.zebra ? 'tbody tr:nth-child(even) td{background:#f7f9fc}' : ''
  // 大表关「逐行 break-inside:avoid」：每行禁止跨页会让浏览器分页算法按行数放大、上千行时排版极慢甚至假死；
  // 小表（便于单行不拆页）仍保留。
  const rowBreakRule =
    input.matrix.length > 300
      ? 'tr { break-inside: auto; page-break-inside: auto; }'
      : 'tr { page-break-inside: avoid; break-inside: avoid; }'

  const style = `
@page { ${pageBox} margin: ${o.margins}mm; }
${
  o.pageNumbers
    ? `@page { @bottom-center { content: ${pageContentCss(o.pageNumberText)}; font-size: 10px; color: #999; } }`
    : ''
}
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: -apple-system, "Segoe UI", "Microsoft YaHei", Arial, sans-serif; color: #1f2329; }
.rj-print-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.rj-print-sub { font-size: 12px; color: #666; margin: 0 0 10px; }
table { border-collapse: collapse; width: 100%; table-layout: ${o.scaleToFit ? 'auto' : 'fixed'}; font-size: 12px; }
thead { display: table-header-group; }
${rowBreakRule}
th, td { border: ${border}; padding: 4px 8px; text-align: left; vertical-align: top; word-break: break-word; }
thead th { background: ${headBg}; color: ${headColor}; font-weight: 600; text-align: center; }
${zebraRule}
tbody tr.rj-group td { background: #eef1f6; font-weight: 600; }
tbody tr.rj-total td { background: #fff7e0; font-weight: 700; }
.rj-print-foot { position: fixed; left: 0; right: 0; bottom: 0; text-align: center; font-size: 11px; color: #999; }
.rj-print-footer { margin-top: 10px; font-size: 11px; color: #888; text-align: right; }
`.trim()

  return `<!DOCTYPE html>
<html lang="${escHtml(o.docLang)}"><head><meta charset="utf-8"/><title>${escHtml(
    o.docTitle || o.title || 'RJGrid'
  )}</title>
<meta name="orientation" content="${orient}"/>
<style>${style}</style>
</head><body>
${titleHtml}${subHtml}
<table>${colgroup}${thead}<tbody>${bodyRows}</tbody></table>
${footHtml}
</body></html>`
}

/**
 * 打开隐藏 iframe 并调用浏览器打印（打印对话框可「另存为 PDF」）。
 * 返回文档 HTML 长度仅供调用方参考；打印后自动清理 iframe。
 */
export function openPrintDialog(html: string): void {
  const existing = document.getElementById('__rj_print_frame__')
  if (existing) existing.remove()
  const frame = document.createElement('iframe')
  frame.id = '__rj_print_frame__'
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (doc) {
    doc.open()
    doc.write(html)
    doc.close()
  } else {
    frame.srcdoc = html
  }
  const run = () => {
    try {
      const w = frame.contentWindow
      if (!w) return
      w.focus()
      w.print()
    } finally {
      // 打印结束（或对话框关闭）后清理，避免残留 iframe
      const cleanup = () => {
        setTimeout(() => {
          if (frame.parentNode) frame.remove()
        }, 1000)
      }
      try {
        frame.contentWindow?.addEventListener?.('afterprint', cleanup)
      } catch {
        cleanup()
      }
      setTimeout(cleanup, 60000)
    }
  }
  // 等待 iframe 内容布局完成再触发打印
  if (frame.contentDocument?.readyState === 'complete') setTimeout(run, 60)
  else frame.onload = () => setTimeout(run, 60)
}

/** 便捷封装：构造 HTML 并立即打印 */
export function printHtml(input: RjPrintInput, opts: RjPrintOptions = {}): void {
  openPrintDialog(buildPrintHtml(input, opts))
}
