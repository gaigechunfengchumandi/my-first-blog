<template>
    <div ref="container"
         style="background-repeat: no-repeat;"
         :style="{ width, height, 'background-color': bgColor }">
        <canvas ref="canvasDom" />
    </div>
</template>
<script>
import { getCurrentInstance, reactive, toRefs, watch } from 'vue'
import { debounce,getParamsByKey, getChangeByKey } from '@c/tools/fn'
import Ecg from './ecg.js'
const params = [
    'defaultColor',
    'space',
    'name',
    'scale',
    'base',
    'yDefault',
    'eraseW',
    'refreshTime',
    'color',
    'speed',
    'cell',
    'grid',
    'direction',
    'lineNum',
    'index',
    'drawList',
    'lineWidth',
    'padding',
    'bg',
]
export default {
    props: {
        width: {
            type: String,
            default: '100%',
        },
        height: {
            type: String,
            default: '400px',
        },
        bgColor: { type: String, default: 'black' },
        ySide: {
            type: Array,
            default: () => [10, -5],
        },
        defaultColor: { type: String, default: 'green' },
        scale: { type: Number, default: 0.5 },
        base: { type: Number, default: 4 },//最小格子5个像素（一个格子25像素）
        mock: { type: Boolean, default: false }, // 模拟开关
        yDefault: { type: Number, default: 0 },
        speed: { type: Number, default: 4 }, // 每次刷新时间间隔所走的像素
        cell: { type: Number, default: 1 }, // 两点之间的间隔像素
        refreshTime: { type: Number, default: 100 }, // 刷新时间
        eraseW: { type: Number, default: 1 }, // 擦子宽度
        color: { type: Array, default: () => ['red', 'yellow', 'orange'] }, // 颜色
        grid: {
            type: Array,
            default: () => [4, 3], // 分隔, 最小为[1, 1]
        },
        direction: { type: String, default: 'row' }, // column,row横纵序
        lineNum: { type: Number, default: 9 }, // 数据队列数量, 最小为1，超出边界被边界覆盖
        index: { type: Number, default: 0 }, // 从第几条队列开始展示 [0, lineNum - 1]
        lineWidth: { type: Number, default: 3 },
        drawList: { type: Array, default: ()=>[] },
        padding: { type: Array, default: () => [0, 50] },//间距
        bg: {
            type: [Object, String],
            default: () => {
                return {
                    bgColor: 'black',
                    gridColor: ['#333', '#333'],
                    gridSize: [
                        [1, 5], // 横向方格数，小于等于1不产生方格
                        [1, 5], // 纵向方格数，小于等于1不产生方格
                    ],
                    mode: 'part', // part,total
                    gridLine: [
                        [1, 2], // 横向方格线宽度
                        [1, 2], // 纵向方格线宽度
                    ], // [x, y] 基本格子，横向x*cell, 纵向y/% * 取值范围 ySide
                }
            },
        }, // bg为null时不控制背景
        name: {
            type: Array,
            default: () => [''],
        },
        space: { type: Number, default: 10 },
    },
    setup(props, ctx) {
        const { proxy, appContext } = getCurrentInstance()
        const data = reactive({
            canvas: null,
            timer: null,
        })
        const methods = {
            setData(...args) {
                this.canvas?.setData(...args)
            },
            refresh(p) {
                if (!data.canvas) return
                data.canvas.refresh(p)
            },
            setMock() {
                if (!data.canvas || !props.mock) return
                if (data.timer) {
                    clearInterval(data.timer)
                    data.timer = null
                }
                data.timer = setInterval(() => {
                    const index = Math.floor(Math.random() * props.lineNum)
                    const param = [(props.ySide[0] + Math.random() * (props.ySide[1] - props.ySide[0])) / props.scale, (props.ySide[0] + Math.random() * (props.ySide[1] - props.ySide[0])) / props.scale]
                    data.canvas.setData(index, param)
                }, (props.cell / props.speed) * props.refreshTime)
            },
        }
        watch(params.map(i => () => props[i]),
            (val, oldVal) => {
                methods.refresh(getChangeByKey(params, val, oldVal))
            }
        )
        watch([() => props.mock, () => props.lineNum, () => props.ySide], val => {
            if (!val[0]) {
                if (data.timer) {
                    clearInterval(data.timer)
                    data.timer = null
                }
            } else {
                methods.setMock()
            }
        })
        return {
            ...toRefs(data),
            ...methods,
        }
    },
    mounted() {
        this.canvas = new Ecg(this.$refs.canvasDom, this.$refs.container, getParamsByKey(params, this))
        this.setMock()
        this.__resizeHandler = debounce(() => {
            if (this.canvas) {
                this.canvas.resize()
            }
        }, (this.cell / this.speed) * this.refreshTime)
        window.addEventListener('resize', this.__resizeHandler)


    },
    beforeUnmount() {
        window.removeEventListener('resize', this.__resizeHandler)
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = null
        }
        this.canvas?.stop()
        this.canvas = null
    },
}
</script>
