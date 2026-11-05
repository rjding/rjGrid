// theme.ts 纯函数单元测试（buildThemeVars：确定性、无 DOM）
import { describe, it, expect } from './harness'
import { buildThemeVars, resolveMode, type RjThemeParams } from '../src/theme'

describe('theme.buildThemeVars 基础', () => {
  it('空参数 / legacy 不产出变量（沿用 scss 默认）', () => {
    expect(buildThemeVars()).toEqual({})
    expect(buildThemeVars({})).toEqual({})
    expect(buildThemeVars({ preset: 'legacy' })).toEqual({})
  })
  it('quartz light 输出完整调色板但不含主色', () => {
    const v = buildThemeVars({ preset: 'quartz', mode: 'light' })
    expect(v['--rj-bg']).toBe('#ffffff')
    expect(v['--rj-radius']).toBe('8px')
    expect(v['--rj-font-size']).toBe('13px')
    expect(v['--rj-border']).toBe('#e5e7eb')
    expect(v['--rj-primary']).toBe(undefined)
  })
  it('quartz dark 背景切换为深色', () => {
    const v = buildThemeVars({ preset: 'quartz', mode: 'dark' })
    expect(v['--rj-bg']).toBe('#1c2128')
    expect(v['--rj-text']).toBe('#e5e7eb')
  })
  it('alpine 圆角 2px，material 字号 14px', () => {
    expect(buildThemeVars({ preset: 'alpine' })['--rj-radius']).toBe('2px')
    expect(buildThemeVars({ preset: 'material' })['--rj-font-size']).toBe('14px')
  })
})

describe('theme.强调色派生', () => {
  it('light 下 selected-bg = 白向强调色混合 0.2', () => {
    const v = buildThemeVars({ accentColor: '#3b76f6' })
    expect(v['--rj-primary']).toBe('#3b76f6')
    expect(v['--rj-range-bg']).toBe('rgba(59, 118, 246, 0.1)')
    expect(v['--rj-fill-bg']).toBe('rgba(59, 118, 246, 0.16)')
    // mix(#ffffff,#3b76f6,0.2) = #d8e4fd
    expect(v['--rj-selected-bg']).toBe('#d8e4fd')
  })
  it('dark 下派生使用深色底并按更大权重混合', () => {
    const v = buildThemeVars({ mode: 'dark', accentColor: '#ff0000' })
    const sb = v['--rj-selected-bg']
    expect(/^#[0-9a-f]{6}$/.test(sb)).toBe(true)
    // mix(#1e222a,#ff0000,0.38) 的红通道应显著抬升
    expect(parseInt(sb.slice(1, 3), 16) > 0x1e).toBe(true)
  })
  it('非 hex 强调色仍设主色但不派生 hex', () => {
    const v = buildThemeVars({ accentColor: 'teal' })
    expect(v['--rj-primary']).toBe('teal')
    expect(v['--rj-range-bg']).toBe('teal') // 无法解析 → 原样返回
  })
})

describe('theme.命名参数与逃生舱', () => {
  it('number → px，backgroundColor 覆盖 --rj-bg', () => {
    const v = buildThemeVars({ fontSize: 14, radius: 6, backgroundColor: '#123456' })
    expect(v['--rj-font-size']).toBe('14px')
    expect(v['--rj-radius']).toBe('6px')
    expect(v['--rj-bg']).toBe('#123456')
  })
  it('vars 原始覆盖：自动补 -- 前缀，且优先级最高', () => {
    const v = buildThemeVars({ vars: { 'rj-foo': 'bar', '--rj-baz': 'x' } })
    expect(v['--rj-foo']).toBe('bar')
    expect(v['--rj-baz']).toBe('x')
  })
  it('vars 覆盖强调色派生结果', () => {
    const v = buildThemeVars({ accentColor: '#3b76f6', vars: { '--rj-primary-bg': '#000000' } })
    expect(v['--rj-primary-bg']).toBe('#000000')
  })
  it('命名 bg 参与强调色派生（作为混合基色）', () => {
    const a = buildThemeVars({ backgroundColor: '#000000', accentColor: '#ff0000' })
    const b = buildThemeVars({ backgroundColor: '#ffffff', accentColor: '#ff0000' })
    expect(a['--rj-selected-bg'] != null).toBe(true)
    expect(a['--rj-selected-bg'] === b['--rj-selected-bg']).toBe(false)
  })
})

describe('theme.resolveMode', () => {
  const cases: Array<[RjThemeParams['mode'], boolean, 'light' | 'dark']> = [
    ['dark', false, 'dark'],
    ['light', true, 'light'],
    ['auto', true, 'dark'],
    ['auto', false, 'light'],
    [undefined, true, 'dark']
  ]
  it('按具体值/系统偏好解析 auto', () => {
    cases.forEach(([m, pd, exp]) => expect(resolveMode(m, pd)).toBe(exp))
  })
  it('三级优先级：显式 mode > 宿主 class > OS 偏好', () => {
    // 显式 mode 屏蔽宿主探测
    expect(resolveMode('light', true, true)).toBe('light')
    expect(resolveMode('dark', false, false)).toBe('dark')
    // 未表态 mode 时宿主 class 优先于 OS
    expect(resolveMode('auto', false, true)).toBe('dark')
    expect(resolveMode(undefined, false, true)).toBe('dark')
    expect(resolveMode(undefined, true, false)).toBe('light')
    // 宿主未表态（null）回落 OS
    expect(resolveMode(undefined, true, null)).toBe('dark')
    expect(resolveMode(undefined, false, null)).toBe('light')
  })
})
