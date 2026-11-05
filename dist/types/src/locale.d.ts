import type { InjectionKey } from 'vue';
export type RjMessages = Record<string, string>;
export type RjLang = 'zh' | 'en';
/** 中文（默认）文案目录：既是内置默认，也是英文目录缺失键的回退 */
export declare const zhCN: RjMessages;
/** 英文文案：以中文为底，逐键覆盖，缺失键自动回退中文 */
export declare const enUS: RjMessages;
export declare const RJ_PRESETS: Record<RjLang, RjMessages>;
/** 归一语言标识：zh-CN/zh_TW/en-US/en 等 → 'zh' | 'en' */
export declare function normalizeLang(lang?: string): RjLang;
/** 解析最终文案表：预设底 + 局部覆盖（override 优先级最高） */
export declare function resolveMessages(lang?: string, override?: RjMessages | null): RjMessages;
/** 插值：把 {key} 替换为 params[key] */
export declare function interpolate(str: string, params?: Record<string, string | number>): string;
/** 翻译查表：命中返回并插值，未命中返回 key 本身（便于发现漏译） */
export declare function translate(messages: RjMessages, key: string, params?: Record<string, string | number>): string;
export type RjTranslate = (key: string, params?: Record<string, string | number>) => string;
/** 注入键：网格根 provide 翻译函数，子组件 inject 消费 */
export declare const RJ_LOCALE_KEY: InjectionKey<RjTranslate>;
/** 子组件默认翻译函数（未 inject 到时回退，避免单独使用时崩溃） */
export declare const defaultTranslate: RjTranslate;
