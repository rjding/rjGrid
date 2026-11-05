// RjGrid 独立体积审计（pnpm size）：把 rj-grid 当作独立 lib 打包，量化「体积」这条硬指标；
// vite 构建摘要会同时打印 raw 与 gzip。与发布构建隔离，仅用于回归对比（外部依赖 vue / echarts 不计入体积）。
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  logLevel: 'warn',
  plugins: [vue()],
  build: {
    outDir: 'node_modules/.cache/rjsize',
    emptyOutDir: true,
    minify: 'esbuild',
    cssCodeSplit: false,
    sourcemap: false,
    lib: {
      // 组件包真实入口：index.ts → RjGrid.vue → styles/rj-grid.scss，一次构建同时产出 JS 与 CSS 体积
      entry: 'index.ts',
      formats: ['es'],
      fileName: 'rjgrid'
    },
    rollupOptions: {
      external: ['vue', 'echarts']
    }
  }
})
