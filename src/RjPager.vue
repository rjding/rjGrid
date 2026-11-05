<template>
  <div class="rj-pager" :class="variant === 'top' ? 'rj-pager-top' : 'rj-pager-bottom'">
    <span class="rj-pager-opt rj-pager-total" style="color: var(--rj-text-secondary)">{{
      t('pagerTotal', { n: total })
    }}</span>
    <select
      class="rj-input rj-pager-opt rj-pager-size"
      :value="pageSize"
      @change="$emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="s in [20, 50, 100, 200, 500]" :key="s" :value="s">{{
        t('perPage', { n: s })
      }}</option>
    </select>
    <div class="rj-pager-nav">
      <button class="rj-btn" :disabled="page <= 1" @click="$emit('update:page', 1)">{{
        t('first')
      }}</button>
      <button class="rj-btn" :disabled="page <= 1" @click="$emit('update:page', page - 1)">{{
        t('prev')
      }}</button>
      <span>{{ page }} / {{ pages || 1 }}</span>
      <button class="rj-btn" :disabled="page >= pages" @click="$emit('update:page', page + 1)">{{
        t('next')
      }}</button>
      <button class="rj-btn" :disabled="page >= pages" @click="$emit('update:page', pages)">{{
        t('last')
      }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { RJ_LOCALE_KEY, defaultTranslate } from './locale'
defineOptions({ name: 'RjPager' })

const props = withDefaults(
  defineProps<{ page: number; pageSize: number; total: number; variant?: 'top' | 'bottom' }>(),
  { variant: 'bottom' }
)
defineEmits<{ (e: 'update:page', v: number): void; (e: 'update:pageSize', v: number): void }>()

const t = inject(RJ_LOCALE_KEY, defaultTranslate)
const pages = computed(() => Math.max(Math.ceil(props.total / props.pageSize), 1))
</script>
