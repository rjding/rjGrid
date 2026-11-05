// ssrm.ts 纯引擎单元测试
import { describe, it, expect } from './harness'
import { SsrmStore, SsrmTxBatcher, mergeTransactions } from '../src/ssrm'
import type { RjRowData } from '../src/types'

const mkStore = (over?: Partial<{ blockSize: number; max: number; overflow: number }>) =>
  new SsrmStore({
    blockSize: over?.blockSize ?? 10,
    maxBlocksInCache: over?.max ?? 0,
    cacheOverflow: over?.overflow ?? 0,
    keyOf: (r: RjRowData) => r.id as string | number
  })

// 生成 [from, from+n) 的行
const rows = (from: number, n: number): RjRowData[] =>
  Array.from({ length: n }, (_, i) => ({ id: 'r' + (from + i), v: from + i }))

describe('ssrm.SsrmStore 块索引数学', () => {
  const s = mkStore({ blockSize: 10 })
  s.configure(95)
  it('blockIndexOf / startRowOf / endRowOf', () => {
    expect(s.blockIndexOf(0)).toBe(0)
    expect(s.blockIndexOf(9)).toBe(0)
    expect(s.blockIndexOf(10)).toBe(1)
    expect(s.startRowOf(3)).toBe(30)
    expect(s.endRowOf(3)).toBe(40)
  })
  it('末块按 rowCount 截断', () => {
    expect(s.blockCount()).toBe(10) // ceil(95/10)
    expect(s.endRowOf(9)).toBe(95)
  })
})

describe('ssrm.SsrmStore 取数调度与竞态', () => {
  it('planLoad 规划未加载块并按距中心排序', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(100)
    const plan = s.planLoad(21, 25)
    expect(plan.includes(2)).toBe(true)
    expect(plan[0]).toBe(2) // 最近中心优先
  })
  it('commitLoad 后该块派生为已加载，planLoad 跳过', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(100)
    const seq = s.beginLoad(2)
    expect(s.commitLoad(2, seq, rows(20, 10))).toBe(true)
    expect(s.isBlockLoaded(2)).toBe(true)
    expect(s.planLoad(21, 25).includes(2)).toBe(false)
  })
  it('beginLoad 中的块不被重复规划', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(100)
    s.beginLoad(2)
    expect(s.planLoad(20, 29).includes(2)).toBe(false)
    expect(s.isLoadingAny()).toBe(true)
  })
  it('过期 seq 的 commitLoad 被丢弃（竞态守卫）', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(100)
    const stale = s.beginLoad(2)
    const fresh = s.beginLoad(2) // 覆盖
    expect(s.commitLoad(2, stale, rows(20, 10))).toBe(false)
    expect(s.isBlockLoaded(2)).toBe(false)
    expect(s.commitLoad(2, fresh, rows(20, 10))).toBe(true)
    expect(s.isBlockLoaded(2)).toBe(true)
  })
  it('error 块可被重新规划以重试', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(100)
    const seq = s.beginLoad(2)
    s.failLoad(2, seq)
    expect(s.planLoad(20, 29).includes(2)).toBe(true)
  })
  it('prefetch 扩展规划范围', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(100)
    const plan = s.planLoad(40, 49, 20) // 前后各扩 2 行块
    expect(plan.length > 1).toBe(true)
  })
})

describe('ssrm.SsrmStore 淘汰与 LRU', () => {
  it('prune 淘汰 keep 外的已加载块并置空槽', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(100)
    for (const b of [0, 1, 2]) {
      const seq = s.beginLoad(b)
      s.commitLoad(b, seq, rows(b * 10, 10))
    }
    const evicted = s.prune(new Set([2])).sort((a, b) => a - b)
    expect(evicted).toEqual([0, 1])
    expect(s.isBlockLoaded(0)).toBe(false)
    expect(s.slots[5]).toBe(undefined)
    expect(s.isBlockLoaded(2)).toBe(true)
  })
  it('进行中的块永不被淘汰', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(100)
    s.beginLoad(3) // loading，未 commit
    expect(s.prune(new Set())).toEqual([])
  })
  it('maxBlocksInCache 限制：LRU 优先淘汰最久未用', () => {
    const s = mkStore({ blockSize: 10, max: 2 })
    s.configure(100)
    for (const b of [0, 1, 2]) {
      const seq = s.beginLoad(b)
      s.commitLoad(b, seq, rows(b * 10, 10))
    }
    const evicted = s.prune(new Set([2])) // loadedTotal=3,max=2→removable=1，最旧=0
    expect(evicted).toEqual([0])
    expect(s.isBlockLoaded(1)).toBe(true)
  })
  it('keepSet 计算视口块 ± overflow', () => {
    const s = mkStore({ blockSize: 10, overflow: 1 })
    s.configure(100)
    const set = s.keepSet(30, 39) // 块 3 ± overflow 1 = {2,3,4}
    expect(set.has(3)).toBe(true)
    expect(set.has(2)).toBe(true) // overflow 下
    expect(set.has(4)).toBe(true) // overflow 上
    expect(set.has(1)).toBe(false)
    expect(set.has(0)).toBe(false)
  })
})

