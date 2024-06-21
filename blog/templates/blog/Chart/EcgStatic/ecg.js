import { maxOffset, throttle } from '@c/tools/fn'
export default class Ecg {
    constructor(canvas, container, config) {
        this.canvas = canvas
        this.container = container
        this.ctx = canvas.getContext('2d')

        this.base = 4
        this.gridColor = '#333333'
        this.gridLine = [1, 2]
        this.timeRange = 0
        this.speed = 10
        this.rate = 10
        this.lineColor = '#34DFF5'
        this.lineWidth = 1
        this.top = 1
        this.scale = 1
        this.direction = 'row'
        this.originList = {}
        this.current = {}
        this.gridTop = 0
        this.gridBottom = 0

        this.preMouseP = 0

        this.setConfig(config)

        this.setDragEvent()

        this.drawImg()
    }
    get handler() {
        return this.handler_v !== undefined ? this.handler_v : false
    }
    set handler(val) {
        this.current = {}
        this.handler_v = val
    }
    get grid() {
        return this.grid_v !== undefined ? this.grid_v : [2, 4]
    }
    set grid(val) {
        this.originList = {}
        this.grid_v = val
    }
    get distance() {
        return this.distance_v !== undefined ? this.distance_v : 0
    }
    set distance(val) {
        this.distance_v = val
        const w = this.itemWidth
        const sub = this.dataNum - w
        let max = 0
        let min = sub < 0 ? 0 : -sub
        val > max && (this.distance_v = max)
        val < min && (this.distance_v = min)
        this.setDistance && this.setDistance(this.distance_v)
    }
    get dataNum() {
        return this.base * this.speed * this.timeRange
    }
    get xOffsetPx() {
        return this.xOffset * this.base
    }
    set dataPart(val) {
        this.setDataPart && this.setDataPart(val)
    }
    get data() {
        return this.data_v !== undefined ? this.data_v : []
    }
    set data(val) {
        this.current = {}
        this.distance = 0
        this.data_v = val
    }
    setDragEvent() {
        const that = this
        that.canvas.addEventListener('mousedown', evDown => {
            that.preMouseP = evDown.clientX
            document.onmousemove = e => throttle(that.moveAction, 100)({ that, e })
            document.onmouseup = () => {
                document.onmouseup = document.onmousemove = null
            }
        })
    }
    moveAction({ that, e }) {
        const currentP = e.clientX
        that.distance += currentP - that.preMouseP
        that.preMouseP = currentP
        that.refresh()
    }
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    setSize() {
        // if (this.canvas.width === this.container.offsetWidth && this.canvas.height === this.container.offsetHeight) return
        this.clear()
        this.canvas.width = this.container.offsetWidth
        this.canvas.height = this.container.offsetHeight
        this.itemWidth = Math.floor((this.canvas.width - this.xOffsetPx) / this.grid[0])
        this.setWRange && this.setWRange(this.itemWidth)
    }
    refresh(config) {
        config && this.setConfig(config)
        this.clear()
        this.drawImg()
    }
    drawImg() {
        this.drawGrid()
        this.drawLines()
        this.drawGraduation()
    }
    drawGraduation() {
        const { grid, ctx, gridTop, gridBottom, xOffsetPx, canvas, itemWidth, base, speed } = this

        ctx.beginPath()
        ctx.strokeStyle = this.gradua.color || 'white'
        ctx.lineWidth = this.gradua.width || 1
        ctx.fillStyle = this.gradua.color || 'white'
        ctx.font = '16px Microsoft YaHei'

        const y = [gridTop, canvas.height - gridBottom]
        const arrow = [-1, 1]
        const textP = [-2, 18]
        let xOffset = -this.distance % (base * speed)
        const num = Math.ceil(-this.distance / (base * speed))
        xOffset !== 0 && (xOffset = base * speed - xOffset)
        y.forEach(i => {
            ctx.moveTo(xOffsetPx, i)
            ctx.lineTo(canvas.width, i)
        })

        let col = grid[0] - 1
        while (col >= 0) {
            let xStart = xOffsetPx + col * itemWidth
            const xEnd = xStart + itemWidth

            if (col > 0) {
                ctx.moveTo(xStart, 0)
                ctx.lineTo(xStart, canvas.height - gridBottom + 7 * base)
            }

            y.forEach((yStart, index) => {

                let x = xStart + xOffset
                let textN = num
                while (x < xEnd) {
                    if (x !== xStart || col === 0) {
                        ctx.moveTo(x, yStart)
                        ctx.lineTo(x, yStart + arrow[index] * 5 * base)
                    }
                    if (xEnd - x > 26) {
                        ctx.fillText(`${textN}s`, x + 4, yStart + textP[index])
                    }
                    textN++
                    x += base * speed
                }
            })


            col--
        }
        ctx.stroke()
    }
    drawGrid() {
        const { ctx, canvas, distance, base, gridColor, gridLine } = this
        let initSmallOffset = distance % base
        let initlargeOffset = distance % (base * 5)
        initSmallOffset < 0 && (initSmallOffset += base)
        initlargeOffset < 0 && (initlargeOffset += base * 5)

        const drawed = {
            x: {},
            y: {}
        }

        ctx.beginPath()
        let color = Array.isArray(gridColor) && gridColor[1] ? gridColor[1] : gridColor
        let lineWidth = Array.isArray(gridLine) && gridLine[1] ? gridLine[1] : gridLine
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        let start = Math.abs(initlargeOffset)
        while (start < canvas.width) {
            drawed.x[start] = 1
            ctx.moveTo(start, 0)
            ctx.lineTo(start, canvas.height)
            start += base * 5
        }

        start = 0
        while (start < canvas.height) {
            drawed.y[start] = 1
            ctx.moveTo(0, start)
            ctx.lineTo(canvas.width, start)
            start += base * 5
        }
        ctx.stroke()

        ctx.beginPath()
        color = Array.isArray(gridColor) && gridColor[0] ? gridColor[0] : gridColor
        lineWidth = Array.isArray(gridLine) && gridLine[0] ? gridLine[0] : gridLine
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        start = Math.abs(initSmallOffset)
        while (start < canvas.width) {
            const cur = start
            start += base
            if (drawed.x[cur]) continue
            ctx.moveTo(cur, 0)
            ctx.lineTo(cur, canvas.height)
        }

        start = 0
        while (start < canvas.height) {
            const cur = start
            start += base
            if (drawed.y[cur]) continue
            ctx.moveTo(0, cur)
            ctx.lineTo(canvas.width, cur)
        }
        ctx.stroke()

    }
    drawLines() {
        this.data.forEach((arr, index) => {
            this.drawLine(arr, index)
        })
    }
    drawSymbol(yStart) {
        const color = this.symbol.color || 'white'
        const width = this.symbol.width || 1
        const xOffset = (this.symbol.xOffset || 0) * this.base + this.xOffsetPx

        this.ctx.beginPath()
        this.ctx.strokeStyle = color
        this.ctx.lineWidth = width
        this.ctx.moveTo(xOffset - 10 * this.base / 2, yStart)
        this.ctx.lineTo(xOffset - 10 * this.base * 3 / 8, yStart)
        this.ctx.lineTo(xOffset - 10 * this.base * 3 / 8, yStart - this.scale * 10 * this.base * (this.rate / 10))
        this.ctx.lineTo(xOffset - 10 * this.base * 1 / 8, yStart - this.scale * 10 * this.base * (this.rate / 10))
        this.ctx.lineTo(xOffset - 10 * this.base * 1 / 8, yStart)
        this.ctx.lineTo(xOffset, yStart)
        this.ctx.stroke()
    }
    getOrigin(index) {
        const k = `${this.direction}_${index}`
        if (this.originList[k]) return this.originList[k]
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
        this.originList[k] = { x, y, top: x === 0, bottom }
        return this.originList[k]
    }
    drawLine(arr, indexL) {
        const { gridTop, gridBottom, grid, itemWidth, distance, xOffsetPx, canvas, base, ctx, lineColor, lineWidth, dataNum, scale, speed, current, handler, rate } = this
        const { x, y, top, bottom } = this.getOrigin(indexL)

        const length = this.getExtractLength(arr.length)
        let xStart = (distance > 0 ? distance : 0) + x * itemWidth + xOffsetPx
        const xEnd = xStart + itemWidth
        let start = distance < 0 ? -distance : 0
        const itemH = (canvas.height - gridTop - gridBottom) / grid[1]
        const yStart = itemH * (y + 0.5) + this.top * base + gridTop

        this.drawLabel(xStart, yStart, indexL)
        this.symbol && top && this.drawSymbol(yStart)

        const dataPart = [start]

        ctx.beginPath()
        ctx.strokeStyle = lineColor
        ctx.lineWidth = lineWidth
        let temp
        let tempIndex = Math.round(start * length)
        while (start < dataNum && xStart < xEnd) {
            const index = start
            start++
            const x = xStart
            xStart++
            const currentIndex = tempIndex
            tempIndex = Math.round(start * length)
            const key = `${speed}_${indexL}_${index}`

            if (!current[key]) {
                const val = maxOffset(arr.slice(currentIndex, start >= dataNum ? arr.length : tempIndex))
                current[key] = handler ? handler(val) : val
            }
            let yOffset = current[key]
            if (!temp) {
                ctx.moveTo(x, yStart - yOffset * base * scale * (rate / 10))
                temp = true
            } else {
                ctx.lineTo(x, yStart - yOffset * base * scale * (rate / 10))
            }
        }
        this.dataPart = dataPart.concat([start])
        ctx.stroke()
    }
    drawLabel(xStart, yStart, index) {
        const ctx = this.ctx
        ctx.beginPath()
        ctx.fillStyle = this.symbol.color || 'white'
        ctx.font = 'bolder 16px Microsoft YaHei'
        ctx.fontWeight = 900
        ctx.lineWidth = this.lineWidth
        const text = this.name?.[index] || ''
        text && ctx.fillText(text, xStart, yStart - 5 * this.base)
    }
    getExtractLength(l) {
        return l / this.dataNum
    }
    setConfig(options) {
        options && Object.keys(options).forEach(k => this[k] = options[k])
        // if (!this.inited) {
        this.setSize()
        //     this.inited = true
        // }

        options?.distance !== undefined && (this.distance = options.distance)
    }
    resize() {
        this.setSize()
        this.refresh()
    }
    changeDistance(val) {
        this.distance = val
        this.refresh()
    }
}