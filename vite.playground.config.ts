// playground：独立演示/回归环境（pnpm dev），不依赖任何宿主工程。
// root 在 playground/，'rj-grid' 别名指到仓库根 index.ts —— 演示页与外部消费者的 import 写法完全一致。
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: 'playground',
  plugins: [vue()],
  resolve: {
    alias: [
      // 精确匹配：'rj-grid' → 本地源码入口；子路径（如 rj-grid/style.css）不被吞进前缀替换
      { find: /^rj-grid$/, replacement: fileURLToPath(new URL('./index.ts', import.meta.url)) }
    ]
  },
  server: {
    port: 5174,
    // root 在 playground，而源码在仓库根：显式放行上级目录，避免 fs.allow 拦下 ../src 的模块请求
    fs: { allow: ['..'] }
  },
  build: {
    outDir: '../playground-dist',
    emptyOutDir: true
  }
})
