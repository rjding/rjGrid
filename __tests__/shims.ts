// 测试垫片：项目通过 unplugin-auto-import 把 Vue 组合式 API 注入为全局，
// 而 node harness 里没有这一步，行模型（useRowModel）会报 ref is not defined。
// 在 run.ts 中最先 import 本文件，把用到的 API 挂到 globalThis。
import * as Vue from 'vue'

const VUE_GLOBALS = [
  'ref',
  'shallowRef',
  'isRef',
  'unref',
  'toRef',
  'toRefs',
  'computed',
  'reactive',
  'readonly',
  'isReactive',
  'isProxy',
  'toRaw',
  'markRaw',
  'effectScope',
  'getCurrentScope',
  'onScopeDispose',
  'watch',
  'watchEffect',
  'watchPostEffect',
  'nextTick'
]

const g = globalThis as Record<string, any>
VUE_GLOBALS.forEach((k) => {
  const v = (Vue as Record<string, any>)[k]
  if (v !== undefined && g[k] === undefined) g[k] = v
})

export {}
