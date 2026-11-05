// 动态插槽透传渲染：按名调用父级网格插槽（cell-xxx / header-xxx 等）
import { defineComponent, h, type PropType, type Slots } from 'vue'

export default defineComponent({
  name: 'RjSlotRender',
  props: {
    slots: { type: Object as PropType<Slots>, required: true },
    name: { type: String, required: true },
    params: { type: [Object, Function] as PropType<any>, default: undefined }
  },
  setup(props) {
    return () => {
      const fn = props.slots[props.name]
      return fn ? fn(typeof props.params === 'function' ? props.params() : props.params) : null
    }
  }
})

// 函数式 cellRenderer 渲染器
export const RjFnRender = defineComponent({
  name: 'RjFnRender',
  props: {
    render: { type: Function as PropType<(p: any) => any>, default: undefined },
    params: { type: Object as PropType<any>, required: true }
  },
  setup(props) {
    return () => {
      if (!props.render) return null
      const out = props.render(props.params)
      if (out == null) return null
      return Array.isArray(out) ? h('span', null, out) : out
    }
  }
})
