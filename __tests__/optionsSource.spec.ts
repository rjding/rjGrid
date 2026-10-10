// optionsSource.ts 纯函数单测：统一选项载体的归一 / 解析 / 缓存键 / 收集，
// 并用本地 accessor（复刻 RjGrid 装配的 optCache + colOptionsIndex）验证四处同源语义。
import { describe, it, expect } from './harness'
import {
  normalizeOptions,
  resolveOptions,
  sourceCacheKey,
  collectOptionCols,
  flattenOptions,
  filterOptionTree,
  flattenTreeForRender,
  collectParentKeys
} from '../src/optionsSource'
import type { RjOptionLoaders } from '../src/optionsSource'
import { withCarrierOptions } from '../src/query'
import type { RjColumn, RjEditorOption, RjOptionSource, RjQueryFieldDef } from '../src/types'

const col = (over: Partial<RjColumn>): RjColumn => over as RjColumn

// ---------------- normalizeOptions ----------------
describe('optionsSource.normalizeOptions', () => {
  it('{label,value} 静态数组原样归一', () => {
    expect(normalizeOptions([{ label: 'A', value: 1 }, { label: 'B', value: 2 }])).toEqual([
      { label: 'A', value: 1 },
      { label: 'B', value: 2 }
    ])
  })
  it('接口默认字段：name→label、id→value', () => {
    expect(normalizeOptions([{ name: '张三', id: 5 }])).toEqual([{ label: '张三', value: 5 }])
  })
  it('value 缺 value 时退 id/code/key', () => {
    expect(normalizeOptions([{ label: 'x', code: 'C1' }])).toEqual([{ label: 'x', value: 'C1' }])
    expect(normalizeOptions([{ label: 'y', key: 9 }])).toEqual([{ label: 'y', value: 9 }])
  })
  it('labelKey/valueKey 自定义字段映射', () => {
    const raw = [
      { nm: '北京', cd: 'BJ' },
      { nm: '上海', cd: 'SH' }
    ]
    expect(normalizeOptions(raw, { labelKey: 'nm', valueKey: 'cd' })).toEqual([
      { label: '北京', value: 'BJ' },
      { label: '上海', value: 'SH' }
    ])
  })
  it('map 完全自定义映射优先于字段推断', () => {
    const raw = [{ n: '甲', i: 1 }]
    expect(normalizeOptions(raw, { map: (it) => ({ label: it.n, value: it.i }) })).toEqual([
      { label: '甲', value: 1 }
    ])
  })
  it('childrenKey（默认 children）保留为 children 树，label 不加缩进', () => {
    const tree = [
      {
        label: '原料',
        value: 'raw',
        children: [
          { label: '金属', value: 'metal' },
          { label: '塑料', value: 'plastic', children: [{ label: 'PVC', value: 'pvc' }] }
        ]
      },
      { label: '成品', value: 'fin' }
    ]
    const out = normalizeOptions(tree)
    expect(out).toEqual([
      {
        label: '原料',
        value: 'raw',
        children: [
          { label: '金属', value: 'metal' },
          { label: '塑料', value: 'plastic', children: [{ label: 'PVC', value: 'pvc' }] }
        ]
      },
      { label: '成品', value: 'fin' }
    ])
    // 关键：拍平后的 value→label 表里 label 保持节点原名，无缩进/前导空格污染
    flattenOptions(out).forEach((o) => expect(o.label).toBe(o.label.trim()))
  })
  it('自定义 childrenKey', () => {
    const tree = [{ label: '父', value: 1, subs: [{ label: '子', value: 2 }] }]
    expect(normalizeOptions(tree, { childrenKey: 'subs' })).toEqual([
      { label: '父', value: 1, children: [{ label: '子', value: 2 }] }
    ])
  })
  it('纯标量数组：value=label=标量', () => {
    expect(normalizeOptions(['a', 'b'])).toEqual([
      { label: 'a', value: 'a' },
      { label: 'b', value: 'b' }
    ])
  })
  it('非数组回落空', () => {
    expect(normalizeOptions(null)).toEqual([])
    expect(normalizeOptions(undefined)).toEqual([])
    expect(normalizeOptions({} as any)).toEqual([])
  })
})

