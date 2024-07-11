// #region listener
document.addEventListener('DOMContentLoaded', function() {
  console.log("External JS file loaded");
  if (typeof window.beatArray !== 'undefined') {
      console.log('window.beatArray', 'from external script');  // Now you can use the beatArray in your JavaScript
  } else {
      console.log("beatArray is undefined in external script");
  }
});
// #endregion

// #region global variables
var c_canvas = document.getElementById("Denoise_contrast");//定义降噪画布
var s_canvas = document.getElementById("segment");//定义分割画布
var c_canvas_width = 1326;//定义降噪画布宽度
var c_canvas_hight = 2400;//定义降噪画布高度
var range = 0; //定义初始时间
// #endregion


// #region call by draw()
/* 绘制网格总函数
 * 分别绘制
 * drawSmallGrid小网格
 * drawMediumGrid中网格
 * drawBigGrid大网格
 */
function drawGrid(canvas) {
    drawSmallGrid(canvas);
    drawMediumGrid(canvas);
    drawBigGrid(canvas);
    return;
  }

// #region call by drawGrid()
/**绘制小网格
 * 第一个for语句循环出纵向小方格细线条，间距为X轴方向3像素
 * 第二个for语句循环出横向小方格细线条，间距为Y轴方向3像素
 */
function drawSmallGrid(canvas) {
    ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#f1dedf";
    ctx.strokeWidth = 1;
    ctx.beginPath();
    for (var x = 0.5; x < c_canvas_width; x += 3) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, c_canvas_hight);
      ctx.stroke();
    }
    for (var y = 0.5; y < c_canvas_hight; y += 3) {
      ctx.moveTo(0, y);
      ctx.lineTo(c_canvas_width, y);
      ctx.stroke();
    }
    ctx.closePath();
    return;
  }
/**绘制中型网格
 * 第一个for语句循环出纵向中方格中线条，间距为X轴方向15像素，小网格的5倍
 * 第二个for语句循环出横向中方格中线条，间距为Y轴方向15像素，小网格的5倍
 */
function drawMediumGrid(canvas){
    ctx = canvas.getContext("2d");
    ctx.strokeStyle="#fdbeb9";
    ctx.strokeWidth = 2
    //宽度是小网格的2倍
    ctx.beginPath();
    for(var x=0.5;x<c_canvas_width;x+=15){//初始化 x 为 0.5，这是每条垂直线的起始位置。使用 0.5 是为了确保线条能在像素之间居中，避免模糊。
        ctx.moveTo(x,0);	//	moveTo 方法将画笔移动到坐标 (x, 0)，这是垂直线的起点，即Canvas的顶部。
        ctx.lineTo(x,c_canvas_hight); //lineTo 方法从当前画笔位置绘制一条直线到坐标 (x, canvas_hight)，这是垂直线的终点，即Canvas的底部。
        ctx.stroke();
    }
    for(var y=0.5;y<c_canvas_hight;y+=15){
        ctx.moveTo(0,y); //	moveTo 方法将画笔移动到坐标 (x, 0)，这是垂直线的起点，即Canvas的左侧顶点。
        ctx.lineTo(c_canvas_width,y); //lineTo 方法从当前画笔位置绘制一条直线到坐标 (x, 500)，这是水平直线的终点，即Canvas的右侧顶点。
        ctx.stroke();
    }
    ctx.closePath();
    return;
}
/**绘制大型网格
 * 第一个for语句循环出纵向大方格中线条，间距为X轴方向75像素，小网格的5倍
 * 第二个for语句循环出横向大方格中线条，间距为Y轴方向75像素，小网格的5倍
 */
function drawBigGrid(canvas) {
    ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#e0514b";
    ctx.strokeWidth = 3;
    ctx.beginPath();
    for (var x = 0.5; x < c_canvas_width; x += 75) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, c_canvas_hight);
      ctx.stroke();
    }
    for (var y = 0.5; y < c_canvas_hight; y += 75) {
      ctx.moveTo(0, y);
      ctx.lineTo(c_canvas_width, y);
      ctx.stroke();
    }
    ctx.closePath();
    return;
}
// #endregion

