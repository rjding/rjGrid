// 行编辑弹窗 / 查询栏操作按钮内核单测（纯函数）：字段推导 / 批量写入 / 按钮求值
import { describe, it, expect } from './harness'
import { useRowModel } from '../src/useRowModel'
import {
  applyFormChanges,
  buildFormFields,
  createFormRow,
  fieldValue,
  formFieldKind,
  normalizeEditor,
  queryActionConfirm,
  queryActionDisabled
} from '../src/rowForm'
import type { RjColumn, RjQueryAction, RjRowData } from '../src/types'

const col = (over: Partial<RjColumn>): RjColumn => over as RjColumn
const rows = (...objs: Record<string, any>[]): RjRowData[] => objs as RjRowData[]

describe('rowForm.normalizeEditor / formFieldKind', () => {
  it('editor 裸字符串归一为配置对象', () => {
    expect(normalizeEditor(col({ field: 'a', editor: 'select' }))).toEqual({ type: 'select' })
    expect(normalizeEditor(col({ field: 'a' }))).toBe(undefined)
  })
  it('editor.type 优先，缺省由列预设 type 映射', () => {
    expect(formFieldKind(col({ field: 'a', type: 'money' }), { type: 'select' })).toBe('select')
    expect(formFieldKind(col({ field: 'a', type: 'money' }))).toBe('number')
    expect(formFieldKind(col({ field: 'b', type: 'datetime' }))).toBe('date')
    expect(formFieldKind(col({ field: 'c', type: 'boolean' }))).toBe('checkbox')
    expect(formFieldKind(col({ field: 'd', type: 'link' }))).toBe('text')
    // editor 声明为 richSelect/largeText 时映射 select/textarea
    expect(formFieldKind(col({ field: 'e' }), { type: 'richSelect' })).toBe('select')
    expect(formFieldKind(col({ field: 'f' }), { type: 'largeText' })).toBe('textarea')
  })
})

describe('rowForm.buildFormFields', () => {
  const cols: RjColumn[] = [
    col({ field: 'name', title: '名称' }), // 无 editor/editable：缺省不收
    col({ field: 'status', title: '状态', editor: 'select' }),
    col({ field: 'qty', title: '数量', editable: true, type: 'num' }),
    col({ field: '__check' }), // 引擎内部列剔除
    col({ colId: 'amount', title: '无字段列', editable: true }), // 无 field 剔除
    col({ field: 'remark', editor: { type: 'largeText', props: { rows: 6 } } })
  ]
  it('缺省准入：有 field、非内部列且声明 editor/editable', () => {
    const fs = buildFormFields(cols, undefined, rows({}))
    expect(fs.map((f) => f.field)).toEqual(['status', 'qty', 'remark'])
    expect(fs[0].kind).toBe('select') // editor 裸串
    expect(fs[1].kind).toBe('number') // editable + type:num
    expect(fs[2].rows).toBe(6) // editor.props.rows 透出
    expect(fs[0].title).toBe('状态')
  })
  it('cfg.columns 钩子可整体替换准入规则', () => {
    const fs = buildFormFields(cols, { columns: (c) => c.field === 'name' }, rows({}))
    expect(fs.map((f) => f.field)).toEqual(['name'])
  })
  it('select 候选：静态直通，函数形式按首样本行求值', () => {
    const withFn = col({
      field: 'city',
      editor: { type: 'select', options: (r: any) => [{ label: r.city, value: r.city }] }
    })
    const fs = buildFormFields([withFn], undefined, rows({ city: '杭州' }, { city: '苏州' }))
    expect(fs[0].options).toEqual([{ label: '杭州', value: '杭州' }])
    const statics = col({ field: 's', editor: { type: 'select', options: [{ label: 'A', value: 1 }] } })
    expect(buildFormFields([statics], undefined, rows({}))[0].options).toEqual([
      { label: 'A', value: 1 }
    ])
  })
})

