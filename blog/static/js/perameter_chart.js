
// 引入 Chart.js 库
const script = document.createElement('script');
script.src = "https://cdn.jsdelivr.net/npm/chart.js";  //动态创建并加载 Chart.js 脚本。
script.onload = function() { //这行代码是用来处理脚本加载完成后的事件。确保 Chart.js 库在加载完成后再执行绘制图表的代码
    // 定义 drawChart 函数，用于绘制折线图。
    function drawChart_ms(ctx, label, data) {
        const maxValue = Math.max(...data, 1000); // 取数据中的最大值和1100中的较大者，...data 是 JavaScript 中的扩展运算符（spread operator）。扩展运算符允许展开可迭代对象
        // 创建一个新的Chart对象
        new Chart(ctx, { //获取 canvas 元素的上下文。
            type: 'line', // 图表类型为折线图
            data: {
                labels: data.map((_, index) => `心拍 ${index + 1}`),// 生成数据点的标签，例如 "心拍 1", "心拍 2", ...
                datasets: [{
                    label: label, // 数据集的标签，将在图表的图例中显示
                    data: data, // 数据集的实际数据
                    borderColor: 'rgba(75, 192, 192, 1)',// 线条的颜色
                    backgroundColor: 'rgba(75, 192, 192, 0.2)', // 数据点的背景颜色
                    fill: false, // 不填充线条下方的区域
                    tension: 0.3 // 线条的张力（0 表示没有平滑，1 表示完全平滑）
                }]
            },
            options: {
                responsive: true,// 设置图表为响应式，以便在窗口大小变化时调整图表尺寸。
                scales: {
                    x: {
                        display: true, // 显示 x 轴
                        title: {
                            display: true, // 显示 x 轴的标题
                            text: '心拍' // x 轴的标题文本
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '毫秒' // y 轴的标题文本
                        },
                        min: 0, // 设置 y 轴的最小值
                        max: maxValue, // 动态设置 y 轴的最大值
                        rotation: 1
                    }
                }
            }
        });
    }

    function drawChart_mv(ctx, label, data) {
        new Chart(ctx, { //获取 canvas 元素的上下文。
            type: 'line', // 图表类型为折线图
            data: {
                labels: data.map((_, index) => `心拍 ${index + 1}`),// 生成数据点的标签，例如 "心拍 1", "心拍 2", ...
                datasets: [{
                    label: label, // 数据集的标签，将在图表的图例中显示
                    data: data, // 数据集的实际数据
                    borderColor: 'rgba(75, 192, 192, 1)',// 线条的颜色
                    backgroundColor: 'rgba(75, 192, 192, 0.2)', // 数据点的背景颜色
                    fill: false, // 不填充线条下方的区域
                    tension: 0.3 // 线条的张力（0 表示没有平滑，1 表示完全平滑）
                }]
            },
            options: {
                responsive: true,// 设置图表为响应式，以便在窗口大小变化时调整图表尺寸。
                scales: {
                    x: {
                        display: true, // 显示 x 轴
                        title: {
                            display: true, // 显示 x 轴的标题
                            text: '心拍' // x 轴的标题文本
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '毫伏', // y 轴的标题文本
                            rotation: 1
                        },
                        min: 0,
                        max: 2
                    }
                }
            }
        });
    }

    // 获取 canvas 元素的上下文
    const rrIntervalCtx = document.getElementById('rrIntervalChart').getContext('2d');
    const prLenCtx = document.getElementById('prLenChart').getContext('2d');
    const qtLenCtx = document.getElementById('qtLenChart').getContext('2d');
    const qrsHigCtx = document.getElementById('qrsHigChart').getContext('2d');

    // 绘制两个折线图
    drawChart_ms(rrIntervalCtx, 'RR Interval', window.perameter.rr_interval);
    drawChart_ms(prLenCtx, 'PR Length', window.perameter.pr_len);
    drawChart_ms(qtLenCtx, 'QT Length', window.perameter.qt_len);
    drawChart_mv(qrsHigCtx, 'QRS High', window.perameter.qrs_h);


};
document.head.appendChild(script);// 将 script 元素添加到文档的 <head> 部分