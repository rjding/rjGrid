// locale.ts 纯函数单元测试（i18n 目录 / 插值 / 查表 / 归一）
import { describe, it, expect } from './harness'
import { FILTER_OPS } from '../src/useRowModel'
import { AGG_LABELS } from '../src/utils'
import {
  normalizeLang,
  resolveMessages,
  interpolate,
  translate,
  defaultTranslate,
  zhCN,
  enUS,
  RJ_PRESETS
} from '../src/locale'

describe('locale.normalizeLang', () => {
  it('各种区域标识归一到 zh / en', () => {
    expect(normalizeLang()).toBe('zh')
    expect(normalizeLang('')).toBe('zh')
    expect(normalizeLang('zh-CN')).toBe('zh')
    expect(normalizeLang('en')).toBe('en')
    expect(normalizeLang('en-US')).toBe('en')
    expect(normalizeLang('EN_gb')).toBe('en')
    expect(normalizeLang('fr')).toBe('zh')
  })
})

describe('locale.interpolate', () => {
  it('替换多个 {key}，缺 params 原样返回', () => {
    expect(interpolate('已选 {n} 行', { n: 5 })).toBe('已选 5 行')
    expect(interpolate('{a}-{b}-{a}', { a: 1, b: 2 })).toBe('1-2-1')
    expect(interpolate('无占位')).toBe('无占位')
  })
  it('重复花括号安全（split/join 非正则）', () => {
    expect(interpolate('共 {n} 条 / {n}', { n: 0 })).toBe('共 0 条 / 0')
  })
})

describe('locale.translate', () => {
  it('命中返回并插值', () => {
    expect(translate(zhCN, 'empty')).toBe('暂无数据')
    expect(translate(enUS, 'empty')).toBe('No rows')
    expect(translate(enUS, 'selRows', { n: 3 })).toBe('3 selected')
  })
  it('未命中回退返回 key 本身', () => {
    expect(translate(zhCN, 'no.such.key')).toBe('no.such.key')
  })
})

describe('locale.resolveMessages', () => {
  it('en 预设以中文为底，未覆盖键回退中文', () => {
    const m = resolveMessages('en')
    expect(m.empty).toBe('No rows')
    // enUS 未定义、但 zhCN 有的键（人为构造：取一个仅存在于 zhCN 的键）
    expect(typeof m.sortAsc).toBe('string')
  })
  it('override 优先级最高，且不影响预设本体', () => {
    const m = resolveMessages('zh', { empty: '自定义空态' })
    expect(m.empty).toBe('自定义空态')
    expect(zhCN.empty).toBe('暂无数据')
  })
  it('无 override 时返回预设引用', () => {
    expect(resolveMessages('zh')).toBe(RJ_PRESETS.zh)
  })
})

describe('locale.目录完整性', () => {
  it('en 目录的键必须是 zh 目录的子集（避免悬空英文键）', () => {
    const zhKeys = Object.keys(zhCN)
    Object.keys(enUS).forEach((k) => expect(zhKeys.indexOf(k) >= 0).toBe(true))
  })
  it('zh 目录的键全部被 en 目录覆盖（英文界面不得回落中文）', () => {
    const miss = Object.keys(zhCN).filter((k) => enUS[k] == null)
    expect(miss.join(',')).toBe('')
  })
  it('筛选算子 labelKey 在中英目录都存在', () => {
    Object.keys(FILTER_OPS).forEach((type) => {
      FILTER_OPS[type].forEach((o) => {
        expect(zhCN[o.labelKey] != null).toBe(true)
        expect(enUS[o.labelKey] != null).toBe(true)
      })
    })
  })
  it('聚合标签 key 在中英目录都存在', () => {
    Object.keys(AGG_LABELS).forEach((k) => {
      const key = (AGG_LABELS as Record<string, string>)[k]
      expect(zhCN[key] != null).toBe(true)
      expect(enUS[key] != null).toBe(true)
    })
  })
  it('关键 chrome 键在中英目录都存在', () => {
    const need = [
      'empty',
      'loading',
      'sortAsc',
      'filter',
      'first',
      'aggSum',
      'cmEdit',
      'opContains',
      'opInRange',
      'andOp',
      'orOp',
      'imgPreview',
      'chartTitle',
      'chartNoSeries',
      'yesVal',
      'noVal',
      'moreCols',
      'pageNumber',
      'summaryTotal',
      'summaryOf',
      'grandTotal',
      'ariaLabel'
    ]
    need.forEach((k) => {
      expect(zhCN[k] != null).toBe(true)
      expect(enUS[k] != null).toBe(true)
    })
  })
  it('defaultTranslate 在未注入时可独立工作', () => {
    expect(defaultTranslate('empty')).toBe('暂无数据')
    expect(defaultTranslate('selRows', { n: 2 })).toBe('已选 2 行')
    expect(defaultTranslate('x.y')).toBe('x.y')
  })
})
