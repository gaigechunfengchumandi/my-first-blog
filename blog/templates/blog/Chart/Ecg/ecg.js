import EcgBase from '../class/ecgBase'
export default class Ecg extends EcgBase {
    constructor(canvas, container, config) {
        super(canvas, container)

        this.xPosition = 0

        // 配置
        this.setConfig(config)
    }
    get xPart() {
        return this.divide ? this.canvas.width / this.grid[0] : (this.canvas.width - this.left - this.right) / this.grid[0]
    }
    get xReal() {
        return this.divide ? this.xPart - this.left - this.right : (this.canvas.width - this.left - this.right) / this.grid[0]
    }
    drawEcg() {
        let l = this.index
        this.eraseLines(this.xPosition)
        const cum = this.maxLines > this.lineNum - this.index ? this.lineNum - 1 : this.index + this.maxLines - 1
        while (l <= cum) {
            this.drawLine(l)
            l++
        }
        this.xPosition += this.speed
        this.xPosition = this.xPosition % this.xReal
    }
    setConfig({ divide, defaultColor, yDefault, eraseW, refreshTime, color, speed, cell, grid, direction, lineNum, index, lineWidth, padding, bg, yDefaultIndex, scale, base, name } = {}) {
        this.stop()
        this.resetData()
        // 动态配置
        if (name && name.length > 0 && name !== 'none') {
            this.name = name
        }
        divide !== undefined && (this.divide = divide)
        defaultColor !== undefined && (this.defaultColor = defaultColor)
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
        padding !== undefined && (this.padding = padding)
        color !== undefined && (this.color = color)
        lineWidth !== undefined && (this.lineWidth = lineWidth)

        bg !== undefined && (this.bgConfig = bg)
    }
    computeY(y) {
        let yIndex = isNaN(y) ? 0 : y;
        return (this.yPart / this.base / 2 - (yIndex - this.yDefault) * this.scale) * this.base
    }
    // 心电图算法
    drawLine(index) {
        // 获取绘图上下文
        const ctx = this.ctx;
        // 定义目标x位置，即本次绘制应该到达的x坐标
        let target = this.speed;
        // 定义起始x位置，即上次绘制结束的x坐标
        let start = this.xPosition;

        // 当目标位置大于0时，继续绘制
        while (target > 0) {
            // 默认的y坐标，如果没有数据则使用默认值
            let y = this.yDefault;
            // 开始一个新的路径
            ctx.beginPath();
            // 设置默认的线条颜色和宽度
            ctx.strokeStyle = 'grey';
            ctx.lineWidth = this.lineWidth;
            // 如果有数据，则使用数据中的颜色和值
            if (this.data[index] && this.data[index].length > 0) {
                y = this.data[index][0].value || this.data[index][0];
                ctx.strokeStyle = this.data[index][0]?.color || this.color[index] || this.defaultColor;
            }
            // 判断是否到达了画布的最右侧
            const lastFlag = this.xPre[index] + this.cell >= this.xReal;
            // 计算上一个点的位置
            const pStart = this.getPosition([this.xPre[index], this.computeY(this.yPre[index])], index);
            // 如果已经到达或超过画布最右侧，进行特殊处理
            if (lastFlag && (start + target >= this.xReal)) {
                // 计算剩余距离和y方向上的偏移
                const xOffset = this.xReal - start;
                const yOffset = (y - this.yPre[index]) * (this.xReal - this.xPre[index]) / this.cell;
                // 更新预存的y坐标
                this.yPre[index] += yOffset;
                // 计算终点位置
                const p = this.getPosition([this.xReal, this.computeY(this.yPre[index])], index);
                // 绘制从上一个点到当前点的线段
                ctx.moveTo(pStart[0], pStart[1]);
                ctx.lineTo(...p);
                // 更新相关变量，为下一次绘制做准备
                target -= xOffset;
                this.over[index] = this.xReal - this.xPre[index];
                start = 0;
                this.xPre[index] = 0;
                // 如果不分割线且未到达底部，则绘制白色线条作为强调
                if (!this.divide && !bottom) {
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 1;
                    ctx.moveTo(p[0] - 1, p[1] - 5 * this.base * this.scale / 10);
                    ctx.lineTo(p[0] - 1, p[1] + 5 * this.base * this.scale / 10);
                }
            } else if (this.over[index] > 0) {
                // 如果有过度绘制的线段
                if (start + target < this.cell - this.over[index]) {
                    // 如果目标位置仍然在当前单元格内
                    start = start + target;
                    const yOffset = (y - this.yPre[index]) * start / (this.cell - this.over[index]);
                    start = start + target;
                    const p = this.getPosition([start, this.computeY(this.yPre[index] + yOffset)], index);
                    ctx.moveTo(pStart[0], pStart[1]);
                    ctx.lineTo(...p);
                    target = 0;
                } else {
                    // 否则，更新位置并移除第一个数据点
                    target -= this.cell - this.over[index];
                    this.xPre[index] = start = this.cell;
                    this.yPre[index] = y;
                    const p = this.getPosition([start, this.computeY(this.yPre[index])], index);
                    ctx.moveTo(pStart[0], pStart[1]);
                    ctx.lineTo(...p);
                    this.data[index] && this.data[index].length > 0 && this.data[index].shift();
                    this.over[index] = 0;
                }
            } else if (start + target < this.xPre[index] + this.cell) {
                // 如果起始位置加上目标位置仍然在当前单元格内
                const yOffset = (start + target - this.xPre[index]) * (y - this.yPre[index]) / this.cell;
                start = start + target;
                const p = this.getPosition([start, this.computeY(this.yPre[index] + yOffset)], index);
                ctx.moveTo(pStart[0], pStart[1]);
                ctx.lineTo(...p);
                target = 0;
            } else {
                // 否则，更新位置并准备下一个单元格的绘制
                const xOffset = this.xPre[index] + this.cell - start;
                start = this.xPre[index] + this.cell;
                this.yPre[index] = y;
                const p = this.getPosition([start, this.computeY(this.yPre[index])], index);
                ctx.moveTo(pStart[0], pStart[1]);
                ctx.lineTo(...p);
                target -= xOffset;
                this.xPre[index] = start >= this.xReal ? 0 : this.xPre[index] + this.cell;
                start = start >= this.xReal ? 0 : start;
                this.data[index] && this.data[index].length > 0 && this.data[index].shift();
            }
            // 绘制当前路径
            ctx.stroke();
        }
    }
    getPosition(val, index) {
        const initIndex = index - this.index
        const { x, y } = this.getOrigin(initIndex)
        return [val[0] + this.xReal * x + this.left, val[1] + this.yPart * y + this.top]
    }

