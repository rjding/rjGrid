// RjGrid 体积审计后处理：读取 vite.size.config.ts 的 lib 产物，打印 raw + gzip。
// 由 package.json 的 `npm run size:rj` 串联调用；产物在 node_modules/.cache/rjsize。
import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'

const outDir = 'node_modules/.cache/rjsize'
// vite lib(ES) 在 package.json type:module 下产出 .js（不是 .mjs）；两种命名都兼容查找，避免漏报 JS
const jsName = ['rjgrid.js', 'rjgrid.mjs'].find((n) => fs.existsSync(path.join(outDir, n)))
const targets = [jsName, 'style.css'].filter(Boolean)
const kb = (n) => (n / 1024).toFixed(1)

let totalGz = 0
for (const t of targets) {
  const file = path.join(outDir, t)
  if (!fs.existsSync(file)) {
    console.warn(`[size:rj] 缺少产物：${file}`)
    continue
  }
  const buf = fs.readFileSync(file)
  const gz = zlib.gzipSync(buf, { level: 9 })
  totalGz += gz.length
  console.log(`[size:rj] ${t}: raw ${kb(buf.length)} KB -> gzip ${kb(gz.length)} KB`)
}
console.log(`[size:rj] 合计 gzip：${kb(totalGz)} KB（vue / echarts 为外部依赖，不计入）`)
