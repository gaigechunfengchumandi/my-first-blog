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
var s_canvas_width = 1326;//定义降噪画布宽度
var s_canvas_hight = 1400;//定义降噪画布高度
var range = 0; //定义初始时间
// #endregion


// #region 绘制网格 & 绘制心电图信号 call by draw()
/* 绘制网格总函数
 * 分别绘制
 * drawSmallGrid小网格
 * drawMediumGrid中网格
 * drawBigGrid大网格
 */
function drawGrid(canvas,canvas_width,canvas_hight) {
    drawSmallGrid(canvas,canvas_width,canvas_hight);
    drawMediumGrid(canvas,canvas_width,canvas_hight);
    drawBigGrid(canvas,canvas_width,canvas_hight);
    return;
  }

// #region 绘制大中小型网格 call by drawGrid()
/**绘制小网格
 * 第一个for语句循环出纵向小方格细线条，间距为X轴方向3像素
 * 第二个for语句循环出横向小方格细线条，间距为Y轴方向3像素
 */
function drawSmallGrid(canvas,canvas_width,canvas_hight) {
    ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#f1dedf";
    ctx.strokeWidth = 1;
    ctx.beginPath();
    for (var x = 0.5; x < canvas_width; x += 3) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas_hight);
      ctx.stroke();
    }
    for (var y = 0.5; y < canvas_hight; y += 3) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas_width, y);
      ctx.stroke();
    }
    ctx.closePath();
    return;
  }
/**绘制中型网格
 * 第一个for语句循环出纵向中方格中线条，间距为X轴方向15像素，小网格的5倍
 * 第二个for语句循环出横向中方格中线条，间距为Y轴方向15像素，小网格的5倍
 */
function drawMediumGrid(canvas,canvas_width,canvas_hight){
    ctx = canvas.getContext("2d");
    ctx.strokeStyle="#fdbeb9";
    ctx.strokeWidth = 2
    //宽度是小网格的2倍
    ctx.beginPath();
    for(var x=0.5;x<canvas_width;x+=15){//初始化 x 为 0.5，这是每条垂直线的起始位置。使用 0.5 是为了确保线条能在像素之间居中，避免模糊。
        ctx.moveTo(x,0);	//	moveTo 方法将画笔移动到坐标 (x, 0)，这是垂直线的起点，即Canvas的顶部。
        ctx.lineTo(x,canvas_hight); //lineTo 方法从当前画笔位置绘制一条直线到坐标 (x, canvas_hight)，这是垂直线的终点，即Canvas的底部。
        ctx.stroke();
    }
    for(var y=0.5;y<canvas_hight;y+=15){
        ctx.moveTo(0,y); //	moveTo 方法将画笔移动到坐标 (x, 0)，这是垂直线的起点，即Canvas的左侧顶点。
        ctx.lineTo(canvas_width,y); //lineTo 方法从当前画笔位置绘制一条直线到坐标 (x, 500)，这是水平直线的终点，即Canvas的右侧顶点。
        ctx.stroke();
    }
    ctx.closePath();
    return;
}
/**绘制大型网格
 * 第一个for语句循环出纵向大方格中线条，间距为X轴方向75像素，小网格的5倍
 * 第二个for语句循环出横向大方格中线条，间距为Y轴方向75像素，小网格的5倍
 */
function drawBigGrid(canvas,canvas_width,canvas_hight) {
    ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#e0514b";
    ctx.strokeWidth = 3;
    ctx.beginPath();
    for (var x = 0.5; x < canvas_width; x += 75) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas_hight);
      ctx.stroke();
    }
    for (var y = 0.5; y < canvas_hight; y += 75) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas_width, y);
      ctx.stroke();
    }
    ctx.closePath();
    return;
}
// #endregion

// #region 绘制心电图线
//绘制降噪心电图线
function drawLine_denoise(canvas,beatArray, beatArrayDenoise) {// 定义一个名为 drawLine 的函数，接受一个参数 c_canvas，代表 HTML 中的 <canvas> 元素。
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

  // 遍历心电图的各个导联，每一个循环画两条，一条是降噪前的，一条是降噪后的
  beatArray.forEach((leadLine, lineIndex) => {
    let startY = 80 + lineIndex * lineHeight; // 计算降噪前的起始Y坐标
    hb.strokeStyle = "#000000"; // 设置文本颜色为黑色
    hb.fillText(leadNames[lineIndex], startX - 40, startY - 30);// 绘制降噪前的导联名称
    // 绘制降噪前的心电图
    hb.beginPath();
    leadLine.forEach((value, index) => {//leadLine 一个导联的数组，每个元素 value 表示该数组中的一个数据点。
      //它接收一个回调函数，该回调函数有两个参数：当前元素 value 和当前元素的索引 index。该回调函数在数组的每个元素上执行一次。
      hb.lineTo(index + startX + range * -30, startY + (value / 0.1575) * 5); 
    });
    hb.stroke();//通过描绘路径来渲染线条。使用当前的描边样式（即绿色和 1 像素宽度）绘制出路径。
    hb.closePath();//关闭路径。这个方法会创建从当前点到起点的路径线段。

    // 绘制降噪后的心电图
    let denoiseStartY = startY + 80; // 去噪心电图起始Y坐标
    hb.strokeStyle = "#006400";  // 深绿色
    // 绘制降噪后导联名称
    hb.fillText(leadNamesDenoise[lineIndex], startX - 40, denoiseStartY - 30);
    hb.beginPath(); // 开始一个新的路径
    beatArrayDenoise[lineIndex].forEach((value, index) => {
      hb.lineTo(index + startX + range * -30, denoiseStartY + (value / 0.1575) * 5); // 绘制线条到指定点
    });
    hb.stroke(); // 通过描绘路径来渲染线条
    hb.closePath(); // 关闭路径
  });
}