// ---------------- 树工具 ----------------
describe('optionsSource 树工具（flatten/filter/render/parents）', () => {
  const tree: RjEditorOption[] = [
    {
      label: '原料',
      value: 'raw',
      children: [
        { label: '金属', value: 'metal' },
        { label: '塑料', value: 'plastic', children: [{ label: 'PVC', value: 'pvc' }] }
      ]
    },
    { label: '成品', value: 'fin' }
  ]
  it('flattenOptions：深度优先拍平、丢 children', () => {
    const flat = flattenOptions(tree)
    expect(flat.map((o) => o.value)).toEqual(['raw', 'metal', 'plastic', 'pvc', 'fin'])
    flat.forEach((o) => expect(o.children).toBe(undefined))
  })
  it('filterOptionTree：命中节点保留完整子树；仅后代命中则作祖先路径保留', () => {
    const r = filterOptionTree(tree, 'pvc')
    expect(r.length).toBe(1)
    expect(r[0].label).toBe('原料')
    expect(r[0].children?.map((c) => c.value)).toEqual(['plastic'])
    expect(r[0].children?.[0].children?.map((c) => c.value)).toEqual(['pvc'])
    // 命中父节点自身 → 保留其完整子树
    const r2 = filterOptionTree(tree, '原料')
    expect(r2[0].children?.length).toBe(2)
    // 空查询原样返回（同一引用）
    expect(filterOptionTree(tree, '')).toBe(tree)
  })
  it('flattenTreeForRender：按展开集合铺可见行 + 深度', () => {
    const all = collectParentKeys(tree) // {raw, plastic}
    const rows = flattenTreeForRender(tree, all)
    expect(rows.map((r) => [r.option.value, r.depth])).toEqual([
      ['raw', 0],
      ['metal', 1],
      ['plastic', 1],
      ['pvc', 2],
      ['fin', 0]
    ])
    // 折叠 raw：其子树不可见
    const collapsed = flattenTreeForRender(tree, new Set(['plastic']))
    expect(collapsed.map((r) => r.option.value)).toEqual(['raw', 'fin'])
    expect(collapsed[0].hasChildren).toBe(true)
    expect(collapsed[0].expanded).toBe(false)
  })
  it('collectParentKeys：仅收集有子节点的 value（String 化）', () => {
    expect([...collectParentKeys(tree)].sort()).toEqual(['plastic', 'raw'])
  })
})

// ---------------- resolveOptions ----------------
describe('optionsSource.resolveOptions', () => {
  it('数组源 → 归一', async () => {
    const r = await resolveOptions([{ label: 'A', value: 1 }], undefined, {})
    expect(r).toEqual([{ label: 'A', value: 1 }])
  })
  it('工厂函数源（同步 / 异步）', async () => {
    expect(await resolveOptions(() => [{ label: 'S', value: 1 }], undefined, {})).toEqual([
      { label: 'S', value: 1 }
    ])
    expect(await resolveOptions(async () => [{ label: 'T', value: 2 }], undefined, {})).toEqual([
      { label: 'T', value: 2 }
    ])
  })
  it('对象 items 源', async () => {
    const src: RjOptionSource = { items: [{ label: 'I', value: 1 }] }
    expect(await resolveOptions(src, undefined, {})).toEqual([{ label: 'I', value: 1 }])
  })
  it('对象 load 源（接口函数）+ shape 归一', async () => {
    const src: RjOptionSource = { load: async () => [{ nm: 'x', cd: '1' }], labelKey: 'nm', valueKey: 'cd' }
    expect(await resolveOptions(src, undefined, {})).toEqual([{ label: 'x', value: '1' }])
  })
  it('col.dict 糖 → 走网格级 dictLoader', async () => {
    const loaders: RjOptionLoaders = { dictLoader: (k) => (k === 'sex' ? [{ label: '男', value: 1 }] : []) }
    expect(await resolveOptions(undefined, 'sex', loaders)).toEqual([{ label: '男', value: 1 }])
  })
  it('对象 dict 源 → dictLoader', async () => {
    const src: RjOptionSource = { dict: 'sex' }
    const loaders: RjOptionLoaders = { dictLoader: () => [{ label: '女', value: 2 }] }
    expect(await resolveOptions(src, undefined, loaders)).toEqual([{ label: '女', value: 2 }])
  })
  it('对象 ref 源 → optionsLoader 返回原始数组交列上字段归一', async () => {
    const src: RjOptionSource = { ref: 'typeTree', childrenKey: 'children' }
    const loaders: RjOptionLoaders = {
      optionsLoader: () => [{ name: '根', id: 1, children: [{ name: '叶', id: 2 }] }]
    }
    expect(await resolveOptions(src, undefined, loaders)).toEqual([
      { label: '根', value: 1, children: [{ label: '叶', value: 2 }] }
    ])
  })
  it('加载失败静默回落空数组', async () => {
    const loaders: RjOptionLoaders = { dictLoader: () => Promise.reject(new Error('boom')) }
    expect(await resolveOptions({ dict: 'x' }, undefined, loaders)).toEqual([])
  })
  it('无源无字典 → 空', async () => {
    expect(await resolveOptions(undefined, undefined, {})).toEqual([])
  })
})

