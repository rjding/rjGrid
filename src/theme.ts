// rj-grid 主题引擎：把结构化主题参数编译为一组 --rj-* CSS 变量（纯函数、确定性、可单测）。
// 对标 AG Grid Theming（Alpine / Quartz / Material 预设 + withParams 自定义 + 暗色模式）。
// 输出的变量以行内 style 绑定到 .rj-grid 根节点，覆盖 styles/rj-grid.scss 的默认调色板，级联到所有子元素。

export interface RjThemeParams {
  /** 预设风格：legacy=沿用内置默认；其余为 AG Grid 风格预设 */
  preset?: 'legacy' | 'alpine' | 'quartz' | 'material'
  /** 明暗模式：auto 由组件按系统偏好解析后传入具体值 */
  mode?: 'light' | 'dark' | 'auto'
  /** 主强调色（选中/悬停/焦点等派生色的基准） */
  accentColor?: string
  /** 单元格/主体背景 */
  backgroundColor?: string
  /** 斑马纹奇/偶行背景 */
  oddRowBackgroundColor?: string
  /** 表头背景 */
  headerBackgroundColor?: string
  /** 边框色 */
  borderColor?: string
  /** 主文本色 */
  foregroundColor?: string
  /** 次要文本色 */
  secondaryForegroundColor?: string
  /** 字号 */
  fontSize?: number | string
  /** 圆角 */
  radius?: number | string
  /** 直接覆盖任意 --rj-* 变量（逃生舱） */
  vars?: Record<string, string>
}

interface Palette {
  border: string
  borderStrong: string
  bg: string
  bgAlt: string
  headerBg: string
  headerHover: string
  text: string
  textSecondary: string
  radius: string
  fontSize: string
}

const LIGHT_DEFAULT_BG = '#ffffff'
const DARK_DEFAULT_BG = '#1e222a'

const PRESETS: Record<'alpine' | 'quartz' | 'material', { light: Palette; dark: Palette }> = {
  alpine: {
    light: {
      border: '#d3d3d8',
      borderStrong: '#c0c0c8',
      bg: '#ffffff',
      bgAlt: '#f9f9fb',
      headerBg: '#f3f4f6',
      headerHover: '#e9eaee',
      text: '#333a45',
      textSecondary: '#8a94a2',
      radius: '2px',
      fontSize: '13px'
    },
    dark: {
      border: '#3a4150',
      borderStrong: '#4a5262',
      bg: '#20242c',
      bgAlt: '#252a33',
      headerBg: '#2a2f39',
      headerHover: '#333a46',
      text: '#e6e9ef',
      textSecondary: '#8a919f',
      radius: '2px',
      fontSize: '13px'
    }
  },
  quartz: {
    light: {
      border: '#e5e7eb',
      borderStrong: '#d1d5db',
      bg: '#ffffff',
      bgAlt: '#fafafa',
      headerBg: '#f8fafc',
      headerHover: '#eef2f7',
      text: '#374151',
      textSecondary: '#94a3b8',
      radius: '8px',
      fontSize: '13px'
    },
    dark: {
      border: '#333a45',
      borderStrong: '#414956',
      bg: '#1c2128',
      bgAlt: '#222831',
      headerBg: '#232a33',
      headerHover: '#2b323d',
      text: '#e5e7eb',
      textSecondary: '#8b96a5',
      radius: '8px',
      fontSize: '13px'
    }
  },
  material: {
    light: {
      border: '#e0e0e0',
      borderStrong: '#c4c4c4',
      bg: '#ffffff',
      bgAlt: '#fafafa',
      headerBg: '#ffffff',
      headerHover: '#f0f0f0',
      text: '#212121',
      textSecondary: '#757575',
      radius: '4px',
      fontSize: '14px'
    },
    dark: {
      border: '#424242',
      borderStrong: '#5a5a5a',
      bg: '#303030',
      bgAlt: '#3a3a3a',
      headerBg: '#373737',
      headerHover: '#454545',
      text: '#f5f5f5',
      textSecondary: '#a8a8a8',
      radius: '4px',
      fontSize: '14px'
    }
  }
}

// ---------------- 颜色工具 ----------------

function parseColor(c: string): [number, number, number] | null {
  if (!c || typeof c !== 'string') return null
  let s = c.trim()
  if (s[0] === '#') {
    s = s.slice(1)
    if (s.length === 3)
      s = s
        .split('')
        .map((x) => x + x)
        .join('')
    if (s.length !== 6) return null
    const n = parseInt(s, 16)
    if (isNaN(n)) return null
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/i)
  if (m) {
    const p = m[1].split(',').map((x) => parseFloat(x.trim()))
    if (p.length >= 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])) return [p[0], p[1], p[2]]
  }
  return null
}

function toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}