//现有心电图线beatArrayDenoise，以及分割数结果beatArraySeg，形状一致，后者的每一个元素是0123，代表4个类别，在beatArrayDenoise基础上，用不同的颜色把分割结果的类表示出来
function drawLine_seg(canvas, beatArrayDenoise, beatArraySeg) {
  const hb = canvas.getContext("2d");
  const colors = ["#000000", "#00CED1", "#8A2BE2", "#FF8C00"]; // 黑色, 深青色, 蓝紫色, 暗橙色 (背景，p，qrs，t)
  hb.lineWidth = 1.5;
  hb.font = "16px Arial"; // 设置字体样式和大小为16px
  hb.fillStyle = "#000000"; // 设置文本颜色为黑色
  // 12个标准心电导联的名称
  const leadNamesDenoise = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
  const lineHeight = 100; // 每行的高度
  const startX = 50; // 起始X坐标

  // 绘制每一导联心电图
  beatArrayDenoise.forEach((beatLine, lineIndex) => {
    let startY = 80 + lineIndex * lineHeight;
    // 绘制心电导联名称
    hb.fillText(leadNamesDenoise[lineIndex], startX - 40, startY - 30);
    // 绘制心电图
    hb.beginPath();
    beatLine.forEach((value, index) => {//beatLine 是当前导联的心电图数据，我们用 forEach 方法遍历每个数据点 value，并通过 index 获取当前数据点的索引。
      const segment = beatArraySeg[lineIndex][index]; // beatArraySeg 是一个二维数组，与 beatArrayDenoise 形状相同。每个元素表示对应的心电图数据点所属的类别。
                                                      // lineIndex 是当前导联（心电图线）的索引。
                                                      // index 是当前导联中数据点的索引。
                                                      // beatArraySeg[lineIndex][index]; 获取的是当前导联 lineIndex 中第 index 个数据点的类别。这一类别值是 0、1、2 或 3，对应不同的分类结果
      hb.strokeStyle = colors[segment];//segment 是当前数据点的类别（0、1、2或3），colors[segment] 是对应类别的颜色。将 strokeStyle 设置为当前类别的颜色。
      hb.lineTo(index + startX, startY + (value / 0.1575) * 5);//lineTo 方法绘制一条从上一个点到当前点的线条。
      hb.stroke();//使用 stroke 方法将这条线条绘制到画布上。
      hb.beginPath();   //beginPath 方法重启一条新的路径
                        //当我们需要在同一条心电图线上根据类别分段并使用不同颜色时，必须在每段开始之前调用 hb.beginPath()。这可以确保每段线条有自己独立的路径，从而应用不同的颜色。
                        //这样，当类别改变时，新的颜色可以正确应用到新的路径上。
                        //如果不调用 beginPath()，整个心电图会被视为一条连续的路径，并且会使用最后一次设置的 strokeStyle 颜色。
                        //调用 moveTo() 将路径的起点移动到新的位置，确保每段线条的起点正确连接。
      hb.moveTo(index + startX, startY + (value / 0.1575) * 5);//moveTo 方法将路径起点移动到当前数据点位置。这一步是为了在绘制不同类别时，能够正确地应用不同的颜色。
    });
    hb.closePath();
  });
}

// #endregion
// #endregion

// #region draw & hide call by 改变心电图显示时间段

draw() 
//清除画布
function hide() {
    // 获取画布元素
    var ctx = c_canvas.getContext("2d");
    // 清除画布内容
    ctx.clearRect(0, 0, c_canvas_width, c_canvas_hight);
}
function draw() {
    drawGrid(c_canvas,c_canvas_width,c_canvas_hight);//绘制降噪网格
    drawGrid(s_canvas,s_canvas_width,s_canvas_hight);//绘制分割网格
    
    drawLine_denoise(c_canvas,beatArray,beatArrayDenoise);
    drawLine_seg(s_canvas,beatArrayDenoise,beatArraySeg);

    return;
}
// #endregion


//range改变心电图显示时间段
$(function() { //这是一个 jQuery 语法，用于在文档加载完毕后执行其中的代码。也就是 $(document).ready() 的简写形式。
    $("#timeRange").on("change", function() {
      range = document.getElementById("timeRange").value;
      document.getElementById("time").innerHTML = range;
      hide();

      draw();// 重绘心电图
    });
  });





