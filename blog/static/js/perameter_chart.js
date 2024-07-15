
// 引入 Chart.js 库
const script = document.createElement('script');
script.src = "https://cdn.jsdelivr.net/npm/chart.js";
script.onload = function() {
    // 函数来绘制折线图
    function drawChart(ctx, label, data) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map((_, index) => `Point ${index + 1}`),
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: false,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Measurement Points'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                }
            }
        });
    }

    // 获取 canvas 元素的上下文
    const rrIntervalCtx = document.getElementById('rrIntervalChart').getContext('2d');
    const prLenCtx = document.getElementById('prLenChart').getContext('2d');

    // 绘制两个折线图
    drawChart(rrIntervalCtx, 'RR Interval', window.perameter.rr_interval);
    drawChart(prLenCtx, 'PR Length', window.perameter.pr_len);
};
document.head.appendChild(script);