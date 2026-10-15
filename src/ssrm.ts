// RJGrid SSRM（服务端行模型）纯引擎：块缓存 + Delta + 异步事务批量。
// 设计：以 dense `slots` 数组（长度 = rowCount，元素为已加载行或 undefined）为唯一真相；
// 一个固定大小块「是否已加载」由其行区间是否被完全填充「派生」得到；in-flight / error 用显式表管理；
// 淘汰（evict）= 把某块区间置回 undefined，滚动回该区间时按「未加载」自然重新请求（块缓存语义）。
// 本模块与 Vue/渲染无关，纯数据操作，便于单元测试与在任意行模型中复用。
import type { RjRowData, RjTransaction } from './types'

/** 块加载状态（仅描述进行中的请求，已加载由覆盖度派生） */
export interface SsrmInflight {
  seq: number
  status: 'loading' | 'error'
}

export interface SsrmStoreOptions {
  /** 每块行数 */
  blockSize: number
  /** 缓存中最多保留的已加载块数（0/undefined = 不限）；超出按 LRU 淘汰 */
  maxBlocksInCache?: number
  /** 视口外额外保留块数 */
  cacheOverflow?: number
  /** 取行主键 */
  keyOf: (row: RjRowData) => string | number
}

export interface SsrmDeltaResult {
  /** 受影响的绝对行下标（供局部重绘） */
  changed: number[]
  /** 需要闪烁高亮的 key */
  flash: (string | number)[]
  /** 结构是否发生变化（add/remove 导致行位移） */
  structural: boolean
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))

export class SsrmStore {
  /** 服务端总行数；-1 表示未知（尚未收到 total） */
  rowCount = -1
  readonly blockSize: number
  readonly maxBlocksInCache: number
  readonly cacheOverflow: number
  private readonly keyOf: (row: RjRowData) => string | number
  /** dense 行槽：长度 = max(rowCount,0)；undefined 表示未加载 */
  slots: (RjRowData | undefined)[] = []
  /** 每个块的进行中标记（loading / error 重试） */
  private inflight = new Map<number, SsrmInflight>()
  /** 每块的最近访问时间（LRU），仅在覆盖完整时有效 */
  private touch = new Map<number, number>()
  private clock = 0
  private seq = 0

  constructor(opts: SsrmStoreOptions) {
    this.blockSize = Math.max(1, Math.floor(opts.blockSize) || 100)
    this.maxBlocksInCache = opts.maxBlocksInCache ?? 0
    this.cacheOverflow = Math.max(0, Math.floor(opts.cacheOverflow ?? 5))
    this.keyOf = opts.keyOf
  }

  // ---------------- 块索引数学 ----------------
  blockIndexOf(row: number): number {
    return row < 0 ? 0 : Math.floor(row / this.blockSize)
  }
  startRowOf(blockIndex: number): number {
    return blockIndex * this.blockSize
  }
  /** 块实际结束行（不含）；末块受 rowCount 截断 */
  endRowOf(blockIndex: number): number {
    if (this.rowCount < 0) return this.startRowOf(blockIndex) + this.blockSize
    return Math.min(this.startRowOf(blockIndex) + this.blockSize, this.rowCount)
  }
  blockCount(): number {
    return this.rowCount <= 0 ? 0 : Math.ceil(this.rowCount / this.blockSize)
  }
  /** 该块行区间是否被完全填充（= 已加载） */
  isBlockLoaded(blockIndex: number): boolean {
    if (this.rowCount <= 0) return false
    const s = this.startRowOf(blockIndex)
    const e = this.endRowOf(blockIndex)
    if (e <= s) return false
    for (let i = s; i < e; i++) if (this.slots[i] === undefined) return false
    return true
  }

