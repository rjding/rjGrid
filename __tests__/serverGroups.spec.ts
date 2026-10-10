// serverGroups.ts 纯引擎单元测试（服务端权威分组：折叠隐藏子区间 + 子块懒取登记）
import { describe, it, expect } from './harness'
import { flattenServerGroups, decorateGroupRow } from '../src/serverGroups'
import type { RjRowData } from '../src/types'

const F = ['warehouse', 'area']
const cfg = (over?: Partial<Parameters<typeof flattenServerGroups>[1]>) => ({
  fields: F,
  keyOf: (r: RjRowData) => r.id as string | number,
  rowHeight: 30,
  ...over
})

// 组行：只给后端常见的最小字段
const g = (level: number, value: any, extra?: Record<string, any>): RjRowData =>
  ({ __group: true, __level: level, [F[level]]: value, ...extra }) as any
const d = (id: string, warehouse?: any, area?: any): RjRowData =>
  ({ id, warehouse, area }) as any as RjRowData

describe('serverGroups.flattenServerGroups 内联子行', () => {
  const items = [
    g(0, '华东仓', { __count: 2 }),
    d('r1', '华东仓', 'A区'),
    d('r2', '华东仓', 'B区'),
    g(0, '华北仓', { __count: 1 }),
    d('r3', '华北仓', 'C区')
  ]
  const r = flattenServerGroups(items, cfg())
  it('组行与数据行按序输出，组行补齐契约字段', () => {
    expect(r.rows.length).toBe(5, '5 行全可见')
    expect(r.rows[0].type).toBe('group')
    expect((r.rows[0].data as any).__groupValue).toBe('华东仓', '派生组值')
    expect((r.rows[0].data as any).__groupField).toBe('warehouse')
    expect((r.rows[0].data as any).__path).toBe('|0|' + encodeURIComponent('华东仓'), '派生 path')
    expect(r.rows[0].expanded).toBe(true)
    expect(r.rows[0].expandable).toBe(true)
    expect(r.rows[1].type).toBe('row')
    expect(r.rows[1].parentKey).toBe(r.rows[0].key, '数据行归属组 path')
  })
  it('内联子行齐备时不登记子块请求', () => {
    expect(r.needLoad.length).toBe(0)
  })
  it('显示下标 → 绝对下标一一对应', () => {
    expect(r.absAt.length).toBe(5)
    expect(r.absAt).toEqual([0, 1, 2, 3, 4])
  })
  it('收起顶层组：隐藏其内联子区间，兄弟组保留', () => {
    const path0 = String(r.rows[0].key)
    const c = flattenServerGroups(items, cfg({ collapsed: new Set([path0]) }))
    expect(c.rows.length).toBe(3, '藏 2 子行')
    expect(c.rows[0].expanded).toBe(false, '组行标为收起')
    expect(c.rows[1].key).toBe(r.rows[3].key, '下一个是兄弟组')
    expect(c.needLoad.length).toBe(0, '收起不发请求')
  })
  it('兄弟组不受影响', () => {
    expect(r.rows[3].type).toBe('group')
    expect(r.rows[3].expanded).toBe(true)
  })
})

