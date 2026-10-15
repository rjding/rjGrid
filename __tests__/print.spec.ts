// print.ts 纯函数单元测试（buildPrintHtml：不依赖 DOM、确定性输出）
import { describe, it, expect } from './harness'
import { buildPrintHtml, type RjPrintInput } from '../src/print'

const count = (hay: string, needle: string) => hay.split(needle).length - 1

describe('print.buildPrintHtml 单层表头', () => {
  const input: RjPrintInput = {
    columns: [
      { title: '名称', width: 120 },
      { title: '数量', width: 80 }
    ],
    matrix: [
      ['轴承', 10],
      ['电机', 5]
    ]
  }
  const html = buildPrintHtml(input)

  it('生成完整 HTML 文档结构', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html.includes('<table>')).toBe(true)
    expect(html.includes('</tbody></table>')).toBe(true)
  })
  it('单层表头：一行表头、每列一个 th', () => {
    expect(count(html, '<tr class="rj-hrow">')).toBe(1)
    expect(count(html, '</th>')).toBe(2)
    expect(html.includes('>名称<')).toBe(true)
    expect(html.includes('>数量<')).toBe(true)
  })
  it('数据行数与单元格匹配，数字自动右对齐', () => {
    expect(count(html, '<td')).toBe(4)
    expect(html.includes('<td style="text-align:right">10</td>')).toBe(true)
    expect(html.includes('<td>轴承</td>')).toBe(true)
  })
  it('colgroup 按列宽比例分配百分比', () => {
    expect(html.includes('<colgroup>')).toBe(true)
    // 120 : 80 → 60% : 40%
    expect(html.includes('width:60.000%')).toBe(true)
    expect(html.includes('width:40.000%')).toBe(true)
  })
  it('相同输入输出完全一致（无时间戳/随机，确定性）', () => {
    expect(buildPrintHtml(input)).toBe(html)
  })
})

describe('print.buildPrintHtml HTML 转义', () => {
  const html = buildPrintHtml({
    columns: [{ title: 'a<b' }, { title: 'c&d' }],
    matrix: [['<script>"x"</script>', 'p&q']]
  })
  it('表头与单元格文本均转义', () => {
    expect(html.includes('a&lt;b')).toBe(true)
    expect(html.includes('c&amp;d')).toBe(true)
    expect(html.includes('&lt;script&gt;')).toBe(true)
    expect(html.includes('&quot;x&quot;')).toBe(true)
    expect(html.includes('p&amp;q')).toBe(true)
    expect(html.includes('<script>')).toBe(false)
  })
})

describe('print.buildPrintHtml 多级列头 rowspan/colspan', () => {
  // 结构：[ code(rowSpan2) | 地址信息(colSpan2) -> [省, 市] ]
  const html = buildPrintHtml({
    columns: [{ title: '编码' }, { title: '省' }, { title: '市' }],
    headerLevels: [
      [
        { title: '编码', colSpan: 1, rowSpan: 2 },
        { title: '地址', colSpan: 2, rowSpan: 1 }
      ],
      [
        { title: '省', colSpan: 1 },
        { title: '市', colSpan: 1 }
      ]
    ],
    matrix: [['A', '浙', '杭']]
  })
  it('两行表头', () => {
    expect(count(html, '<tr class="rj-hrow">')).toBe(2)
  })
  it('跨列组用 colspan，跨行叶子用 rowspan', () => {
    expect(html.includes('<th colspan="2">地址</th>')).toBe(true)
    expect(html.includes('<th rowspan="2">编码</th>')).toBe(true)
  })
  it('被 rowspan 占用的列不在次行重复渲染（省/市 承接）', () => {
    const secondRow = html.split('<tr class="rj-hrow">')[2]
    expect(secondRow.includes('编码')).toBe(false)
    expect(secondRow.includes('>省<')).toBe(true)
    expect(secondRow.includes('>市<')).toBe(true)
  })
})