  // ---------------- 生命周期 ----------------
  /** 设定/更新总数并调整 slots 长度，保留已加载内容 */
  configure(total: number): void {
    const next = Math.max(-1, Math.floor(total))
    this.rowCount = next
    const len = Math.max(next, 0)
    if (this.slots.length < len) this.slots.length = len
    else if (this.slots.length > len) {
      this.slots.length = len
      // 丢弃越界的进行中标记
      const maxIdx = this.blockCount()
      for (const k of Array.from(this.inflight.keys())) if (k >= maxIdx) this.inflight.delete(k)
    }
  }

  reset(): void {
    this.slots = []
    this.inflight.clear()
    this.touch.clear()
    this.rowCount = -1
    this.clock++
  }

  rowAt(i: number): RjRowData | undefined {
    return this.slots[i]
  }
  loadedRowCount(): number {
    let n = 0
    for (let i = 0; i < this.slots.length; i++) if (this.slots[i] !== undefined) n++
    return n
  }

  // ---------------- 取数调度 ----------------
  /**
   * 规划需要请求的块：覆盖 [first-prefetch, last+prefetch] 且未加载、非进行中的块，
   * 按「距视口中心由近及远」排序（优先补最可见处）。
   */
  planLoad(first: number, last: number, prefetch = 0): number[] {
    const bc = this.blockCount()
    if (bc <= 0 || this.rowCount <= 0) return []
    const lo = Math.max(0, this.blockIndexOf(Math.max(0, first - prefetch)))
    const hi = Math.min(bc - 1, this.blockIndexOf(Math.min(this.rowCount - 1, last + prefetch)))
    const center = (first + last) / 2
    const need: number[] = []
    for (let b = lo; b <= hi; b++) {
      const inf = this.inflight.get(b)
      if (inf && inf.status === 'loading') continue
      if (inf && inf.status === 'error') {
        need.push(b) // 允许重试
        continue
      }
      if (!this.isBlockLoaded(b)) need.push(b)
    }
    need.sort((a, c) => Math.abs(a - center) - Math.abs(c - center))
    return need
  }

  /** 标记块开始加载，返回本次请求的 seq（用于竞态守卫） */
  beginLoad(blockIndex: number): number {
    const s = ++this.seq
    this.inflight.set(blockIndex, { seq: s, status: 'loading' })
    return s
  }

  /** 提交块数据：seq 过期则丢弃；写入 slots；返回是否被应用 */
  commitLoad(blockIndex: number, seq: number, rows: RjRowData[]): boolean {
    const inf = this.inflight.get(blockIndex)
    if (!inf || inf.seq !== seq) return false // 竞态：已被更新请求取代
    this.inflight.delete(blockIndex)
    const start = this.startRowOf(blockIndex)
    // 服务端可能返回不足整块（末块）；仅写入实际行
    for (let i = 0; i < rows.length; i++) this.slots[start + i] = rows[i]
    // 若服务端明确该块为空且未到末尾，用空槽占位避免反复请求（把剩余置为 null-ish 由 rowCount 决定）
    this.touch.set(blockIndex, ++this.clock)
    return true
  }

  /** 标记块加载失败（可重试） */
  failLoad(blockIndex: number, seq: number): void {
    const inf = this.inflight.get(blockIndex)
    if (inf && inf.seq === seq) this.inflight.set(blockIndex, { seq, status: 'error' })
  }

  isLoadingAny(): boolean {
    for (const v of this.inflight.values()) if (v.status === 'loading') return true
    return false
  }
  /** 指定块是否正在加载中（用于 boot 块去重） */
  isBlockBusy(blockIndex: number): boolean {
    return this.inflight.get(blockIndex)?.status === 'loading'
  }

