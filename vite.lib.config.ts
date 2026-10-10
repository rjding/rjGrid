// RjGrid 库构建（pnpm build 第一步）：
//   dist/rj-grid.js  编译后的 ESM（.vue 已编译，宿主无需再装 vue 插件即可用）
//   dist/style.css   单一样式文件，宿主显式 import 'rj-grid/style.css'
// vue / echarts 走 external：前者是 peerDependency（避免双实例），后者是可选 peer（仅图表对话框动态加载）。
// dist 提交进 git：宿主经 git URL 安装时 npm 按 files 字段做 pack 式裁剪，产物开箱即用，
// 安装期不需要重建 vite/vue-tsc 工具链。发布纪律：改源码 → pnpm build → 源码与 dist 同 commit + tag。
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  logLevel: 'warn',
  // 库构建不拷 public/（运营资源不该混进发布物）
  publicDir: false,
  plugins: [vue()],
  // 库产物不压缩：保留 tree-shaking 粒度与可排查性，压缩交给宿主构建
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: false,
    // 不开 sourcemap：产物未压缩、map 无排查价值，还会让 dist 目录混入与源码目录重复的内容；
    // 需要定位问题时直接在本仓用源码调试。
    sourcemap: false,
    lib: {
      // 组件包真实入口：index.ts → RjGrid.vue → styles/rj-grid.scss，一次构建同时产出 JS 与 CSS
      entry: 'index.ts',
      formats: ['es'],
      fileName: () => 'rj-grid.js'
    },
    rollupOptions: {
      external: ['vue', 'echarts']
    }
  }
})
