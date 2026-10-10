// 发布前产物体检（npm run check:rjdist）：确认 dist 自洽、无宿主残留
// 1) 运行时外部 import 只允许 vue / echarts（其余相对 import 说明打包没闭合）
// 2) CSS 不引用宿主资源（url(...) 不能指向 ../ 或 /src/）
// 3) d.ts 入口存在且只引用包内相对路径
// 4) dist 里不得出现源码文件（.vue / .ts 原件混进包＝泄漏本仓源码）
// 5) 不得内嵌 sourcemap：vite 的 .map 带 sourcesContent，等于把原始 .vue/.ts 源码一起发布
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const dist = join(process.cwd(), 'dist')
const fails = []
const notes = []

if (!existsSync(dist)) fails.push('dist 不存在，先跑 pnpm build')

const jsPath = join(dist, 'rj-grid.js')
if (existsSync(jsPath)) {
  const js = readFileSync(jsPath, 'utf8')
  const specs = [...js.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
  const external = [...new Set(specs.filter((s) => !s.startsWith('.')))].sort()
  const illegal = external.filter((s) => s !== 'vue' && s !== 'echarts')
  notes.push('外部依赖: ' + (external.join(', ') || '(无)'))
  if (illegal.length) fails.push('产物引入了未声明的外部依赖: ' + illegal.join(', '))
  if (/@[A-Za-z]+\//.test(js)) fails.push('产物里残留 @/ 宿主别名引用')
  if (/\bprocess\.env\b/.test(js)) fails.push('产物里残留 process.env（浏览器端会 ReferenceError）')
  if (/from ['"]\.\.\/\.\.\/src/.test(js)) fails.push('产物里有指向 src 的相对 import')
  notes.push('产物体积: ' + (js.length / 1024).toFixed(0) + ' KB（未压缩）')
}

const cssPath = join(dist, 'style.css')
if (existsSync(cssPath)) {
  const css = readFileSync(cssPath, 'utf8')
  const urls = [...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1])
  const bad = urls.filter((u) => u.startsWith('../') || u.startsWith('/src') || u.startsWith('/@'))
  if (bad.length) fails.push('CSS 引用了宿主资源: ' + bad.join(', '))
  notes.push(
    'CSS 体积: ' + (css.length / 1024).toFixed(0) + ' KB，url() 引用 ' + urls.length + ' 处'
  )
} else {
  fails.push('缺少 dist/style.css')
}

const dtsEntry = join(dist, 'types/index.d.ts')
if (existsSync(dtsEntry)) {
  const dts = readFileSync(dtsEntry, 'utf8')
  const specs = [...dts.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
  const external = specs.filter((s) => !s.startsWith('.'))
  if (external.some((s) => s !== 'vue'))
    fails.push('d.ts 引入了意外外部模块: ' + external.join(', '))
  // 声明里每条相对引用都要能在 dist/types 下解析到（含 .vue → .vue.d.ts）
  const missing = specs
    .filter((s) => s.startsWith('.'))
    .map((s) => s.replace('./', 'types/'))
    .filter((p) => {
      const abs = join(dist, p)
      return !(
        existsSync(abs + '.d.ts') ||
        existsSync(abs) ||
        existsSync(abs.replace(/\.vue$/, '.vue.d.ts'))
      )
    })
  if (missing.length) fails.push('d.ts 断链（引用不存在的声明）: ' + missing.join(', '))
} else {
  fails.push('缺少 dist/types/index.d.ts')
}

// 源码泄漏体检
const stray = []
const maps = []
;(function walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.map$/.test(n)) maps.push(relative(dist, p).replace(/\\/g, '/'))
    else if (/\.(ts|vue|scss)$/.test(n) && !p.includes('types' + '\\') && !p.endsWith('.d.ts'))
      stray.push(relative(dist, p).replace(/\\/g, '/'))
  }
})(dist)
if (stray.length) fails.push('dist 混入源码文件: ' + stray.join(', '))
// sourcemap 检查：.map 本身不允许存在；产物里也不得残留 sourceMappingURL 指向
if (maps.length) fails.push('dist 带 sourcemap（会随包发布源码）: ' + maps.join(', '))
if (existsSync(jsPath) && /sourceMappingURL/.test(readFileSync(jsPath, 'utf8'))) {
  fails.push('产物残留 sourceMappingURL，宿主调试时会拉到不存在的 map')
}

notes.forEach((n) => console.log('  [体检] ' + n))
if (fails.length) {
  fails.forEach((f) => console.error('  [失败] ' + f))
  process.exit(1)
}
console.log('[check:rjdist] 通过：产物自洽、无宿主残留、无源码泄漏')
