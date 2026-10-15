<template>
  <!-- 与其它浮层一致：根内同级 fixed 定位（Teleport 到 body 会丢失 .rj-grid 上的主题 CSS 变量，致背景透明、文字与表格叠字） -->
  <div ref="menuRef" class="rj-menu" :style="{ left: x + 'px', top: y + 'px' }" @click.stop>
    <template v-for="(item, i) in items" :key="i">
      <div v-if="item.isSeparator" class="rj-menu-divider"></div>
      <div
        v-else
        class="rj-menu-item"
        :class="{ 'is-disabled': item.disabled?.(), 'is-danger': item.danger, 'has-sub': item.children?.length }"
        @mouseenter="hoverIdx = item.children?.length ? i : -1"
        @click="onClick(item)"
      >
        <span class="rj-menu-item-label">{{ item.name }}</span>
        <span v-if="item.children?.length" class="rj-menu-sub-arrow">▸</span>
        <div v-if="item.children?.length && hoverIdx === i" class="rj-menu rj-menu-sub">
          <template v-for="sub in item.children" :key="sub.name || String(sub.isSeparator)">
            <div v-if="sub.isSeparator" class="rj-menu-divider"></div>
            <div
              v-else
              class="rj-menu-item"
              :class="{ 'is-disabled': sub.disabled?.(), 'is-danger': sub.danger }"
              @click.stop="onClick(sub)"
            >
              <span class="rj-menu-item-label">{{ sub.name }}</span>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { RjMenuItem } from './types'

defineOptions({ name: 'RjContextMenu' })

defineProps<{ items: RjMenuItem[]; x: number; y: number }>()

const emit = defineEmits<{
  (e: 'select', item: RjMenuItem): void
  /** 渲染后用真实尺寸回报，宿主据此重锚（底栏上弹时估算高与实高有差；靠右按钮需按实宽左移防被视口右边缘裁切） */
  (e: 'reposition', h: number, w: number): void
}>()

const menuRef = ref<HTMLElement>()

onMounted(() => {
  const el = menuRef.value
  if (el) emit('reposition', el.offsetHeight, el.offsetWidth)
})

const hoverIdx = ref(-1)

function onClick(item: RjMenuItem) {
  if (item.children?.length || item.isSeparator || item.disabled?.()) return
  emit('select', item)
}
</script>
