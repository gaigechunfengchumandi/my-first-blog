<template>
    <div ref="container"
         style="background-repeat: no-repeat; overflow: hidden;"
         :style="{ width, height, 'background-color': bgColor }">
        <canvas ref="canvasDom" />
    </div>
</template>
<script>
import { debounce } from '@c/tools/fn'
import { getCurrentInstance, reactive, toRefs, watch } from 'vue'
import Ecg from './ecg.js'
import { getParamsByKey, getChangeByKey } from '@c/tools/fn'
const params = [
    'base',
    'data',
    'timeRange',
    'speed',
    'rate',
    'lineColor',
    'lineWidth',
    'top',
    'scale',
    'symbol',
    'gradua',
    'xOffset',
    'direction',
    'grid',
    'handler',
    'name',
    'gridTop',
    'gridBottom',
    'graduation',
    'gridColor'
]
export default {
    props: {
        graduation: { type: Boolean, default: true },
        distance: {
            type: Number,
            default: 0,
        },
        wRange: {
            type: Number,
            default: 0,
        },
        width: {
            type: String,
            default: '100%',
        },
        height: {
            type: String,
            default: '100%',
        },
        bgColor: { type: String, default: 'black' },
        gridColor: { type: String, default: '#333333' },
        base: {
            type: Number,
            default: 4,
        },
        rate: {
            type: Number,
            default: 10,
        },
        name: { type: Array, default: () => [] },
        data: { type: Array, default: () => [] },
        handler: { type: [Boolean, Function], default: false },
        timeRange: { type: Number, default: 9 },
        direction: { type: String, default: 'row' },
        grid: { type: Array, default: () => [2, 6] },
        speed: { type: Number, default: 10 },
        lineColor: {
            type: String,
            default: '#19be6b',
        },
        lineWidth: {
            type: Number,
            default: 1,
        },
        gridTop: { type: Number, default: 20 },
        gridBottom: { type: Number, default: 60 },
        top: {
            type: Number,
            default: 5,
        },
        scale: {
            type: Number,
            default: 1,
        },
        symbol: {
            type: [Boolean, Object],
            default: () => {
                return {
                    color: 'green',
                    width: 2,
                    xOffset: 0,
                }
            },
        },
        gradua: {
            type: [Boolean, Object],
            default: () => {
                return {
                    color: 'white',
                    width: 1,
                }
            },
        },
        xOffset: {
            type: Number,
            default: 10,
        },
        dataPart: {
            type: Array,
            default() {
                return []
            },
        },
        dataNum: {
            type: Number,
            default: 0,
        },
    },
    setup(props, ctx) {
        const { proxy, appContext } = getCurrentInstance()
        const data = reactive({
            canvas: null,
            timer: null,
        })
        const methods = {
            refresh(p) {
                if (!data.canvas) return
                data.canvas.refresh(p)
            },
        }
        watch(() => props.distance, val => {
            if (!data.canvas) return
            data.canvas.changeDistance(val)
        })
        watch(params.map(i => () => props[i]),
            (val, oldVal) => {
                methods.refresh(getChangeByKey(params, val, oldVal))
            }
        )
        watch(
            [() => props.base, () => props.timeRange, () => props.speed],
            val => {
                proxy.$emit(
                    'update:dataNum',
                    val.reduce((total, i) => total * i, 1)
                )
            },
            {
                immediate: true,
            }
        )
        return {
            ...toRefs(data),
            ...methods,
        }
    },
    mounted() {
        const proxy = this
        proxy.canvas = new Ecg(proxy.$refs.canvasDom, proxy.$refs.container, {
            setWRange: val => proxy.$emit('update:wRange', val),
            setDistance: val => proxy.$emit('update:distance', val),
            setDataPart: val => proxy.$emit('update:dataPart', val),
            ...getParamsByKey(params, this)
        })
        proxy.__resizeHandler = debounce(() => {
            if (proxy.canvas) {
                proxy.canvas.resize()
            }
        }, 100)
        window.addEventListener('resize', proxy.__resizeHandler)
    },
    beforeUnmount() {
        const proxy = this
        window.removeEventListener('resize', proxy.__resizeHandler)
    },
}
</script>
