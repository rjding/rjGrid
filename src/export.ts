// rj-grid 导出器：CSV + xlsx（手写 ZIP/SpreadsheetML，零第三方依赖）
import { downloadBlob } from './utils'

// ---------------- CSV ----------------

const csvCell = (v: any): string => {
  if (v == null) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsvText(matrix: any[][]): string {
  return matrix.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadCsv(matrix: any[][], fileName: string) {
  // \ufeff BOM 兼容 Excel 打开中文
  const blob = new Blob(['\ufeff' + toCsvText(matrix)], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, fileName.endsWith('.csv') ? fileName : fileName + '.csv')
}

// ---------------- CRC32 ----------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ---------------- ZIP (STORE) ----------------

interface ZipFile {
  name: string
  data: Uint8Array
}

/** 构造无压缩 ZIP（STORE），足够生成合法 xlsx */
function zipStore(files: ZipFile[]): Uint8Array {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  const u16 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff])
  const u32 = (n: number) =>
    new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff])
  const concat = (...parts: Uint8Array[]) => {
    const total = parts.reduce((s, p) => s + p.length, 0)
    const out = new Uint8Array(total)
    let pos = 0
    parts.forEach((p) => {
      out.set(p, pos)
      pos += p.length
    })
    return out
  }
  const dosDateTime = () => {
    const d = new Date()
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    return { time, date }
  }
  const { time: dosTime, date: dosDate } = dosDateTime()

  for (const f of files) {
    const nameBytes = enc.encode(f.name)
    const crc = crc32(f.data)
    const local = concat(
      u32(0x04034b50),
      u16(20),
      u16(0x0800), // UTF-8 名称标志
      u16(0), // store
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(f.data.length),
      u32(f.data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes
    )
    chunks.push(local, f.data)

    central.push(
      concat(
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(dosTime),
        u16(dosDate),
        u32(crc),
        u32(f.data.length),
        u32(f.data.length),
        u16(nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBytes
      )
    )
    offset += local.length + f.data.length
  }

  const centralBuf = concat(...central)
  const eocd = concat(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralBuf.length),
    u32(offset),
    u16(0)
  )
  return concat(...chunks, centralBuf, eocd)
}

// ---------------- XLSX ----------------

const xmlEsc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const colLetter = (idx: number): string => {
  let s = ''
  let n = idx + 1
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = (n - m - 1) / 26
  }
  return s
}

const enc = new TextEncoder()

const contentTypes = (n: number) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
  Array.from(
    { length: n },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join('') +
  `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

const workbookXml = (names: string[]) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
  names
    .map(
      (nm, i) =>
        `<sheet name="${xmlEsc(nm || 'Sheet' + (i + 1))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
    )
    .join('') +
  `</sheets></workbook>`

const workbookRels = (n: number) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  Array.from(
    { length: n },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  ).join('') +
  `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

// 样式：0 常规；1 表头（加粗+底色+边框+居中）；2 分组/汇总（加粗+浅底）；3 数字右对齐
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="宋体"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="宋体"/></font><font><b/><sz val="11"/><name val="宋体"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4472C4"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFB0B0B0"/></left><right style="thin"><color rgb="FFB0B0B0"/></right><top style="thin"><color rgb="FFB0B0B0"/></top><bottom style="thin"><color rgb="FFB0B0B0"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right"/></xf></cellXfs></styleSheet>`

export interface XlsxSheet {
  name: string
  matrix: any[][]
  colWidths?: number[]
  /** 每个样式 id：0 常规 1 表头 2 分组/汇总 3 数字 */
  rowStyles?: number[]
  /** 前多少行为表头（默认 1），用于冻结窗格 */
  headerRows?: number
}

