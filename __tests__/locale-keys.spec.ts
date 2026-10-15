// i18n 调用点静态审计：扫描组件源码里所有 t('key') / labelKey: 'key' 字面量，
// 断言每个 key 在 zh 与 en 词表里都存在。
// 动机：translate() 找不到 key 时会原样回吐 key（en 词表还会静默回落 zh），
// 拼错一个 key 就是一条「界面上显示 rjGrid.xxx」的漏翻缺陷，靠人工点界面很难穷尽。
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { describe, it, expect } from './harness'
import { zhCN, enUS } from '../src/locale'
import { AGG_LABELS } from '../src/utils'
import { FILTER_OPS } from '../src/useRowModel'

// 注意：harness 把 bundle 输出到 node_modules/.cache，__dirname 不可用，
// 而 test:rj 始终在仓库根目录执行 → 以 cwd 为锚。
const SRC_DIR = resolve(process.cwd(), 'src')

function walk(dir: string): string[] {
  const out: string[] = []
  readdirSync(dir).forEach((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(ts|vue)$/.test(name)) out.push(p)
  })
  return out
}

/** 收集字面量 key：t('k') / t('k', …) / labelKey: 'k' / msgKey: 'k' */
const KEY_RE =
  /\b(?:t|translate)\(\s*'([A-Za-z][A-Za-z0-9_]*)'|(?:labelKey|msgKey|titleKey)\s*:\s*'([A-Za-z][A-Za-z0-9_]*)'/g

function collectKeys(): { key: string; where: string }[] {
  const hits: { key: string; where: string }[] = []
  walk(SRC_DIR).forEach((file) => {
    const text = readFileSync(file, 'utf8')
    let m: RegExpExecArray | null
    KEY_RE.lastIndex = 0
    while ((m = KEY_RE.exec(text))) {
      const key = m[1] || m[2]
      hits.push({ key, where: file.replace(SRC_DIR + '/', '') })
    }
  })
  return hits
}

describe('i18n 调用点 key 必须存在于双语词表', () => {
  const hits = collectKeys()
  const uniq = Array.from(new Set(hits.map((h) => h.key)))

  it('扫描到足够多的调用点（防正则失效导致空跑）', () => {
    expect(uniq.length > 100).toBe(true, `唯一 key 数=${uniq.length}，命中行数=${hits.length}`)
    console.log(`     ℹ 静态扫描 ${uniq.length} 个唯一 i18n key（来自 ${hits.length} 处调用）`)
  })

  it('每个 key 在 zh 词表存在（缺失会在界面上直接显示裸 key）', () => {
    const missing = uniq.filter((k) => zhCN[k] == null)
    expect(missing.join(', ')).toBe('', `zh 缺失：${missing.join(', ')}`)
  })

  it('每个 key 在 en 词表存在（缺失会静默回落中文 = 漏翻）', () => {
    const missing = uniq.filter((k) => enUS[k] == null)
    expect(missing.join(', ')).toBe('', `en 缺失：${missing.join(', ')}`)
  })

  it('AGG_LABELS / FILTER_OPS 的间接 key 同样双语齐备', () => {
    const opKeys: string[] = []
    Object.keys(FILTER_OPS).forEach((k) => FILTER_OPS[k].forEach((o) => opKeys.push(o.labelKey)))
    const indirect = [...Object.values(AGG_LABELS), ...opKeys] as string[]
    expect(indirect.length > 0).toBe(true, '间接 key 已收集')
    expect(indirect.filter((k) => zhCN[k] == null).join(', ')).toBe('', 'zh 缺失间接 key')
    expect(indirect.filter((k) => enUS[k] == null).join(', ')).toBe('', 'en 缺失间接 key')
  })

  it('英文文案不留全角标点（切 EN 后界面混排中文标点属漏翻）', () => {
    const bad = Object.keys(enUS).filter((k) => /[：，；！？（）｜【】、]/.test(enUS[k]))
    expect(bad.join(', ')).toBe('', `en 含全角标点的 key：${bad.join(', ')}`)
  })
})
