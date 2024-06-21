import EcgBase from '../class/ecgBase'
export default class Ecg extends EcgBase {
    constructor(canvas, container, config) {
        super(canvas, container)

        this.space = 10
        this.name = []

        // 配置
        this.setConfig(config)
    }
    drawEcg() {
        if (this.drawList.length > 0) {
            this.drawList.forEach(el => {
                this.drawLine(el)
            })
        }
        // let l = this.index
        // const cum = this.maxLines > this.lineNum - l ? this.lineNum - 1 : l + this.maxLines - 1
        // console.log(cum,6666)
        // while (l <= cum) {
        //     this.drawLine(l)
        //     l++
        // }
    }
    setConfig({ defaultColor, yDefault, eraseW, refreshTime, color, speed, cell, grid, direction, lineNum, index,drawList, lineWidth, padding, bg, yDefaultIndex, scale, base, name, space } = {}) {
        this.stop()
        this.resetData()

        // 动态配置
        name !== undefined && (this.name = name)
        defaultColor !== undefined && (this.defaultColor = defaultColor)
        space !== undefined && (this.space = space)
        base !== undefined && (this.base = this.base = base)
        scale !== undefined && (this.scale = scale)
        yDefaultIndex !== undefined && (this.yDefaultLine = yDefaultIndex)
        yDefault !== undefined && (this.yDefault = yDefault)
        eraseW !== undefined && (this.eraseW = eraseW)
        refreshTime !== undefined && (this.refreshTime = refreshTime)
        speed < 1 && (speed = 1)
        speed !== undefined && (this.speed = speed)
        cell < 1 && (cell = 1)
        cell !== undefined && (this.cell = cell)
        grid !== undefined && (grid = [grid[0] && grid[0] >= 1 ? grid[0] : 1, grid[1] && grid[1] >= 1 ? grid[1] : 1])
        grid !== undefined && (this.grid = grid)
        direction !== undefined && (this.direction = direction)
        lineNum < 1 && (lineNum = 1)
        lineNum !== undefined && (this.lineNum = lineNum)
        const maxIndex = this.lineNum - 1
        index !== undefined && (index = index > maxIndex ? maxIndex : index)
        this.index = this.index > maxIndex ? maxIndex : this.index || 0
        index !== undefined && (this.index = index)
        drawList !== undefined && (this.drawList = drawList)
        padding !== undefined && (this.padding = padding)
        color !== undefined && (this.color = color)
        lineWidth !== undefined && (this.lineWidth = lineWidth)

        bg && (this.bgConfig = bg)
    }
    computeY(y) {
        return (this.yDefault - y) * this.scale * this.base
    }
    // 心电图算法
    drawLine(index) {
        const ctx = this.ctx
        let target = this.speed
        const num = this.name?.length || 1
        const p = this.getPosition([this.xPre[index], 0], index)
        this.erase(p)
        const pY = p[1] - this.top
        while (target > 0) {
            let yArr = new Array(num).fill(0)
            if (this.data[index] && this.data[index].length > 0) {
                yArr = yArr.map((i, indexT) => -this.data[index][0][indexT] * this.scale)
            }
            ctx.beginPath()
            ctx.strokeStyle = this.color[index] || this.defaultColor
            ctx.lineWidth = this.lineWidth
            const lastFlag = this.xPre[index] + this.cell >= this.xReal
            const yPreCurrent = yArr.map((itemT, indexT) => {
                return this.yPre[index]?.[indexT] === undefined ? this.yDefault * this.base + this.yStartArr[index][indexT] : this.yPre[index][indexT]
            })
            const xStart = this.getPosition([this.xPre[index], 0], index)[0]
            const pStartCurrent = yArr.map((itemT, indexT) => [xStart, yPreCurrent[indexT]])

            if (lastFlag && (this.xPre[index] + target >= this.xReal)) {
                const xOffset = this.xReal - this.xPre[index]
                const yOffsetCurrent = yArr.map((itemT, indexT) => (itemT * this.base + this.yStartArr[index][indexT] - yPreCurrent[indexT]) * (this.xReal - this.xPre[index]) / this.cell)
                this.yPre[index] = yArr.map((itemT, indexT) => itemT * this.base + this.yStartArr[index][indexT] + yOffsetCurrent[indexT])
                const xP = this.getPosition([this.xReal, 0], index)
                const point = this.yPre[index].map((itemT) => [xP[0], itemT])
                this.erase([xStart, pY], xOffset)
                point.forEach((p, indexT) => {
                    ctx.moveTo(...pStartCurrent[indexT])
                    ctx.lineTo(...p)
                })
                const initP = this.getPosition([0, 0], index)
                this.erase([initP[0] - this.lineWidth / 2, pY], this.lineWidth, true)
                target -= xOffset
                this.over[index] = this.xReal - this.xPre[index]
                this.xPre[index] = 0
            } else if (this.over[index] > 0) {
                if (this.xPre[index] + target < this.cell - this.over[index]) {
                    this.xPre[index] = this.xPre[index] + target
                    const yOffsetCurrent = yArr.map((itemT, indexT) => (itemT * this.base + this.yStartArr[index][indexT] - yPreCurrent[indexT]) * this.xPre[index] / (this.cell - this.over[index]))
                    this.xPre[index] = this.xPre[index] + target
                    this.yPre[index] = yOffsetCurrent.map((itemT, indexT) => yPreCurrent[indexT] + itemT)
                    const xP = this.getPosition([this.xPre[index], 0], index)
                    const point = this.yPre[index].map((itemT) => [xP[0], itemT])
                    this.erase([xStart, pY], target)
                    point.forEach((p, indexT) => {
                        ctx.moveTo(...pStartCurrent[indexT])
                        ctx.lineTo(...p)
                    })
                    target = 0
                } else {
                    target -= this.cell - this.over[index]
                    this.xPre[index] += this.cell
                    this.yPre[index] = yArr.map((itemT, indexT) => itemT * this.base + this.yStartArr[index][indexT])
                    const xP = this.getPosition([this.xPre[index], 0], index)
                    const point = this.yPre[index].map((itemT) => [xP[0], itemT])
                    this.erase([xStart, pY], xP - xStart)
                    point.forEach((p, indexT) => {
                        ctx.moveTo(...pStartCurrent[indexT])
                        ctx.lineTo(...p)
                    })
                    this.data[index] && this.data[index].length > 0 && this.data[index].shift()
                    this.over[index] = 0
                }
            }
            else if (target < this.cell) {
                const yOffsetCurrent = yArr.map((itemT, indexT) => (this.xPre[index] + target - this.xPre[index]) * ((itemT * this.base + this.yStartArr[index][indexT]) - yPreCurrent[indexT]) / this.cell)
                this.xPre[index] = this.xPre[index] + target
                this.yPre[index] = yPreCurrent.map((itemT, indexT) => itemT + yOffsetCurrent[indexT])

                const xP = this.getPosition([this.xPre[index], 0], index)
                const point = this.yPre[index].map((itemT) => [xP[0], itemT])
                this.erase([xStart, pY], target)
                point.forEach((p, indexT) => {
                    ctx.moveTo(...pStartCurrent[indexT])
                    ctx.lineTo(...p)
                })
                target = 0
            } else {
                const xOffset = this.cell
                this.xPre[index] = this.xPre[index] + this.cell
                this.yPre[index] = yArr.map((itemT, indexT) => itemT * this.base + this.yStartArr[index][indexT])
                const xP = this.getPosition([this.xPre[index], 0], index)
                const point = this.yPre[index].map((itemT) => [xP[0], itemT])
                this.erase([xStart, pY], this.cell)
                point.forEach((p, indexT) => {
                    ctx.moveTo(...pStartCurrent[indexT])
                    ctx.lineTo(...p)
                })
                target -= xOffset
                this.xPre[index] = this.xPre[index] >= this.xReal ? 0 : this.xPre[index]
                this.data[index] && this.data[index].length > 0 && this.data[index].shift()
            }
            ctx.stroke()
        }
    }
    getPosition(val, index) {
        const initIndex = index - this.index
        const { x, y } = this.getOrigin(initIndex)
        return [Math.floor(val[0] + this.xPart * x + this.left), Math.floor(val[1] + this.yPart * y) + this.top]
    }
    erase(p, w = this.eraseW > this.speed ? this.eraseW : this.speed, flag = false) {
        this.ctx.clearRect(p[0] + (flag ? - this.lineWidth / 2 : 0), p[1] - this.lineWidth / 2, w + this.lineWidth / 2, this.yPart + this.lineWidth)
    }
    setBg() {
        this.bg.width = this.container.offsetWidth
        this.bg.height = this.container.offsetHeight
        const container = this.container
        if (this.bgConfig && this.bgConfig !== 'none') {
            const ctx = this.bgCtx
            const { bgColor, gridColor, gridSize, gridLine, mode } = this.bgConfig
            const defaultBgColor = '#808695'
            const color = '#c5c8ce'
            const lineW = 1
            const base = this.base

            ctx.beginPath()
            ctx.fillStyle = bgColor || defaultBgColor
            ctx.fillRect(0, 0, this.bg.width, this.bg.height)

            if (mode === 'part') {
                let i = 0
                while (i <= this.maxLines - 1) {
                    const { x, y } = this.getOrigin(i)
                    const symbolColor = this.color[i] || this.defaultColor
                    this.drawGrid({
                        ctx,
                        gridSize,
                        gridColor,
                        gridLine,
                        base,
                        color,
                        symbolColor,
                        lineW,
                        xPart: this.xPart,
                        xStart: this.xPart * x,
                        yPart: this.yPart,
                        yStart: this.yPart * y
                    })
                    i++
                }
            } else {
                const symbolColor = this.color[0] || this.defaultColor
                this.drawGrid({
                    ctx,
                    gridSize,
                    gridColor,
                    gridLine,
                    base,
                    color,
                    symbolColor,
                    lineW,
                    xPart: this.bg.width,
                    xStart: 0,
                    yPart: this.bg.height,
                    yStart: 0
                })
            }
            let i = 0
            this.yStartArr = {}
            while (i <= this.maxLines - 1) {
                const { x, y } = this.getOrigin(i)
                const symbolColor = this.color[i] || this.defaultColor
                this.drawSymbol({
                    index: i,
                    ctx,
                    symbolColor,
                    xPart: this.xPart,
                    xStart: this.xPart * x,
                    yPart: this.yPart,
                    yStart: this.yPart * y
                })
                i++
            }
        }
        container.style['background-image'] = `url(${this.bg.toDataURL("image/png")})`

    }
    drawSymbol({ ctx, symbolColor, xStart, yStart, yPart, index }) {
        const { name, top, left, space, base, scale } = this
        const num = name?.length || 1
        const p = []
        p[0] = xStart + left
        p[1] = yStart + top
        ctx.beginPath()
        ctx.strokeStyle = symbolColor
        ctx.fillStyle = symbolColor
        ctx.lineWidth = this.lineWidth
        ctx.font = '16px Microsoft YaHei'
        this.yStartArr = this.yStartArr || {}
        if (num > 1) {
            this.yStartArr[index] = this.yStartArr[index] || []
            for (let i = 0; i < num; i++) {
                const y = p[1] + (scale + space) * base * i
                this.yStartArr[index].push(y)
                ctx.moveTo(p[0], y)
                ctx.lineTo(p[0] - 5 / 4 * base, y)
                ctx.lineTo(p[0] - 5 / 4 * base, y - base * scale)
                ctx.lineTo(p[0] - 5 / 4 * 3 * base, y - base * scale)
                ctx.lineTo(p[0] - 5 / 4 * 3 * base, y)
                ctx.lineTo(p[0] - 5 * base, y)
                if (name && name.length > 0) {
                    const text = name[i] || ''
                    ctx.fillText(text, p[0] - 5 * base, y + 16)
                }
            }
        } else {
            this.yStartArr[index] = this.yStartArr[index] || []
            const y = p[1] + (yPart - top) / 2
            ctx.moveTo(p[0], y)
            ctx.lineTo(p[0] - 5 / 4 * base, y)
            ctx.lineTo(p[0] - 5 / 4 * base, y - base * scale)
            ctx.lineTo(p[0] - 5 / 4 * 3 * base, y - base * scale)
            ctx.lineTo(p[0] - 5 / 4 * 3 * base, y)
            ctx.lineTo(p[0] - 5 * base, y)
            if (name && name.length > 0) {
                const text = name?.[0] || ''
                ctx.fillText(text, p[0] - 5 * base, y + 16)
            }
            this.yStartArr[index].push(y)
        }
        ctx.stroke()
    }
    drawGrid({ ctx, gridSize, gridColor, gridLine, base, color, lineW, xStart, yStart, xPart, yPart }) {
        let num = {}
        let complete = {}
        gridSize[0].forEach((i, index) => {
            index === 0 ? num[index] = i : num[index] = i * num[index - 1]
        })
        for (let i = gridSize[0].length - 1; i >= 0; i--) {
            ctx.beginPath()
            ctx.strokeStyle = gridColor[i] || color
            ctx.lineWidth = gridLine[0][i] || lineW

            let cum = xStart + base * num[i]

            while (cum < xStart + xPart) {
                if (!complete[cum]) {
                    ctx.moveTo(cum, yStart)
                    ctx.lineTo(cum, yStart + yPart)
                    complete[cum] = 1
                }
                cum += base * num[i]
            }
            ctx.stroke()
        }

        num = {}
        complete = {}
        gridSize[1].forEach((i, index) => {
            index === 0 ? num[index] = i : num[index] = i * num[index - 1]
        })
        for (let i = gridSize[1].length - 1; i >= 0; i--) {
            ctx.beginPath()
            ctx.strokeStyle = gridColor[i] || color
            ctx.lineWidth = gridLine[1][i] || lineW

            let cum = yStart + base * num[i]

            while (cum < yStart + yPart) {
                if (!complete[cum]) {
                    ctx.moveTo(xStart, cum)
                    ctx.lineTo(xStart + xPart, cum)
                    complete[cum] = 1
                }
                cum += base * num[i]
            }
            ctx.stroke()
        }
    }
}