function sheetXml(s: XlsxSheet): string {
  const headerRows = s.headerRows ?? 1
  const rows: string[] = []
  s.matrix.forEach((row, r) => {
    const styleId =
      s.rowStyles?.[r] ?? (r < headerRows ? 1 : headerRows > 0 && r === headerRows ? 0 : 0)
    const attr = styleId ? ` s="${styleId}"` : ''
    const cells: string[] = []
    row.forEach((v, c) => {
      const ref = `${colLetter(c)}${r + 1}`
      if (typeof v === 'number' && isFinite(v)) {
        cells.push(`<c r="${ref}"${attr || ' s="3"'}><v>${v}</v></c>`)
      } else if (v == null || v === '') {
        cells.push(`<c r="${ref}"${attr}/>`)
      } else {
        cells.push(
          `<c r="${ref}"${attr} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(String(v))}</t></is></c>`
        )
      }
    })
    rows.push(`<row r="${r + 1}">${cells.join('')}</row>`)
  })
  const widthXml = s.colWidths?.length
    ? `<cols>${s.colWidths
        .map(
          (w, i) =>
            `<col min="${i + 1}" max="${i + 1}" width="${Math.min(Math.max(w, 8), 60)}" customWidth="1"/>`
        )
        .join('')}</cols>`
    : ''
  const maxCols = s.matrix.length ? Math.max(...s.matrix.map((r) => r.length)) : 1
  const dimension = s.matrix.length
    ? `A1:${colLetter(Math.max(maxCols - 1, 0))}${s.matrix.length}`
    : 'A1'
  const pane =
    headerRows > 0
      ? `<pane ySplit="${headerRows}" topLeftCell="A${headerRows + 1}" activePane="bottomLeft" state="frozen"/>`
      : ''
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${dimension}"/><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>${widthXml}<sheetData>${rows.join('')}</sheetData></worksheet>`
  )
}

/** 多 sheet xlsx 工作簿 → Blob */
export function buildXlsxWorkbook(sheets: XlsxSheet[]): Blob {
  const list = sheets.length ? sheets : [{ name: 'Sheet1', matrix: [] }]
  const files: ZipFile[] = [
    { name: '[Content_Types].xml', data: enc.encode(contentTypes(list.length)) },
    { name: '_rels/.rels', data: enc.encode(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: enc.encode(workbookXml(list.map((s) => s.name))) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(workbookRels(list.length)) },
    { name: 'xl/styles.xml', data: enc.encode(STYLES) },
    ...list.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: enc.encode(sheetXml(s))
    }))
  ]
  return new Blob([zipStore(files) as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

/**
 * 单矩阵 → xlsx Blob（向后兼容）
 */
export function buildXlsxBlob(matrix: any[][], colWidths: number[] = []): Blob {
  return buildXlsxWorkbook([{ name: 'Sheet1', matrix, colWidths }])
}

export function downloadXlsx(matrix: any[][], fileName: string, colWidths: number[] = []) {
  downloadBlob(
    buildXlsxBlob(matrix, colWidths),
    fileName.endsWith('.xlsx') ? fileName : fileName + '.xlsx'
  )
}

export function downloadXlsxWorkbook(sheets: XlsxSheet[], fileName: string) {
  downloadBlob(
    buildXlsxWorkbook(sheets),
    fileName.endsWith('.xlsx') ? fileName : fileName + '.xlsx'
  )
}

// ---------------- 剪贴板 TSV ----------------

const tsvCell = (v: any): string => {
  if (v == null) return ''
  return String(v).replace(/[\t\r\n]/g, ' ')
}

export function toTsv(matrix: any[][]): string {
  return matrix.map((row) => row.map(tsvCell).join('\t')).join('\r\n')
}

/** 解析剪贴板文本（TSV，兼容引号包裹单元格） */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuote = false
      } else cur += ch
    } else if (ch === '"') inQuote = true
    else if (ch === '\t') {
      row.push(cur)
      cur = ''
    } else if (ch === '\n') {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else if (ch !== '\r') cur += ch
  }
  if (cur !== '' || row.length) {
    row.push(cur)
    rows.push(row)
  }
  return rows
}

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fallback 继续 */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export async function readClipboard(): Promise<string> {
  try {
    if (navigator.clipboard?.readText) return await navigator.clipboard.readText()
  } catch {
    /* 读权限被拒时走 paste 事件兜底 */
  }
  return ''
}