// ---------------- sourceCacheKey ----------------
describe('optionsSource.sourceCacheKey', () => {
  it('无载体返回 null', () => {
    expect(sourceCacheKey(col({ field: 'a' }))).toBe(null)
  })
  it('col.dict → dict:key', () => {
    expect(sourceCacheKey(col({ field: 'a', dict: 'sex' }))).toBe('dict:sex')
  })
  it('静态数组 → static:colId（按列身份）', () => {
    const k = sourceCacheKey(col({ field: 'a', options: [{ label: 'A', value: 1 }] }))
    expect(k).toBe('static:a')
  })
  it('对象 items → static:colId', () => {
    expect(sourceCacheKey(col({ field: 'u', options: { items: [] } }))).toBe('static:u')
  })
  it('对象 ref → ref:name', () => {
    expect(sourceCacheKey(col({ field: 'a', options: { ref: 'typeTree' } }))).toBe('ref:typeTree')
  })
  it('对象 dict → dict:key', () => {
    expect(sourceCacheKey(col({ field: 'a', options: { dict: 'sex' } }))).toBe('dict:sex')
  })
  it('工厂函数：同一函数引用得到稳定键，不同函数不同键', () => {
    const f = () => [] as RjEditorOption[]
    const g = () => [] as RjEditorOption[]
    const k1 = sourceCacheKey(col({ field: 'a', options: f }))
    const k2 = sourceCacheKey(col({ field: 'b', options: f }))
    const k3 = sourceCacheKey(col({ field: 'c', options: g }))
    expect(k1).toBe(k2) // 同函数复用同键 → 只解析一次
    expect(k1 === k3).toBe(false)
    expect(String(k1).startsWith('fn:')).toBe(true)
  })
  it('load 函数：同一引用稳定、不同引用不同', () => {
    const l = async () => []
    const a = sourceCacheKey(col({ field: 'a', options: { load: l } }))
    const b = sourceCacheKey(col({ field: 'b', options: { load: l } }))
    const c = sourceCacheKey(col({ field: 'c', options: { load: async () => [] } }))
    expect(a).toBe(b)
    expect(a === c).toBe(false)
    expect(String(a).startsWith('load:')).toBe(true)
  })
  it('两列同 dict → 同缓存键（可去重）', () => {
    expect(sourceCacheKey(col({ field: 'a', dict: 'unit' }))).toBe(
      sourceCacheKey(col({ field: 'b', dict: 'unit' }))
    )
  })
})

// ---------------- collectOptionCols ----------------
describe('optionsSource.collectOptionCols', () => {
  it('递归收集声明 options/dict 的列（含多级表头子列）', () => {
    const cols = [
      col({ field: 'x' }),
      col({ field: 'y', dict: 'sex' }),
      col({
        field: 'grp',
        children: [col({ field: 'z', options: [{ label: 'A', value: 1 }] }), col({ field: 'w' })]
      })
    ]
    const ids = collectOptionCols(cols).map((c) => c.field)
    expect(ids).toEqual(['y', 'z'])
  })
})