  // ---------------- 淘汰（块缓存回收） ----------------
  /**
   * 依据保留集合淘汰「已加载且不在 keep 内」的块，按 LRU（touch 时钟）优先淘汰最久未用。
   * 进行中的块永不淘汰。返回被淘汰的块索引。
   */
  prune(keep: Set<number>): number[] {
    const loaded: number[] = []
    const bc = this.blockCount()
    for (let b = 0; b < bc; b++) {
      if (keep.has(b)) continue
      if (this.inflight.get(b)?.status === 'loading') continue
      if (this.isBlockLoaded(b)) loaded.push(b)
    }
    // 先按 LRU 淘汰超出 maxBlocksInCache 的部分（保留集合外的已加载块）
    let evict = loaded
    if (this.maxBlocksInCache > 0) {
      // 统计当前已加载总块数（含 keep 内）
      let loadedTotal = 0
      for (let b = 0; b < bc; b++) if (this.isBlockLoaded(b)) loadedTotal++
      const removable = Math.max(0, loadedTotal - this.maxBlocksInCache)
      if (removable < loaded.length) {
        evict = loaded
          .sort((a, c) => (this.touch.get(a) ?? 0) - (this.touch.get(c) ?? 0))
          .slice(0, removable)
      }
    }
    const out: number[] = []
    for (const b of evict) {
      const s = this.startRowOf(b)
      const e = this.endRowOf(b)
      for (let i = s; i < e; i++) this.slots[i] = undefined
      this.touch.delete(b)
      this.inflight.delete(b)
      out.push(b)
    }
    return out
  }

  /** keep 集合：视口块 ± cacheOverflow */
  keepSet(first: number, last: number): Set<number> {
    const bc = this.blockCount()
    const set = new Set<number>()
    const lo = clamp(this.blockIndexOf(first) - this.cacheOverflow, 0, bc - 1)
    const hi = clamp(this.blockIndexOf(last) + this.cacheOverflow, 0, bc - 1)
    for (let b = lo; b <= hi; b++) set.add(b)
    return set
  }

  // ---------------- Delta（实时更新） ----------------
  /**
   * 对已加载内容应用增量：
   * - update：按 key 原地替换已加载行（不位移），闪烁；
   * - upsert：命中已加载则更新，否则忽略（服务端权威，避免破坏块区间）；
   * - add：追加到末尾（rowCount++），闪烁；
   * - remove：按 key 从已加载槽移除并左移尾块（structural）。
   */
  applyDelta(tx: RjTransaction): SsrmDeltaResult {
    const changed: number[] = []
    const flash: (string | number)[] = []
    let structural = false

    const findIndex = (row: RjRowData): number => {
      const k = this.keyOf(row)
      for (let i = 0; i < this.slots.length; i++) {
        const r = this.slots[i]
        if (r && this.keyOf(r) === k) return i
      }
      return -1
    }

    if (tx.update?.length) {
      for (const u of tx.update) {
        const i = findIndex(u)
        if (i >= 0) {
          this.slots[i] = u
          changed.push(i)
          flash.push(this.keyOf(u))
        }
      }
    }
    if (tx.upsert?.length) {
      for (const u of tx.upsert) {
        const i = findIndex(u)
        if (i >= 0) {
          this.slots[i] = u
          changed.push(i)
          flash.push(this.keyOf(u))
        }
      }
    }
    if (tx.remove?.length) {
      const idxs: number[] = []
      for (const r of tx.remove) {
        const i = findIndex(r)
        if (i >= 0) idxs.push(i)
      }
      const uniq = Array.from(new Set(idxs)).sort((a, b) => b - a) // 降序，避免位移影响
      for (const i of uniq) {
        this.slots.splice(i, 1)
        if (this.rowCount > 0) this.rowCount--
        structural = true
      }
    }
    if (tx.add?.length) {
      const rows = tx.add
      if (tx.addIndex != null && tx.addIndex >= 0 && tx.addIndex <= this.slots.length) {
        this.slots.splice(tx.addIndex, 0, ...rows)
      } else {
        for (const r of rows) this.slots.push(r)
      }
      if (this.rowCount > 0) this.rowCount += rows.length
      for (const r of rows) flash.push(this.keyOf(r))
      structural = true
    }
    if (structural) {
      // 位移后重建槽长度与末尾空位
      const len = Math.max(this.rowCount, 0)
      if (this.slots.length < len) this.slots.length = len
      else if (this.slots.length > len) this.slots.length = len
      this.touch.clear() // 位移使 LRU 失效，保守清空（不影响正确性）
    }
    return { changed, flash, structural }
  }
}

