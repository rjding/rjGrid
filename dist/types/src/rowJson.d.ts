/**
 * 行数据 → 可复制的格式化 JSON 文本（内置右键「查看该行 JSON」用）。
 * 零依赖纯函数，单独抽出便于单测：
 * - 循环引用 → "[Circular]"（AG Grid 同款占位口径）
 * - 函数值 → 源码文本（不让 JSON.stringify 直接丢掉，宿主自定义字段常挂函数）
 * - 序列化失败（如 BigInt）→ 降级 String(row)，保证弹层永远有内容可复制
 */
export declare function stringifyRowJson(row: unknown): string;
