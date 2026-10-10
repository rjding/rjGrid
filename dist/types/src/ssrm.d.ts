import type { RjRowData, RjTransaction } from './types';
/** 块加载状态（仅描述进行中的请求，已加载由覆盖度派生） */
export interface SsrmInflight {
    seq: number;
    status: 'loading' | 'error';
}
export interface SsrmStoreOptions {
    /** 每块行数 */
    blockSize: number;
    /** 缓存中最多保留的已加载块数（0/undefined = 不限）；超出按 LRU 淘汰 */
    maxBlocksInCache?: number;
    /** 视口外额外保留块数 */
    cacheOverflow?: number;
    /** 取行主键 */
    keyOf: (row: RjRowData) => string | number;
}
export interface SsrmDeltaResult {
    /** 受影响的绝对行下标（供局部重绘） */
    changed: number[];
    /** 需要闪烁高亮的 key */
    flash: (string | number)[];
    /** 结构是否发生变化（add/remove 导致行位移） */
    structural: boolean;
}
export declare class SsrmStore {
    /** 服务端总行数；-1 表示未知（尚未收到 total） */
    rowCount: number;
    readonly blockSize: number;
    readonly maxBlocksInCache: number;
    readonly cacheOverflow: number;
    private readonly keyOf;
    /** dense 行槽：长度 = max(rowCount,0)；undefined 表示未加载 */
    slots: (RjRowData | undefined)[];
    /** 每个块的进行中标记（loading / error 重试） */
    private inflight;
    /** 每块的最近访问时间（LRU），仅在覆盖完整时有效 */
    private touch;
    private clock;
    private seq;
    constructor(opts: SsrmStoreOptions);
    blockIndexOf(row: number): number;
    startRowOf(blockIndex: number): number;
    /** 块实际结束行（不含）；末块受 rowCount 截断 */
    endRowOf(blockIndex: number): number;
    blockCount(): number;
    /** 该块行区间是否被完全填充（= 已加载） */
    isBlockLoaded(blockIndex: number): boolean;
    /** 设定/更新总数并调整 slots 长度，保留已加载内容 */
    configure(total: number): void;
    reset(): void;
    rowAt(i: number): RjRowData | undefined;
    loadedRowCount(): number;
    /**
     * 规划需要请求的块：覆盖 [first-prefetch, last+prefetch] 且未加载、非进行中的块，
     * 按「距视口中心由近及远」排序（优先补最可见处）。
     */
    planLoad(first: number, last: number, prefetch?: number): number[];
    /** 标记块开始加载，返回本次请求的 seq（用于竞态守卫） */
    beginLoad(blockIndex: number): number;
    /** 提交块数据：seq 过期则丢弃；写入 slots；返回是否被应用 */
    commitLoad(blockIndex: number, seq: number, rows: RjRowData[]): boolean;
    /** 标记块加载失败（可重试） */
    failLoad(blockIndex: number, seq: number): void;
    isLoadingAny(): boolean;
    /** 指定块是否正在加载中（用于 boot 块去重） */
    isBlockBusy(blockIndex: number): boolean;
    /**
     * 依据保留集合淘汰「已加载且不在 keep 内」的块，按 LRU（touch 时钟）优先淘汰最久未用。
     * 进行中的块永不淘汰。返回被淘汰的块索引。
     */
    prune(keep: Set<number>): number[];
    /** keep 集合：视口块 ± cacheOverflow */
    keepSet(first: number, last: number): Set<number>;
    /**
     * 对已加载内容应用增量：
     * - update：按 key 原地替换已加载行（不位移），闪烁；
     * - upsert：命中已加载则更新，否则忽略（服务端权威，避免破坏块区间）；
     * - add：追加到末尾（rowCount++），闪烁；
     * - remove：按 key 从已加载槽移除并左移尾块（structural）。
     */
    applyDelta(tx: RjTransaction): SsrmDeltaResult;
}
/**
 * 把多次事务在「一次刷新」内合并后统一应用，降低高频推送的重排/重绘成本。
 * 合并规则：remove 的 key 覆盖之前对同 key 的 add/update；后到的 update 覆盖先到的。
 */
export type SsrmTxApplier = (tx: RjTransaction) => void;
export declare class SsrmTxBatcher {
    private queue;
    private scheduled;
    private apply;
    private defer;
    constructor(apply: SsrmTxApplier, opts?: {
        defer?: (fn: () => void) => void;
    });
    push(tx: RjTransaction): void;
    /** 立即合并并应用队列（返回合并后的事务，便于测试/回调） */
    flush(): RjTransaction;
    get pending(): number;
}
/** 合并多笔事务为一笔：同 key 后者胜；remove 压制 add/update */
export declare function mergeTransactions(list: RjTransaction[]): RjTransaction;
