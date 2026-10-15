/**
 * 行数据 → 可复制的格式化 JSON 文本（内置右键「查看该行 JSON」用）。
 * 零依赖纯函数，单独抽出便于单测：
 * - 循环引用 → "[Circular]"（AG Grid 同款占位口径）
 * - 函数值 → 源码文本（不让 JSON.stringify 直接丢掉，宿主自定义字段常挂函数）
 * - 序列化失败（如 BigInt）→ 降级 String(row)，保证弹层永远有内容可复制
 */
export function stringifyRowJson(row: unknown): string {
  try {
    const seen = new WeakSet<object>()
    const out = JSON.stringify(
      row,
      (_key: string, value: unknown) => {
        if (typeof value === 'function') return String(value)
        if (value && typeof value === 'object') {
          if (seen.has(value as object)) return '[Circular]'
          seen.add(value as object)
        }
        return value
      },
      2
    )
    // undefined / 序列化出 undefined 的行降级为字面量文本
    return out === undefined ? String(row) : out
  } catch {
    try {
      return String(row)
    } catch {
      return '(unserializable row)'
    }
  }
}
