export interface RjThemeParams {
    /** 预设风格：legacy=沿用内置默认；其余为 AG Grid 风格预设 */
    preset?: 'legacy' | 'alpine' | 'quartz' | 'material';
    /** 明暗模式：auto 由组件按系统偏好解析后传入具体值 */
    mode?: 'light' | 'dark' | 'auto';
    /** 主强调色（选中/悬停/焦点等派生色的基准） */
    accentColor?: string;
    /** 单元格/主体背景 */
    backgroundColor?: string;
    /** 斑马纹奇/偶行背景 */
    oddRowBackgroundColor?: string;
    /** 表头背景 */
    headerBackgroundColor?: string;
    /** 边框色 */
    borderColor?: string;
    /** 主文本色 */
    foregroundColor?: string;
    /** 次要文本色 */
    secondaryForegroundColor?: string;
    /** 字号 */
    fontSize?: number | string;
    /** 圆角 */
    radius?: number | string;
    /** 直接覆盖任意 --rj-* 变量（逃生舱） */
    vars?: Record<string, string>;
}
/**
 * 把主题参数编译为 CSS 变量集合（仅包含需要覆盖的键，未设置的键沿用 scss 默认）。
 * 纯函数：无 DOM / 无时间戳 / 无随机，确定性可单测/快照。
 */
export declare function buildThemeVars(params?: RjThemeParams): Record<string, string>;
/**
 * 解析 auto → light/dark（组件侧调用）。
 * 三级优先级：显式 mode（dark/light）> 宿主 <html>.dark/.light class（hostDark，null 表示宿主未表态）> OS prefers-color-scheme。
 * hostDark 作为可选第三参并默认 null，保持既有两参调用与测试不受影响。
 */
export declare function resolveMode(mode: RjThemeParams['mode'], prefersDark: boolean, hostDark?: boolean | null): 'light' | 'dark';