describe('serverGroups.flattenServerGroups 多级嵌套', () => {
  const items = [
    g(0, '华东仓'),
    g(1, 'A区'),
    d('r1', '华东仓', 'A区'),
    g(1, 'B区'),
    d('r2', '华东仓', 'B区'),
    d('r3', '华北仓') // 更深组结束后回到本层的散落数据行
  ]
  const r = flattenServerGroups(items, cfg())
  it('层级与归属按 __level', () => {
    expect(r.rows.length).toBe(6)
    expect(r.rows[1].level).toBe(1)
    expect(r.rows[1].parentKey).toBe(r.rows[0].key)
    expect(r.rows[2].parentKey).toBe(r.rows[1].key, '数据行归属最近的内层组')
  })
  it('收起一级组：连带隐藏其下二级组与数据行', () => {
    const c = flattenServerGroups(items, cfg({ collapsed: new Set([String(r.rows[0].key)]) }))
    expect(c.rows.length).toBe(1)
    expect(c.rows[0].type).toBe('group')
  })
  it('只收起二级组：一级组与其兄弟仍在（收起的组行自身保留）', () => {
    const c = flattenServerGroups(items, cfg({ collapsed: new Set([String(r.rows[1].key)]) }))
    expect(c.rows.length).toBe(5, '只藏 A区 的 1 条数据行')
    expect(c.rows.map((x) => x.type)).toEqual(['group', 'group', 'group', 'row', 'row'])
    expect(c.rows[1].expanded).toBe(false, 'A区 为收起态')
    expect(c.rows[2].key).toBe(r.rows[3].key, 'B区 不受影响')
  })
})

describe('serverGroups.flattenServerGroups 子块懒取', () => {
  // 后端只给一级组行（子行待懒取）：下一项是同层组 → 判定为非内联
  const items = [g(0, '华东仓', { __count: 3 }), g(0, '华北仓', { __count: 1 })]
  it('无内联子行的组登记 needLoad（含 level/field/values）', () => {
    const r = flattenServerGroups(items, cfg())
    expect(r.rows.length).toBe(4, '组行 + 各一行取数占位')
    expect(r.needLoad.length).toBe(2, '两个组都待取')
    expect(r.needLoad[0].level).toBe(0)
    expect(r.needLoad[0].field).toBe('warehouse')
    expect(r.needLoad[0].values).toEqual(['华东仓'])
    expect(r.needLoad[1].values).toEqual(['华北仓'])
    expect(String(r.rows[1].data.__ssrmLoading)).toBe('true', '占位行')
  })
  it('末位组同样登记（子块请求由调用方去重）', () => {
    const only = flattenServerGroups([g(0, '华东仓', { __count: 3 })], cfg())
    expect(only.needLoad.length).toBe(1)
  })
  it('childMap 有 kids：递归展开且不再请求', () => {
    const r = flattenServerGroups(items, cfg())
    const path = String(r.rows[0].key)
    const kids = [d('r1', '华东仓'), d('r2', '华东仓')]
    const withKids = flattenServerGroups(items, cfg({ childMap: new Map([[path, { kids }]]) }))
    expect(withKids.needLoad.length).toBe(1, '已取回的华东仓不再请求')
    expect(withKids.needLoad[0].values).toEqual(['华北仓'])
    expect(withKids.rows.length).toBe(5)
    expect(withKids.rows[1].key).toBe('r1')
    expect(withKids.rows[1].parentKey).toBe(path)
    expect(withKids.absAt[1]).toBe(-1, '懒取子行无绝对下标')
  })
  it('childMap 标 loading：出占位行且不重复登记', () => {
    const r = flattenServerGroups(items, cfg())
    const path = String(r.rows[0].key)
    const loading = flattenServerGroups(
      items,
      cfg({ childMap: new Map([[path, { loading: true }]]) })
    )
    expect(loading.needLoad.length).toBe(1)
    expect(loading.needLoad[0].path === path).toBe(false, '正在取的组不再登记')
    expect(loading.needLoad[0].values).toEqual(['华北仓'])
    expect(String(loading.rows[1].key)).toBe('sg:loading:' + path)
  })
  it('懒取的子项本身含更深组：继续登记下一层', () => {
    const r = flattenServerGroups(items, cfg())
    const path = String(r.rows[0].key)
    const kids = [g(1, 'A区', { __count: 2 })]
    const two = flattenServerGroups(items, cfg({ childMap: new Map([[path, { kids }]]) }))
    expect(two.rows.length).toBe(5, '华东仓 + A区 + 占位 + 华北仓 + 占位')
    expect(two.needLoad.length).toBe(2)
    expect(two.needLoad[0].level).toBe(1, '二级组子块')
    expect(two.needLoad[0].values).toEqual(['华东仓', 'A区'])
    expect(two.needLoad[1].level).toBe(0, '一级组子块')
  })
  it('__count=0 视为叶子组：不可展开、不请求', () => {
    const leaf = flattenServerGroups(
      [g(0, '空仓', { __count: 0 }), g(0, '华北仓', { __count: 1 })],
      cfg()
    )
    expect(leaf.rows[0].expandable).toBe(false)
    expect(leaf.rows[0].expanded).toBe(false)
    expect(leaf.needLoad.length).toBe(1)
  })
  it('isExpandable 宿主判定优先', () => {
    const r = flattenServerGroups(items, cfg({ isExpandable: () => false }))
    expect(r.rows[0].expandable).toBe(false)
    expect(r.rows[0].expanded).toBe(false)
    expect(r.needLoad.length).toBe(0)
  })
})

