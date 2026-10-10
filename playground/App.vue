<template>
  <CellSlotRepro v-if="isCellSlotRepro" />
  <DemoGrid v-else />
</template>

<script setup lang="ts">
// 原宿主仓 /wms/rjgrid 演示页整体迁入：8 个标签即能力地图，也是回归入口
// #cell-slot → 单元格插槽回归页（插槽必须按真 vnode 渲染，见 CellSlotRepro 顶部说明）
import { computed, ref } from 'vue'
import DemoGrid from './src/DemoGrid.vue'
import CellSlotRepro from './src/CellSlotRepro.vue'

const hash = ref(location.hash)
addEventListener('hashchange', () => (hash.value = location.hash))
const isCellSlotRepro = computed(() => hash.value === '#cell-slot')
</script>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
}
</style>