// ---------------- accessor 装配仿真（复刻 RjGrid 的四处同源语义） ----------------
// 复刻 RjGrid.vue：按 sourceCacheKey 解析并缓存，再由列声明 + 缓存派生 colId→{list,labelMap}。
async function makeAccessor(columns: RjColumn[], loaders: RjOptionLoaders) {
  const cache = new Map<string, RjEditorOption[]>()
  let resolveRounds = 0
  const resolveAll = async () => {
    resolveRounds++
    const pending = new Map<string, RjColumn>()
    for (const c of collectOptionCols(columns)) {
      const key = sourceCacheKey(c)
      if (!key || cache.has(key) || pending.has(key)) continue
      pending.set(key, c)
    }
    await Promise.all(
      [...pending.entries()].map(async ([key, c]) => {
        cache.set(key, await resolveOptions(c.options, c.dict, loaders))
      })
    )
  }
  const index = () => {
    const m = new Map<string, { list: RjEditorOption[]; labelMap: Map<string, string> }>()
    for (const c of collectOptionCols(columns)) {
      const key = sourceCacheKey(c)
      const list = key ? cache.get(key) : undefined
      if (!list || !list.length) continue
      const labelMap = new Map<string, string>()
      for (const o of flattenOptions(list)) labelMap.set(String(o.value), String(o.label))
      m.set(c.colId || c.field || '', { list, labelMap })
    }
    return m
  }
  const listOf = (c: RjColumn) => index().get(c.colId || c.field || '')?.list
  const labelOf = (c: RjColumn, value: any) => {
    if (value == null || value === '') return undefined
    return index().get(c.colId || c.field || '')?.labelMap.get(String(value))
  }
  return { resolveAll, listOf, labelOf, rounds: () => resolveRounds }
}

describe('optionsSource 装配：显示 / 筛选 / 编辑 / NLQ 四处同源', () => {
  it('显示：仅声明载体无 formatter → label 命中；null/未命中共识回落', async () => {
    const status = col({ field: 'status', options: [{ label: '在库', value: 1 }] })
    const acc = await makeAccessor([status], {})
    await acc.resolveAll()
    expect(acc.labelOf(status, 1)).toBe('在库')
    // 与 RjGrid.colOptionLabel 一致：空值不冒充标签（交回原显示链）
    expect(acc.labelOf(status, null)).toBe(undefined)
    expect(acc.labelOf(status, '')).toBe(undefined)
    expect(acc.labelOf(status, 999)).toBe(undefined)
  })

  it('筛选：select 候选来自载体 list（非行去重）；标签优先级 label > filterValueMap > 原值', async () => {
    const c = col({ field: 'cat', options: [{ label: '电子', value: 'E' }] })
    const acc = await makeAccessor([c], {})
    await acc.resolveAll()
    const unique = acc.listOf(c)?.map((o) => String(o.value))
    expect(unique).toEqual(['E'])
    // 复刻 RjFilterMenu.displayOf：载体标签优先于 filterValueMap
    const withMap = col({ field: 'cat', options: [{ label: '电子', value: 'E' }], filterValueMap: { E: '旧标签' } })
    const acc2 = await makeAccessor([withMap], {})
    await acc2.resolveAll()
    const displayOf = (v: string) => acc2.labelOf(withMap, v) ?? withMap.filterValueMap?.[v] ?? v
    expect(displayOf('E')).toBe('电子') // 载体胜出，盖过 filterValueMap
    expect(displayOf('X')).toBe('X') // 未命中回落原值
  })

  it('编辑：editor 无 options → 回落注入载体；有非空 options → 不覆盖', async () => {
    const c = col({ field: 'u', editor: { type: 'select' }, options: [{ label: '米', value: 'm' }] })
    const acc = await makeAccessor([c], {})
    await acc.resolveAll()
    // 复刻 RjEditor.options：非空 editor.options 优先，缺省/空回落载体
    const editorOptions = (cfgOptions: any) => {
      if (Array.isArray(cfgOptions) && cfgOptions.length) return cfgOptions
      return acc.listOf(c) || []
    }
    expect(editorOptions(undefined)).toEqual([{ label: '米', value: 'm' }]) // 缺省 → 载体
    expect(editorOptions([{ label: '手动', value: 'M' }])).toEqual([{ label: '手动', value: 'M' }]) // 显式 → 不覆盖
    // 宿主手写回填的空数组也回落载体
    expect(editorOptions([])).toEqual([{ label: '米', value: 'm' }])
  })

  it('NLQ：载体作为权威枚举候选', async () => {
    const c = col({ field: 'st', dict: 'st' })
    const acc = await makeAccessor([c], { dictLoader: () => [{ label: '在库', value: 1 }, { label: '缺货', value: 2 }] })
    await acc.resolveAll()
    const resolved = acc.listOf(c)
    expect(resolved?.map((o) => String(o.label))).toEqual(['在库', '缺货'])
  })

  it('缓存：同 dict 两列只触发一次 loader（断言调用计数）', async () => {
    let dictCalls = 0
    const loaders: RjOptionLoaders = {
      dictLoader: (k) => {
        dictCalls++
        return k === 'unit' ? [{ label: '个', value: 1 }] : []
      }
    }
    const a = col({ field: 'unit1', dict: 'unit' })
    const b = col({ field: 'unit2', dict: 'unit' })
    const acc = await makeAccessor([a, b], loaders)
    await acc.resolveAll()
    expect(dictCalls).toBe(1) // 相同缓存键 → 只解析一次
    expect(acc.labelOf(a, 1)).toBe('个')
    expect(acc.labelOf(b, 1)).toBe('个')
  })

  it('幂等：重复 resolveAll 不重复触发已缓存源的 loader', async () => {
    let calls = 0
    const loaders: RjOptionLoaders = { optionsLoader: () => (calls++, [{ name: 'n', id: 1 }]) }
    const c = col({ field: 't', options: { ref: 'tree' } })
    const acc = await makeAccessor([c], loaders)
    await acc.resolveAll()
    await acc.resolveAll()
    expect(calls).toBe(1)
  })

  it('兼容：不声明载体的列 list/label 均为 undefined（四路行为不变）', async () => {
    const plain = col({ field: 'name' })
    const acc = await makeAccessor([plain], {})
    await acc.resolveAll()
    expect(acc.listOf(plain)).toBe(undefined)
    expect(acc.labelOf(plain, 'x')).toBe(undefined)
  })
})