describe('serverGroups.flattenServerGroups 空洞与组页脚', () => {
  it('未加载槽出占位行并保留绝对下标映射', () => {
    const items: (RjRowData | undefined)[] = [
      g(0, '华东仓'),
      d('r1', '华东仓'),
      undefined,
      d('r2', '华北仓')
    ]
    const r = flattenServerGroups(items, cfg())
    expect(r.rows.length).toBe(4)
    expect(r.absAt).toEqual([0, 1, 2, 3])
    expect(String((r.rows[2].data as any).__ssrmLoading)).toBe('true')
  })
  it('组行后紧跟空洞：子行是否内联未知，不抢跑子块请求', () => {
    const items: (RjRowData | undefined)[] = [
      g(0, '华东仓', { __count: 2 }),
      undefined,
      g(0, '华北仓')
    ]
    const r = flattenServerGroups(items, cfg())
    expect(r.needLoad.length).toBe(1)
    expect(r.needLoad[0].path === String(r.rows[0].key)).toBe(false, '华东仓不请求')
  })
  it('__footer 组页脚：不出三角、不请求子块', () => {
    const items = [g(0, '华东仓'), d('r1', '华东仓'), g(0, '华东仓', { __footer: true })]
    const r = flattenServerGroups(items, cfg())
    const footer = r.rows[2]
    expect(footer.isFooter).toBe(true)
    expect(footer.expandable).toBe(false)
    expect(footer.expanded).toBe(false)
  })
  it('页脚与所属组同层同值：key 带 :footer 后缀，全序列 key 唯一', () => {
    const items = [g(0, '华东仓'), d('r1', '华东仓'), g(0, '华东仓', { __footer: true })]
    const r = flattenServerGroups(items, cfg())
    const path0 = String(r.rows[0].data.__path)
    expect(String(r.rows[2].key)).toBe(path0 + ':footer', '页脚 key 加后缀')
    expect(r.rows[2].key === r.rows[0].key).toBe(false, '不与组行撞 key（否则 v-for 重复键）')
    const keys = r.rows.map((x) => String(x.key))
    expect(new Set(keys).size).toBe(keys.length, '显示行 key 全局唯一')
  })
  it('收起该组：其页脚小计一起收，不留在原位', () => {
    const items = [
      g(0, '华东仓'),
      d('r1', '华东仓'),
      g(0, '华东仓', { __footer: true }),
      g(0, '华北仓'),
      d('r2', '华北仓'),
      g(0, '华北仓', { __footer: true })
    ]
    const base = flattenServerGroups(items, cfg())
    expect(base.rows.length).toBe(6, '全展开：两组各一子行一页脚')
    const pathEast = String(base.rows[0].data.__path)
    const c = flattenServerGroups(items, cfg({ collapsed: new Set([pathEast]) }))
    expect(c.rows.length).toBe(4, '华东仓的子行与小计都藏起（含其组行共 4 行）')
    expect(String(c.rows[1].data.__groupValue)).toBe('华北仓', '下一个是兄弟组')
    expect(c.rows[2].type).toBe('row', '兄弟组子行保留')
    expect(c.rows[3].isFooter).toBe(true, '兄弟组的页脚不受牵连')
    expect(c.rows.filter((r) => r.isFooter).length).toBe(1, '被收起组的页脚不外泄')
  })
})