/**绘制心电图线 */
function drawLine_12(canvas,beatArray, beatArrayDenoise) {// 定义一个名为 drawLine 的函数，接受一个参数 c_canvas，代表 HTML 中的 <canvas> 元素。
  hb = canvas.getContext("2d");//使用 getContext("2d") 方法获取绘图上下文，该上下文用于在画布上绘制图形。这里，hb 是一个用于绘制二维图形的 CanvasRenderingContext2D 对象。
  hb.strokeStyle = "#000000";//设置绘制线条的颜色为绿色（十六进制颜色代码为 #0f0）。
  hb.lineWidth = 1;//设置绘制线条的宽度为2个像素。
  
  hb.font = "16px Arial"; // 设置字体样式和大小为20px
  hb.fillStyle = "#000000"; // 设置文本颜色为黑色
  // 12个标准心电导联的名称
  const leadNames = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
  const leadNamesDenoise = ["I'", "II'", "III'", "aVR'", "aVL'", "aVF'", "V1'", "V2'", "V3'", "V4'", "V5'", "V6'"];
  const lineHeight = 200; // 每行的高度
  const startX = 50; // 起始X坐标

  // 绘制每一行心电图
  beatArray.forEach((beatLine, lineIndex) => {
    let startY = 50 + lineIndex * lineHeight; // 计算每一行的起始Y坐标
    // 绘制心电导联名称
    hb.fillText(leadNames[lineIndex], startX - 40, startY - 30);
    
    // 绘制原始心电图
    hb.beginPath();//开始一个新的路径。在调用 beginPath 之后绘制的图形会构成一条路径。
    beatLine.forEach((value, index) => {//beatLine 是一个包含心电图数据的数组，每个元素 value 表示该数组中的一个数据点。
      //forEach 是 JavaScript 数组的一个方法，用于遍历数组中的每个元素。
      //它接收一个回调函数，该回调函数有两个参数：当前元素 value 和当前元素的索引 index。该回调函数在数组的每个元素上执行一次。
      hb.lineTo(index + startX + range * -30, startY + (value / 0.1575) * 5); // hb.lineTo(x, y) 是 Canvas 2D API 中的一个方法，用于创建从当前绘图位置到指定位置 (x, y) 的一条直线。
      //它不会立即绘制这条线，而是将其添加到当前路径中，等待 hb.stroke() 方法来实际绘制。index + startX：这是线条终点的 x 坐标。index 是当前元素的索引，它表示该数据点在数组中的位置。startX 是绘图起始的 X 坐标，用来向右平移整个绘图位置。
      //startY + (value / 0.1575) * 5：这是线条终点的 y 坐标。
      // 	value 是当前数据点的值，通常是一个心电信号的电压值。
      // 	/ 0.1575 是一个缩放因子，用于将电压值转换为像素值。这个因子的具体值取决于心电图数据的单位和图形的比例。
      // 	* 5 是另一个缩放因子，用于进一步调整绘图的大小，使得图形在画布上看起来合适。
    });
    hb.stroke();//通过描绘路径来渲染线条。使用当前的描边样式（即绿色和 2 像素宽度）绘制出路径。
    hb.closePath();//关闭路径。这个方法会创建从当前点到起点的路径线段。

    // 绘制去噪心电图
    let denoiseStartY = startY + 80; // 去噪心电图起始Y坐标
    hb.strokeStyle = "#000000"; 
    // 绘制心电导联名称
    hb.fillText(leadNamesDenoise[lineIndex], startX - 40, denoiseStartY - 30);
    hb.beginPath(); // 开始一个新的路径
    beatArrayDenoise[lineIndex].forEach((value, index) => {
      hb.lineTo(index + startX + range * -30, denoiseStartY + (value / 0.1575) * 5); // 绘制线条到指定点
    });
    hb.stroke(); // 通过描绘路径来渲染线条
    hb.closePath(); // 关闭路径
    hb.strokeStyle = "#000000"; // 恢复原始颜色
  });
}

// #endregion


// #region call by 心电图显示时间段
//清除画布
function hide() {
    // 获取画布元素
    var ctx = c_canvas.getContext("2d");
    // 清除画布内容
    ctx.clearRect(0, 0, c_canvas_width, c_canvas_hight);
}
function draw() {
    drawGrid(c_canvas);//绘制降噪网格
    drawGrid(s_canvas);//绘制分割网格
    
    drawLine_12(c_canvas,beatArray,beatArrayDenoise);

    return;
}

// #endregion


draw() 

console.log("分割结果",beatArraySeg);
//range改变心电图显示时间段
$(function() { //这是一个 jQuery 语法，用于在文档加载完毕后执行其中的代码。也就是 $(document).ready() 的简写形式。
    $("#timeRange").on("change", function() {
      range = document.getElementById("timeRange").value;
      document.getElementById("time").innerHTML = range;
      hide();

      draw();// 重绘心电图
    });
  });





