import { createWorker, stopWorker } from '@c/tools/worker'

export default class EcgBase {
    constructor(canvas, container) {
        this.canvas = canvas
        this.container = container
        this.ctx = canvas.getContext('2d')
        this.bg = document.createElement('canvas')
        this.bgCtx = this.bg.getContext('2d')
        this.defaultColor = '#34DFF5'
        this.timer = null
        this.canvas.width = this.container.offsetWidth
        this.canvas.height = this.container.offsetHeight
        this.bg.width = this.container.offsetWidth
        this.bg.height = this.container.offsetHeight

        this.yDefault = 0
        this.yDefaultIndex = 2
        this.eraseW = 10
        this.refreshTime = 1000
        this.speed = 1
        this.color = []
        this.lineWidth = 1
        this.cell = 1
        this.index = 0
        this.drawList = []
        this.yDefaultLine = ''
        this.base = 4
        this.scale = 1
        this.padding = [0]
        this.grid = [1, 1]
        this.lineNum = 1
        this.direction = 'column'

        this.originList = {}
    }
    get padding() {
        return this.padding_v || [0]
    }
    set padding(val) {
        this.top = (val?.[0] || 0) * this.base
        if (val.length === 1) {
            this.right = this.left = this.top
        } else if (val.length === 2) {
            this.right = this.left = (val[1] || 0) * this.base
        } else if (val.length === 3) {
            this.right = (val[1] || 0) * this.base
            this.left = (val[0] || 0) * this.base
        }
        this.padding_v = val
    }
    get grid() {
        return this.grid_v || [1, 1]
    }
    set grid(val) {
        this.originList = {}
        this.grid_v = val
    }
    get direction() {
        return this.direction_v || 'column'
    }
    set direction(val) {
        this.originList = {}
        this.direction_v = val
    }
    get lineNum() {
        return this.lineNum_v || 1
    }
    set lineNum(val) {
        this.yPre = this.initPart(val)
        this.lineNum_v = val
    }
    get maxLines() {
        return this.grid[0] * this.grid[1]
    }
    get yPart() {
        return this.canvas.height / this.grid[1]
    }
    get xPart() {
        return this.canvas.width / this.grid[0]
    }
    get xReal() {
        return this.xPart - this.left - this.right
    }
    get bgConfig() {
        return this.bgConfig_v
    }
    set bgConfig(val) {
        this.setBg()
        this.bgConfig_v = val
    }
    drawEcg() {
        console.log('绘制Ecg中...')
    }
    setConfig(config) {
        console.log('参数更新', config)
    }
    setBg() {
        console.log('背景绘制')
    }
    initPart(val = this.lineNum) {
        this.yPre = new Array(val).fill(this.yDefault)
        this.xPre = new Array(val).fill(0)
        this.over = new Array(val).fill(0)
        this.data = new Array(val)
    }
    resetData() {
        this.startFlag = false
        this.initPart()
    }
    setData(index, ...args) {
        if(!this.startFlag) {
            this.startFlag = true
            this.start()
        }
        this.data[index] = this.data[index] || []
        this.data[index].push(...args)
    }
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    refresh(config) {
        this.clearCanvas()
        this.bgCtx.clearRect(0, 0, this.bg.width, this.bg.height)
        this.setConfig(config)
        this.initPart()
        this.setBg()
        this.resetData()
        this.start()
    }
    resize() {
        this.clearCanvas()
        this.bgCtx.clearRect(0, 0, this.bg.width, this.bg.height)
        this.canvas.width = this.container.offsetWidth
        this.canvas.height = this.container.offsetHeight
        this.bg.width = this.container.offsetWidth
        this.bg.height = this.container.offsetHeight
        this.initPart()
        this.setBg()
        this.start()
    }
    getOrigin(index) {
        if (this.originList[index]) return this.originList[index]
        let x
        let y
        let bottom = false
        if (this.direction === 'column') {
            x = index % this.grid[0]
            y = Math.floor(index / this.grid[0])
        } else {
            x = Math.floor(index / this.grid[1])
            y = index % this.grid[1]
        }
        bottom = (x === this.grid[0] - 1)
        this.originList[index] = { x, y, top: x === 0, bottom }
        return this.originList[index]
    }
    start() {
        this.stop()
        if(!this.startFlag) return
        this.timer = createWorker(() => {
            this.drawEcg()
        }, this.refreshTime)
    }
    stop() {
        if(this.timer) {
            stopWorker(this.timer) 
            this.timer = null
        }
    }
}