describe('query.withCarrierOptions（查询栏并入载体候选）', () => {
  const carrier = new Map<string, { list: RjEditorOption[] }>([
    ['typeId', { list: [{ label: '原料', value: 1 }, { label: '成品', value: 2 }] }]
  ])
  it('字段自身无候选 + 载体命中 → 填 options 并升级 select', () => {
    const fields: RjQueryFieldDef[] = [{ field: 'typeId', title: '物料类型', kind: 'text' }]
    const out = withCarrierOptions(fields, carrier)
    expect(out[0].kind).toBe('select')
    expect(out[0].options).toEqual([
      { label: '原料', value: 1 },
      { label: '成品', value: 2 }
    ])
  })
  it('字段已有 options → 不被载体覆盖', () => {
    const fields: RjQueryFieldDef[] = [
      { field: 'typeId', title: 't', kind: 'select', options: [{ label: 'X', value: 9 }] }
    ]
    const out = withCarrierOptions(fields, carrier)
    expect(out[0].options).toEqual([{ label: 'X', value: 9 }])
  })
  it('载体未命中 → 原样', () => {
    const fields: RjQueryFieldDef[] = [{ field: 'code', title: '编码', kind: 'text' }]
    const out = withCarrierOptions(fields, carrier)
    expect(out[0].options).toBe(undefined)
    expect(out[0].kind).toBe('text')
  })
  it('载体为树 → 透传 children（不拍平）', () => {
    const treeCarrier = new Map<string, { list: RjEditorOption[] }>([
      ['typeId', { list: [{ label: '原料', value: 1, children: [{ label: '金属', value: 2 }] }] }]
    ])
    const fields: RjQueryFieldDef[] = [{ field: 'typeId', title: 't', kind: 'text' }]
    const out = withCarrierOptions(fields, treeCarrier)
    expect(out[0].kind).toBe('select')
    expect(out[0].options?.[0].children).toEqual([{ label: '金属', value: 2 }])
  })
  it('空 carrier → 原样返回', () => {
    const fields: RjQueryFieldDef[] = [{ field: 'typeId', title: 't', kind: 'text' }]
    const out = withCarrierOptions(fields, new Map())
    expect(out[0].kind).toBe('text')
    expect(out[0].options).toBe(undefined)
  })
})
