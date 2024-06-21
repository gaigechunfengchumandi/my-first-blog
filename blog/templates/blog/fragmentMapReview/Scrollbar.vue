<template>
    <div class="pa w100 clearfix"
         ref="containerRef"
         style="bottom: 0;">
        <span v-for="i in num + 1"
              class="pa"
              :style="{ left: getLeft((i - 1) * level) + 'px' }"
              style="border-left: solid 1px white; color: white;">{{`${(i - 1) * level}s`}}</span>
        <div class="pa contorller flex-bs"
             :class="{selected}"
             :style="{ width: bWidth + 'px', left: left + 'px' }"
             ref="barRef">
            <span v-for="i in timePart">
                {{ `${i}s` }}
            </span>
        </div>
    </div>
</template>
<script>
import { getCurrentInstance, reactive, toRefs, computed, watch } from 'vue'
import { throttle } from '@c/tools/fn'
export default {
    props: {
        wRange: { type: Number, default: 0 },
        modelValue: { type: Number, default: 0 },
        dataPart: { type: Array, default: () => [0, 0] },
        dataNum: { type: Number, default: 0 },
        timeRange: { type: Number, default: 0 },
    },
    setup(props) {
        const { proxy, appContext } = getCurrentInstance()
        const data = reactive({
            preMouseP: 0,
            left: 0,
            cWidth: 0,
            value: 0,
            selected: false
        })
        const methods = {
            init() {
                data.cWidth = proxy.$refs.containerRef.clientWidth
                proxy.$refs.barRef.addEventListener('mousedown', evDown => {
                    data.preMouseP = evDown.clientX
                    data.selected = true
                    document.onmousemove = e => throttle(methods.moveAction, 100)(e)
                    document.onmouseup = () => {
                        data.selected = false
                        document.onmouseup = document.onmousemove = null
                    }
                })
            },
            getLeft(val) {
                const l = props.timeRange - computeds.timePart.value[1] + computeds.timePart.value[0]
                return Math.round((l > 0 ? val / l : 1) * computeds.maxOffset.value) - 1
            },
            setLeft(val) {
                data.left = Math.floor(-val / (props.dataNum - props.wRange) * computeds.maxOffset.value)
            },
            moveAction(e) {
                let left = Math.floor(data.left + e.clientX - data.preMouseP)
                left < 0 && (left = 0)
                left > computeds.maxOffset.value && (left = computeds.maxOffset.value)
                data.left = left
                let d = Math.floor((left / computeds.maxOffset.value) * (props.dataNum - props.wRange))
                left === 0 && (d = 0)
                left === computeds.maxOffset.value && (d = props.dataNum - props.wRange)
                data.value = -d
                proxy.$emit('update:modelValue', data.value)
                data.preMouseP = e.clientX
            }
        }
        watch(() => props.modelValue, val => {
            val !== data.value && methods.setLeft(val)
        }) 
        const computeds = {
            level: computed(() => props.timeRange > 20 ? Math.floor(props.timeRange / 20) : 1),
            num: computed(() => Math.floor(props.timeRange / computeds.level.value)),
            width: computed(() => (props.timeRange > 0 ? Math.round(computeds.level.value * 1000 / props.timeRange) / 10 : 100) * data.cWidth / 100),
            pWidth: computed(() => {
                const p = props.dataNum > 0 ? Math.round(props.wRange * 1000 / props.dataNum) / 10 : 100
                return p > 200 ? 200 : p
            }),
            maxOffset: computed(() => data.cWidth - computeds.bWidth.value),
            bWidth: computed(() => {
                const l = data.cWidth * computeds.pWidth.value / 100
                return l < 100 ? 100 : l > data.cWidth ? data.cWidth : l
            }),
            timePart: computed(() => props.dataPart.map(i => props.timeRange > 0 ? Math.round(i * 100 / props.dataNum * props.timeRange) / 100 : 0))
        }
        return {
            ...toRefs(data),
            ...methods,
            ...computeds,
        }
    },
    mounted() {
        this.init()
    },
}
</script>
<style lang="scss" scoped>
.contorller {
    user-select: none;
    height: 40px;
    bottom: 0px;
    padding: 2px 5px;
    color: white;
    background-color: rgba($color: #000000, $alpha: 0.4);
    cursor: pointer;
    box-shadow: 0px 0px 2px 2px rgba($color: #ffffff, $alpha: 0.4);
    &:hover, &.selected {
        color: rgba($color: #65d3ee, $alpha: 1);
        box-shadow: 0px 0px 2px 2px rgba($color: #65d3ee, $alpha: .6);
        transform: translate(-2px, -2px);
    }
}
</style>