describe('ssrm.SsrmStore Delta（实时更新）', () => {
  it('update 原地替换已加载行并闪烁，不位移', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(100)
    const seq = s.beginLoad(0)
    s.commitLoad(0, seq, rows(0, 10))
    const res = s.applyDelta({ update: [{ id: 'r3', v: 999 }] })
    expect(res.structural).toBe(false)
    expect(res.flash).toEqual(['r3'])
    expect(s.slots[3]).toEqual({ id: 'r3', v: 999 })
    expect(s.rowCount).toBe(100)
  })
  it('update 未加载行被忽略', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(100)
    const res = s.applyDelta({ update: [{ id: 'r50', v: 1 }] })
    expect(res.changed.length).toBe(0)
  })
  it('remove 左移尾块并减少 rowCount（structural）', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(20)
    for (const b of [0, 1]) {
      const seq = s.beginLoad(b)
      s.commitLoad(b, seq, rows(b * 10, 10))
    }
    const res = s.applyDelta({ remove: [{ id: 'r5' }] })
    expect(res.structural).toBe(true)
    expect(s.rowCount).toBe(19)
    expect(s.slots[5]).toEqual({ id: 'r6', v: 6 }) // 后一行左移补位
    expect(s.slots[18]).toEqual({ id: 'r19', v: 19 })
  })
  it('add 追加到末尾并 rowCount++', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(10)
    const seq = s.beginLoad(0)
    s.commitLoad(0, seq, rows(0, 10))
    const res = s.applyDelta({ add: [{ id: 'rX' }] })
    expect(res.structural).toBe(true)
    expect(s.rowCount).toBe(11)
    expect(s.slots[10]).toEqual({ id: 'rX' })
    expect(res.flash.includes('rX')).toBe(true)
  })
  it('addIndex 指定位置插入', () => {
    const s = mkStore({ blockSize: 10 })
    s.configure(10)
    const seq = s.beginLoad(0)
    s.commitLoad(0, seq, rows(0, 10))
    s.applyDelta({ add: [{ id: 'rTop' }], addIndex: 0 })
    expect(s.slots[0]).toEqual({ id: 'rTop' })
    expect(s.slots[1]).toEqual({ id: 'r0', v: 0 })
  })
})

describe('ssrm.mergeTransactions', () => {
  it('同 key update 后者胜', () => {
    const m = mergeTransactions([{ update: [{ id: 'a', v: 1 }] }, { update: [{ id: 'a', v: 2 }] }])
    expect(m.update?.length).toBe(1)
    expect(m.update?.[0]).toEqual({ id: 'a', v: 2 })
  })
  it('remove 压制同 key 的 add/update（remove 在后）', () => {
    const m = mergeTransactions([{ update: [{ id: 'b', v: 1 }] }, { remove: [{ id: 'b' }] }])
    expect(m.update).toBe(undefined)
    expect(m.remove?.length).toBe(1)
  })
  it('先 remove 后 add 同 key 视为重新添加（后到 add 撤销 remove）', () => {
    const m = mergeTransactions([{ remove: [{ id: 'a' }] }, { add: [{ id: 'a', v: 9 }] }])
    expect(m.add?.length).toBe(1)
    expect(m.remove).toBe(undefined)
  })
})

describe('ssrm.SsrmTxBatcher', () => {
  it('合并多次 push 后一次 flush 应用', () => {
    const applied: any[] = []
    let pending: any = null
    const b = new SsrmTxBatcher((tx) => applied.push(tx), {
      defer: (fn) => {
        pending = fn
      }
    })
    b.push({ update: [{ id: 'a', v: 1 }] })
    b.push({ update: [{ id: 'b', v: 1 }] })
    expect(applied.length).toBe(0)
    expect(b.pending).toBe(2)
    if (pending) pending() // 触发调度
    expect(applied.length).toBe(1)
    expect(applied[0].update?.length).toBe(2)
    expect(b.pending).toBe(0)
  })
  it('flush 立即应用当前队列', () => {
    const applied: any[] = []
    const b = new SsrmTxBatcher((tx) => applied.push(tx), { defer: () => {} })
    b.push({ add: [{ id: 'x' }] })
    b.flush()
    expect(applied.length).toBe(1)
    expect(applied[0].add?.length).toBe(1)
  })
  it('空队列 flush 不触发 apply', () => {
    const applied: any[] = []
    const b = new SsrmTxBatcher((tx) => applied.push(tx), { defer: () => {} })
    b.flush()
    expect(applied.length).toBe(0)
  })
})
