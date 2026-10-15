import { type Ref } from 'vue';
import type { RjSavedView } from './types';
/** 读取自建视图；损坏或非数组时返回空数组（不让网格崩） */
export declare function loadSavedViews(stateKey?: string): RjSavedView[];
export declare function persistViews(stateKey: string | undefined, views: RjSavedView[]): void;
export declare function newViewId(): string;
/**
 * 视图列表状态容器：内置视图（宿主传入，只读，恒在前）+ 自建视图（localStorage）。
 * stateKey 为空时降级为仅内存/仅内置。
 */
export declare function useSavedViews(stateKey: () => string | undefined, builtin?: () => RjSavedView[]): {
    views: Ref<RjSavedView[]>;
    reload: () => RjSavedView[];
    upsert: (v: RjSavedView) => RjSavedView[];
    remove: (id: string) => RjSavedView[];
};