describe('rowForm.applyFormChanges / fieldValue', () => {
  it('批量写入所有行；未出现在 changes 的字段不覆盖', () => {
    const rs = rows(
      { __id: 1, status: '在库', qty: 10 },
      { __id: 2, status: '缺货', qty: 20 }
    )
    applyFormChanges(rs, { status: '冻结' })
    expect(rs.map((r: any) => r.status)).toEqual(['冻结', '冻结'])
    expect(rs.map((r: any) => r.qty)).toEqual([10, 20]) // 未勾选字段原样
  })
  it('a.b.c 路径读写；沿途对象缺失时静默忽略', () => {
    const rs = rows({ info: { name: 'x' } })
    applyFormChanges(rs, { 'info.name': 'y', 'miss.deep': 1 })
    expect(fieldValue(rs[0], 'info.name')).toBe('y')
    expect((rs[0] as any).miss).toBe(undefined)
  })
})

describe('rowForm.createFormRow（新增组行）', () => {
  it('preset 浅拷 + 表单值写入；不改动 preset 本身', () => {
    const preset = rows({ status: '待检' })[0]
    const row = createFormRow(preset, { code: 'M-10999', qty: 5 })
    expect(row).toEqual({ status: '待检', code: 'M-10999', qty: 5 })
    expect(Object.keys(preset)).toEqual(['status'], 'preset 不应被写入污染')
  })
  it('无 preset 也可组行；嵌套路径自动补建（区别于批量写入的静默忽略）', () => {
    const row = createFormRow(undefined, { 'info.addr.city': '杭州', name: '新物料' })
    expect(fieldValue(row, 'info.addr.city')).toBe('杭州')
    expect((row as any).name).toBe('新物料')
  })
})

describe('rowForm.queryActionDisabled / queryActionConfirm', () => {
  const act = (over: Partial<RjQueryAction>): RjQueryAction =>
    ({ name: 'a', onClick: () => undefined, ...over }) as RjQueryAction
  it('布尔直通；函数按选中行求值', () => {
    expect(queryActionDisabled(act({ disabled: true }), [])).toBe(true)
    expect(queryActionDisabled(act({ disabled: (r) => !r.length }), [])).toBe(true)
    expect(queryActionDisabled(act({ disabled: (r) => !r.length }), rows({}))).toBe(false)
    expect(queryActionDisabled(act({}), [])).toBe(false)
  })
  it('confirm 缺省空串；字符串直通、函数按行生成', () => {
    expect(queryActionConfirm(act({}), [])).toBe('')
    expect(queryActionConfirm(act({ confirm: '删?' }), [])).toBe('删?')
    expect(queryActionConfirm(act({ confirm: (r) => `删 ${r.length} 行` }), rows({}, {}))).toBe(
      '删 2 行'
    )
  })
})

describe('删除按钮下游：applyTransaction remove（client）', () => {
  // 回归：旧实现对遍历快照下标同时对活数组 splice，非相邻多选会删错相邻行（e2e 实测 N 删 N+1）
  it('多行非相邻 remove 只删目标行，相邻行保留', () => {
    const userRows = rows(
      { id: 1, v: 'a' },
      { id: 2, v: 'b' },
      { id: 3, v: 'c' },
      { id: 4, v: 'd' },
      { id: 5, v: 'e' }
    )
    const rm = useRowModel(() => userRows, {
      rowKey: () => 'id',
      rowHeight: () => 28,
      detailHeight: () => 120,
      fullWidthHeight: () => 80,
      hasDetailSlot: () => false,
      isFullWidthRow: () => false,
      dataMode: () => 'client',
      pageSize: () => 20,
      treeData: () => false,
      childrenField: () => 'children',
      parentField: () => 'parentId'
    })
    rm.setPipelineColumns([col({ field: 'id', type: 'num' }), col({ field: 'v' })])
    rm.applyTransaction({ remove: [userRows[1], userRows[3]] }) // 删 id=2 与 id=4
    const ids = rm.processed.value.displayRows.map((d) => (d.data as any).id)
    expect(ids).toEqual([1, 3, 5])
    expect(rm.sourceRows().length).toBe(3)
  })
})