describe('serverGroups 懒取子项状态机（子块回灌守卫与失败态）', () => {
  const pathOf = (v: string) => '|0|' + encodeURIComponent(v)
  it('子项回包里含同 path 组行（后端把组行本身回灌）：不递归，不栈溢出', () => {
    const items = [g(0, '华东仓', { __count: 1 })]
    // 后端回灌时通常连同 __path 一起返（那才是真正的同组自引用）
    const echo = g(0, '华东仓', { __path: pathOf('华东仓') })
    const childMap = new Map([[pathOf('华东仓'), { kids: [echo] }]])
    const r = flattenServerGroups(items, cfg({ childMap }))
    expect(r.rows.length).toBe(2, '外层组 + 子项里的同 path 组行，到此为止')
    expect(r.needLoad.length).toBe(0, '已命中小项且环被拦住，不再登记请求')
  })
  it('无 __path 的回灌：逐层拼出的新 path 不致死循环（深度上限兜底）', () => {
    const childMap = new Map([[pathOf('华东仓'), { kids: [g(0, '华东仓')] }]])
    const r = flattenServerGroups([g(0, '华东仓', { __count: 1 })], cfg({ childMap }))
    expect(r.rows.length <= 4).toBe(true, '有限行数内终止：got ' + r.rows.length)
  })
  it('两组互引用：沿链去重后有限行数终止', () => {
    const childMap = new Map<string, any>([
      [pathOf('华东仓'), { kids: [g(0, '华北仓')] }],
      [pathOf('华北仓'), { kids: [g(0, '华东仓')] }]
    ])
    const r = flattenServerGroups([g(0, '华东仓', { __count: 1 })], cfg({ childMap }))
    expect(r.rows.length).toBe(3, '华东→华北→华东（命中已访问链，停）')
  })
  it('error 态（本代取数已放弃）：不出子行、不出占位、不重登请求', () => {
    const items = [g(0, '华东仓', { __count: 3 })]
    const r = flattenServerGroups(
      items,
      cfg({ childMap: new Map([[pathOf('华东仓'), { error: true }]]) })
    )
    expect(r.rows.length).toBe(1, '只剩组行')
    expect(r.needLoad.length).toBe(0, '不重试风暴')
  })
  it('loading 态：出占位行且不重复登记', () => {
    const items = [g(0, '华东仓', { __count: 3 })]
    const r = flattenServerGroups(
      items,
      cfg({ childMap: new Map([[pathOf('华东仓'), { loading: true }]]) })
    )
    expect(r.rows.length).toBe(2, '组行 + 占位行')
    expect(r.needLoad.length).toBe(0)
    expect(String(r.rows[1].data.__ssrmLoading)).toBe('true')
  })
})

describe('serverGroups.decorateGroupRow', () => {
  it('后端字段齐全时原样返回（不复制、不改源）', () => {
    const row = g(0, '华东仓', { __path: 'p0', __groupValue: '华东仓' })
    expect(decorateGroupRow(row, 'p0', 0, 'warehouse', '华东仓', ['华东仓'])).toBe(row)
  })
  it('缺字段时补齐且同 path 复用同一副本（引用稳定）', () => {
    const row = g(0, '华北仓')
    const a = decorateGroupRow(row, 'p1', 0, 'warehouse', '华北仓', ['华北仓'])
    const b = decorateGroupRow(row, 'p1', 0, 'warehouse', '华北仓', ['华北仓'])
    expect(a).toBe(b)
    expect(row === a).toBe(false, '源对象未被修改')
    expect((a as any).__groupLabels).toEqual(['华北仓'])
    expect((a as any).warehouse).toBe('华北仓')
  })
})
