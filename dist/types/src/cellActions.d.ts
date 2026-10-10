import type { InjectionKey } from 'vue';
import type { RjCellAction, RjCellParams } from './types';
/**
 * 操作列宿主：由 RjGrid provide。
 * - run：执行单个动作（内部按 confirm 走内置确认框，再回调 action.onClick 并派发 grid 级 cell-action 事件）
 * - openOverflow：在锚点元素处弹出"更多"下拉（浮层须挂在网格根，避免被 .rj-cell 的 overflow 裁切）
 */
export interface RjCellActionHost {
    run: (action: RjCellAction, params: RjCellParams) => void;
    openOverflow: (el: HTMLElement, actions: RjCellAction[], params: RjCellParams) => void;
}
export declare const RJ_CELL_ACTIONS_KEY: InjectionKey<RjCellActionHost>;
/**
 * 可见动作过滤：visible 缺省=可见（保留求值为 true 者）。
 * 回归护栏：曾误加取反（!evalFlag(...,true)）导致“未写 visible 的按钮被全部过滤、操作列空白”，
 * 且现有 harness 无 DOM 测不到组件渲染，故把该判定抽为纯函数单测锁定。
 */
export declare function filterVisibleActions(actions: RjCellAction[], ctxOf: (a: RjCellAction) => any): RjCellAction[];
/**
 * col.actions 生效判定（纯函数锁定）：插槽/cellRenderer 已接管、或钉行/合计行等合成行（drow.pinned）
 * 都不渲染按钮——曾因合计行走 type:'row' 合成 display 行而误渲染操作按钮。
 */
export declare function resolveColActions(actions: RjCellAction[] | undefined, opts: {
    overridden: boolean;
    pinned?: boolean;
}): RjCellAction[];
/**
 * 给定各按钮自然宽、可用宽与间距，贪心算出能 inline 放下的数量，其余收进“更多”。
 * 纯函数（无 DOM）便于单测：放不下全部时预留一个“更多”按钮宽 moreW + 一个 gap。
 * @param btnW 各按钮宽度（按显示顺序）
 * @param moreW “更多”按钮宽度
 * @param gap 按钮间距
 * @param avail 容器可用内宽
 * @returns inline 数量（0..btnW.length）
 */
export declare function computeInlineCount(btnW: number[], moreW: number, gap: number, avail: number): number;
