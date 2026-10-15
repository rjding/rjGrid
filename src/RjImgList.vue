<template>
  <template v-if="!failed">
    <img
      v-for="(u, ui) in urls"
      :key="ui"
      class="rj-cell-img-el"
      :class="'rj-img--' + shape"
      :style="style"
      :src="u"
      :alt="alt"
      :loading="lazy ? 'lazy' : 'eager'"
      decoding="async"
      draggable="false"
      @error="failed = true"
      @click.stop="$emit('preview', u)"
    />
  </template>
  <!-- 加载失败：回落为占位文本，避免出现浏览器破图图标 -->
  <span v-else class="rj-cell-inner rj-cell-img-fallback">{{ fallback }}</span>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

defineOptions({ name: 'RjImgList' })

const props = defineProps<{
  urls: string[]
  style: Record<string, string>
  shape: 'square' | 'rounded' | 'circle'
  lazy: boolean
  alt: string
  fallback: string
}>()

defineEmits<{ (e: 'preview', url: string): void }>()

const failed = ref(false)
// 行复用（虚拟滚动换数据）时重置失败态，否则一次失败会永久隐藏该节点的图片
watch(
  () => props.urls.join('\n'),
  () => (failed.value = false)
)
</script>