// ---------------- 异步事务批量器（applyTransactionAsync 语义） ----------------
/**
 * 把多次事务在「一次刷新」内合并后统一应用，降低高频推送的重排/重绘成本。
 * 合并规则：remove 的 key 覆盖之前对同 key 的 add/update；后到的 update 覆盖先到的。
 */
export type SsrmTxApplier = (tx: RjTransaction) => void

export class SsrmTxBatcher {
  private queue: RjTransaction[] = []
  private scheduled = false
  private apply: SsrmTxApplier
  private defer: (fn: () => void) => void

  constructor(apply: SsrmTxApplier, opts?: { defer?: (fn: () => void) => void }) {
    this.apply = apply
    this.defer =
      opts?.defer ??
      ((fn) => {
        // 默认微任务/宏任务合并；测试可注入同步调度
        setTimeout(fn, 0)
      })
  }

  push(tx: RjTransaction): void {
    this.queue.push(tx)
    if (!this.scheduled) {
      this.scheduled = true
      this.defer(() => this.flush())
    }
  }

  /** 立即合并并应用队列（返回合并后的事务，便于测试/回调） */
  flush(): RjTransaction {
    const merged = mergeTransactions(this.queue)
    this.queue = []
    this.scheduled = false
    if (merged.add || merged.update || merged.remove || merged.upsert) this.apply(merged)
    return merged
  }

  get pending(): number {
    return this.queue.length
  }
}

/** 合并多笔事务为一笔：同 key 后者胜；remove 压制 add/update */
export function mergeTransactions(list: RjTransaction[]): RjTransaction {
  const removed = new Set<string | number>()
  const updateMap = new Map<string | number, RjRowData>()
  const upsertMap = new Map<string | number, RjRowData>()
  const addList: RjRowData[] = []
  let addIndex: number | undefined

  const keyOfAny = (r: RjRowData) => {
    // 事务合并用稳定 key：优先常见 id 字段，退回对象身份
    const anyKey = r.id ?? r.key ?? r.uuid
    return anyKey != null ? anyKey : r
  }
  for (const tx of list) {
    if (tx.remove)
      for (const r of tx.remove) {
        const k = keyOfAny(r)
        removed.add(k)
        updateMap.delete(k)
        upsertMap.delete(k)
      }
    if (tx.upsert)
      for (const r of tx.upsert) {
        const k = keyOfAny(r)
        if (removed.has(k)) removed.delete(k)
        upsertMap.set(k, r)
      }
    if (tx.update)
      for (const r of tx.update) {
        const k = keyOfAny(r)
        if (!removed.has(k)) updateMap.set(k, r)
      }
    if (tx.add)
      for (const r of tx.add) {
        const k = keyOfAny(r)
        if (removed.has(k)) removed.delete(k) // 后到的 add 撤销同 key 的 remove
        addList.push(r)
      }
    if (tx.addIndex != null) addIndex = tx.addIndex
  }
  // remove 与 update 互斥优先 remove
  for (const k of updateMap.keys()) if (removed.has(k)) updateMap.delete(k)
  const out: RjTransaction = {}
  if (addList.length) {
    out.add = addList
    if (addIndex != null) out.addIndex = addIndex
  }
  if (updateMap.size) out.update = Array.from(updateMap.values())
  if (upsertMap.size) out.upsert = Array.from(upsertMap.values())
  if (removed.size)
    out.remove = Array.from(removed).map((k) =>
      typeof k === 'object' ? (k as RjRowData) : ({ id: k } as RjRowData)
    )
  return out
}