/** a 向 b 按比例 w 混合：w=0 → a，w=1 → b。无法解析时返回 b。 */
function mix(a: string, b: string, w: number): string {
  const ca = parseColor(a)
  const cb = parseColor(b)
  if (!ca || !cb) return b
  return toHex(
    ca[0] + (cb[0] - ca[0]) * w,
    ca[1] + (cb[1] - ca[1]) * w,
    ca[2] + (cb[2] - ca[2]) * w
  )
}

function rgbaStr(c: string, al: number): string {
  const p = parseColor(c)
  if (!p) return c
  return `rgba(${p[0]}, ${p[1]}, ${p[2]}, ${al})`
}

const toSize = (v: number | string): string => (typeof v === 'number' ? v + 'px' : String(v))

// ---------------- 主函数 ----------------

/**
 * 把主题参数编译为 CSS 变量集合（仅包含需要覆盖的键，未设置的键沿用 scss 默认）。
 * 纯函数：无 DOM / 无时间戳 / 无随机，确定性可单测/快照。
 */
export function buildThemeVars(params: RjThemeParams = {}): Record<string, string> {
  const vars: Record<string, string> = {}
  const mode = params.mode === 'dark' ? 'dark' : 'light'
  const preset = params.preset

  // 1) 预设基础调色板（legacy 不输出，交给 scss 的 .rj-grid / .rj--dark）
  if (preset && preset !== 'legacy') {
    const p = PRESETS[preset][mode]
    vars['--rj-border'] = p.border
    vars['--rj-border-strong'] = p.borderStrong
    vars['--rj-bg'] = p.bg
    vars['--rj-bg-alt'] = p.bgAlt
    vars['--rj-header-bg'] = p.headerBg
    vars['--rj-header-hover'] = p.headerHover
    vars['--rj-text'] = p.text
    vars['--rj-text-secondary'] = p.textSecondary
    vars['--rj-radius'] = p.radius
    vars['--rj-font-size'] = p.fontSize
  }

  // 2) 结构化命名参数覆盖
  type NamedKey =
    | 'backgroundColor'
    | 'oddRowBackgroundColor'
    | 'headerBackgroundColor'
    | 'borderColor'
    | 'foregroundColor'
    | 'secondaryForegroundColor'
    | 'radius'
    | 'fontSize'
  const named: Array<[NamedKey, string]> = [
    ['backgroundColor', '--rj-bg'],
    ['oddRowBackgroundColor', '--rj-bg-alt'],
    ['headerBackgroundColor', '--rj-header-bg'],
    ['borderColor', '--rj-border'],
    ['foregroundColor', '--rj-text'],
    ['secondaryForegroundColor', '--rj-text-secondary'],
    ['radius', '--rj-radius'],
    ['fontSize', '--rj-font-size']
  ]
  for (const [k, v] of named) {
    const val = params[k]
    if (val == null) continue
    vars[v] =
      typeof val === 'number' || k === 'fontSize' || k === 'radius' ? toSize(val) : String(val)
  }

  // 3) 强调色 + 派生（悬停/选中/区域/填充/主背景）
  if (params.accentColor) {
    const accent = params.accentColor
    const bg = vars['--rj-bg'] || (mode === 'dark' ? DARK_DEFAULT_BG : LIGHT_DEFAULT_BG)
    vars['--rj-primary'] = accent
    vars['--rj-primary-bg'] = mix(bg, accent, mode === 'dark' ? 0.28 : 0.12)
    vars['--rj-hover-bg'] = mix(bg, accent, mode === 'dark' ? 0.14 : 0.06)
    vars['--rj-selected-bg'] = mix(bg, accent, mode === 'dark' ? 0.38 : 0.2)
    vars['--rj-range-bg'] = rgbaStr(accent, 0.1)
    vars['--rj-fill-bg'] = rgbaStr(accent, 0.16)
  }

  // 4) 任意原始变量逃生舱（优先级最高）
  if (params.vars) {
    for (const k of Object.keys(params.vars)) {
      const val = params.vars[k]
      if (val == null) continue
      vars[k.startsWith('--') ? k : '--' + k] = String(val)
    }
  }

  return vars
}

/**
 * 解析 auto → light/dark（组件侧调用）。
 * 三级优先级：显式 mode（dark/light）> 宿主 <html>.dark/.light class（hostDark，null 表示宿主未表态）> OS prefers-color-scheme。
 * hostDark 作为可选第三参并默认 null，保持既有两参调用与测试不受影响。
 */
export function resolveMode(
  mode: RjThemeParams['mode'],
  prefersDark: boolean,
  hostDark: boolean | null = null
): 'light' | 'dark' {
  if (mode === 'dark') return 'dark'
  if (mode === 'light') return 'light'
  if (hostDark !== null) return hostDark ? 'dark' : 'light'
  return prefersDark ? 'dark' : 'light'
}