describe('print.buildPrintHtml 行样式', () => {
  const html = buildPrintHtml({
    columns: [{ title: 'A' }, { title: 'B' }],
    matrix: [
      ['g', 1],
      ['d', 2],
      ['t', 3]
    ],
    rowStyles: [1, 0, 2]
  })
  it('分组行 rj-group、汇总行 rj-total、普通行无类', () => {
    expect(html.includes('<tr class="rj-group">')).toBe(true)
    expect(html.includes('<tr class="rj-total">')).toBe(true)
    expect(count(html, '<tr class="rj-group">')).toBe(1)
    expect(count(html, '<tr class="rj-total">')).toBe(1)
  })
})

describe('print.buildPrintHtml 选项', () => {
  const base: RjPrintInput = { columns: [{ title: 'A' }], matrix: [['x']] }
  it('标题/页眉/页脚文本渲染并转义', () => {
    const html = buildPrintHtml(base, { title: 'T<1>', header: 'H', footer: 'F' })
    expect(html.includes('<h1 class="rj-print-title">T&lt;1&gt;</h1>')).toBe(true)
    expect(html.includes('class="rj-print-sub">H<')).toBe(true)
    expect(html.includes('class="rj-print-footer">F<')).toBe(true)
  })
  it('方向与纸张写入 @page', () => {
    const html = buildPrintHtml(base, { pageSize: 'A4', orientation: 'portrait' })
    expect(html.includes('size: 297mm 210mm')).toBe(true)
    expect(html.includes('content="portrait"')).toBe(true)
  })
  it('pageNumbers=false 时不输出页码 margin box', () => {
    const off = buildPrintHtml(base, { pageNumbers: false })
    const on = buildPrintHtml(base, { pageNumbers: true })
    expect(off.includes('counter(page)')).toBe(false)
    expect(on.includes('counter(page)')).toBe(true)
  })
  it('页码默认中文模板拆为 counter 段', () => {
    expect(
      buildPrintHtml(base).includes('content: "第 " counter(page) " 页 / 共 " counter(pages) " 页"')
    ).toBe(true)
  })
  it('pageNumberText 按当前语言注入（英文模板）', () => {
    const html = buildPrintHtml(base, { pageNumberText: 'Page {p} of {t}' })
    expect(html.includes('content: "Page " counter(page) " of " counter(pages)')).toBe(true)
  })
  it('pageNumberText 内的双引号被转义（不破坏 CSS）', () => {
    const html = buildPrintHtml(base, { pageNumberText: 'p"x{p}y' })
    expect(html.includes('content: "p\\"x" counter(page)')).toBe(true)
  })
  it('docLang / docTitle 本地化输出', () => {
    const zh = buildPrintHtml(base, {})
    expect(zh.includes('<html lang="zh">')).toBe(true)
    const en = buildPrintHtml(base, { docLang: 'en', docTitle: 'Report' })
    expect(en.includes('<html lang="en">')).toBe(true)
    expect(en.includes('<title>Report</title>')).toBe(true)
  })
  it('showGridLines=false 边框透明', () => {
    expect(buildPrintHtml(base, { showGridLines: false }).includes('border: none')).toBe(true)
  })

  it('scaleToFit 关闭 colgroup 且 table-layout:auto', () => {
    const html = buildPrintHtml(base, { scaleToFit: true })
    expect(html.includes('<colgroup>')).toBe(false)
    expect(html.includes('table-layout: auto')).toBe(true)
  })
  it('zebra=false 不生成斑马纹规则', () => {
    expect(buildPrintHtml(base, { zebra: false }).includes('nth-child(even)')).toBe(false)
  })
})

describe('print.buildPrintHtml 边界', () => {
  it('空矩阵仅表头', () => {
    const html = buildPrintHtml({ columns: [{ title: 'A' }], matrix: [] })
    expect(html.includes('<tbody></tbody>')).toBe(true)
    expect(count(html, '<td')).toBe(0)
  })
  it('数据行短于列数时补空单元格对齐', () => {
    const html = buildPrintHtml({
      columns: [{ title: 'A' }, { title: 'B' }, { title: 'C' }],
      matrix: [['只有一列']]
    })
    // 1 实际 + 2 pad = 3 td
    expect(count(html, '<td')).toBe(3)
  })
  it('对象值序列化为 JSON', () => {
    const html = buildPrintHtml({ columns: [{ title: 'A' }], matrix: [[{ k: 1 }]] })
    expect(html.includes('{&quot;k&quot;:1}')).toBe(true)
  })
})
