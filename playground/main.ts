// playground 入口：演示页的 ElMessage 用 element-plus（仅 dev 侧依赖，发布物不含），
// 组件样式直接引源码里的 scss —— 与消费者 import 'rj-grid/style.css' 同源同效。
// 全局注册 element-plus：#cell-slot 回归页在模板里用 el-tag/el-switch/el-button，
// 刻意仿真主机的全局注册形态（插槽必须走真 vnode 才能正常渲染交互组件）。
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '../src/styles/rj-grid.scss'
import App from './App.vue'

createApp(App).use(ElementPlus).mount('#app')
