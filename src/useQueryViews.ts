// rj-grid 自定义视图存储：把「查询字段 + 条件 + 列布局 + 排序/分组」整体存成一个可命名的快照
// 设计要点：按 stateKey 隔离，走 localStorage，带版本前缀；损坏/版本不符时静默忽略，功能降级为会话内可用。
import { ref, type Ref } from 'vue'
import type { RjSavedView } from './types'

const PREFIX = 'rj-grid:view:'

function storageKey(stateKey: string): string {
  return PREFIX + stateKey
}

/** 读取自建视图；损坏或非数组时返回空数组（不让网格崩） */
export function loadSavedViews(stateKey?: string): RjSavedView[] {
  if (!stateKey) return []
  try {
    const raw = localStorage.getItem(storageKey(stateKey))
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(
      (v: any) => v && typeof v.id === 'string' && typeof v.name === 'string'
    ) as RjSavedView[]
  } catch {
    return []
  }
}

export function persistViews(stateKey: string | undefined, views: RjSavedView[]): void {
  if (!stateKey) return
  try {
    // 只持久化自建视图（内置视图由宿主随组件传入，不落盘）
    localStorage.setItem(
      storageKey(stateKey),
      JSON.stringify(views.filter((v) => !v.builtin))
    )
  } catch {
    /* 存储满 / 隐私模式：忽略，视图功能降级为本次会话内可用 */
  }
}

export function newViewId(): string {
  return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/**
 * 视图列表状态容器：内置视图（宿主传入，只读，恒在前）+ 自建视图（localStorage）。
 * stateKey 为空时降级为仅内存/仅内置。
 */
export function useSavedViews(
  stateKey: () => string | undefined,
  builtin: () => RjSavedView[] = () => []
): {
  views: Ref<RjSavedView[]>
  reload: () => RjSavedView[]
  upsert: (v: RjSavedView) => RjSavedView[]
  remove: (id: string) => RjSavedView[]
} {
  const views = ref<RjSavedView[]>([])

  function reload(): RjSavedView[] {
    views.value = [...builtin(), ...loadSavedViews(stateKey())]
    return views.value
  }

  function upsert(v: RjSavedView): RjSavedView[] {
    const list = loadSavedViews(stateKey())
    const idx = list.findIndex((x) => x.id === v.id)
    if (idx >= 0) list[idx] = v
    else list.unshift(v)
    persistViews(stateKey(), list)
    views.value = [...builtin(), ...list]
    return views.value
  }

  function remove(id: string): RjSavedView[] {
    const list = loadSavedViews(stateKey()).filter((x) => x.id !== id)
    persistViews(stateKey(), list)
    views.value = [...builtin(), ...list]
    return views.value
  }

  reload()
  return { views, reload, upsert, remove }
}