    eraseLines(p, w = this.eraseW + this.speed) {
        const x = p + this.left
        this.ctx.clearRect(x, 0, w, this.canvas.height)
        if (p + w > this.xReal) {
            const over = p + w - this.xReal
            this.ctx.clearRect(this.left - this.lineWidth / 2, 0, over - this.lineWidth / 2, this.canvas.height)
        }
        let cal = this.grid[0] - 1
        while (cal > 0) {
            this.ctx.clearRect(x + this.xReal * cal, 0, w, this.canvas.height)
            cal--
        }
    }
    setBg() {
        try {
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
                        const { x, y, top } = this.getOrigin(i)
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
                while (i <= this.maxLines - 1) {
                    const { x, y, top } = this.getOrigin(i)
                    const symbolColor = this.color[i] || this.defaultColor
                    let text
                    if (this.name) {
                        if (typeof (this.name) === 'string') {
                            text = this.name
                        } else {
                            text = this.name[i]
                        }
                    }

                    this.drawSymbol({
                        text,
                        ctx,
                        symbolColor,
                        symbol: this.divide || top,
                        xPart: this.xPart,
                        xStart: this.xPart * x + this.left,
                        yPart: this.yPart,
                        yStart: this.yPart * y
                    })
                    i++
                }
            }
            container.style['background-image'] = `url(${this.bg.toDataURL("image/png")})`
        } catch (err) { console.error(err) }
    }
    drawSymbol({ ctx, symbolColor, xStart, yStart, yPart, text, symbol }) {
        ctx.beginPath()
        ctx.strokeStyle = symbolColor
        ctx.fillStyle = symbolColor
        ctx.lineWidth = this.lineWidth
        ctx.font = '16px Microsoft YaHei'
        let p = []
        p[0] = xStart
        p[1] = yStart + yPart / 2 + this.top
        if (symbol) {
            ctx.moveTo(...p)
            ctx.lineTo(p[0] - 5 / 4 * this.base, p[1])
            ctx.lineTo(p[0] - 5 / 4 * this.base, p[1] - this.base * this.scale)
            ctx.lineTo(p[0] - 5 / 4 * 3 * this.base, p[1] - this.base * this.scale)
            ctx.lineTo(p[0] - 5 / 4 * 3 * this.base, p[1])
            ctx.lineTo(p[0] - 5 * this.base, p[1])
        }
        ctx.stroke()

        if (text) {
            if (this.divide) {
                ctx.fillText(text, p[0] - 5 * this.base, p[1] + 16)
            } else {
                ctx.fillText(text, p[0], p[1] - 5 * this.base)
            }
        }
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