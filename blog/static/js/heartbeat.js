document.addEventListener('DOMContentLoaded', function() {
  console.log("External JS file loaded");
  if (typeof window.beatArray !== 'undefined') {
      console.log('window.beatArray', 'from external script');  // Now you can use the beatArray in your JavaScript
  } else {
      console.log("beatArray is undefined in external script");
  }
});


var c_canvas = document.getElementById("beforeDenoise");
var d_canvas = document.getElementById("afterDenoise");
var show = true; //定义网格显示隐藏变量
var mulNum = 1; //定义增益变量
var i = 1; //定义判断值变量
var canvas_width = 1326;
var canvas_hight = 1300;



var range = 0; //定义初始时间

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
function drawMediumGrid(canvas){
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
function drawBigGrid(canvas) {
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

/**绘制心电图线 */
function drawLine_12(canvas,beatArray) {// 定义一个名为 drawLine 的函数，接受一个参数 c_canvas，代表 HTML 中的 <canvas> 元素。
  hb = canvas.getContext("2d");//使用 getContext("2d") 方法获取绘图上下文，该上下文用于在画布上绘制图形。这里，hb 是一个用于绘制二维图形的 CanvasRenderingContext2D 对象。
  hb.strokeStyle = "#000000";//设置绘制线条的颜色为绿色（十六进制颜色代码为 #0f0）。
  hb.lineWidth = 2;//设置绘制线条的宽度为2个像素。
  
  hb.font = "16px Arial"; // 设置字体样式和大小为20px
  hb.fillStyle = "#000000"; // 设置文本颜色为黑色
  // 12个标准心电导联的名称
  const leadNames = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

  const lineHeight = 110; // 每行的高度
  const startX = 10; // 起始X坐标

  // 绘制每一行心电图
  beatArray.forEach((beatLine, lineIndex) => {
    let startY = 30 + lineIndex * lineHeight; // 计算每一行的起始Y坐标
    // 绘制心电导联名称
    hb.fillText(leadNames[lineIndex], startX, startY - 10);
    

    hb.beginPath();//开始一个新的路径。在调用 beginPath 之后绘制的图形会构成一条路径。
    let beatLine_2 = beatLine.map((value, index) => [index, value]);//把横坐标加上
    beatLine_2.forEach(a => {//遍历 beatLine 数组中的每个元素 a。假设 beatLine 是一个二维数组，每个元素 a 是一个包含两个值的数组。
      hb.lineTo(a[0] + range * -30, startY + (a[1] / 0.1575) * 5); // 绘制线条到指定点
    });  
    hb.stroke();//通过描绘路径来渲染线条。使用当前的描边样式（即绿色和 2 像素宽度）绘制出路径。
    hb.closePath();//关闭路径。这个方法会创建从当前点到起点的路径线段。
  });
}

// #endregion


// #region call by 心电图显示时间段
//清除画布
function hide() {
    // 获取画布元素
    var ctx = c_canvas.getContext("2d");
    var ctx_1 = d_canvas.getContext("2d");
    // 清除画布内容
    ctx.clearRect(0, 0, canvas_width, canvas_hight);
    ctx_1.clearRect(0, 0, canvas_width, canvas_hight);
}
function draw() {
    drawGrid(c_canvas);
    drawGrid(d_canvas);
    
    drawLine_12(c_canvas,beatArray);
    drawLine_12(d_canvas,beatArray_denoise);

    console.log("draw999999");
    return;
}

// #endregion


draw() 





//range改变心电图显示时间段
$(function() { //这是一个 jQuery 语法，用于在文档加载完毕后执行其中的代码。也就是 $(document).ready() 的简写形式。
    $("#timeRange").on("change", function() {
      range = document.getElementById("timeRange").value;
      document.getElementById("time").innerHTML = range;
      hide();

      draw();// 重绘心电图
    });
  });











/**绘制单导心电图 */
// function drawLine_1(c_canvas) {// 定义一个名为 drawLine 的函数，接受一个参数 c_canvas，代表 HTML 中的 <canvas> 元素。
//     hb = c_canvas.getContext("2d");//使用 getContext("2d") 方法获取绘图上下文，该上下文用于在画布上绘制图形。这里，hb 是一个用于绘制二维图形的 CanvasRenderingContext2D 对象。
//     hb.strokeStyle = "#0f0";//设置绘制线条的颜色为绿色（十六进制颜色代码为 #0f0）。
//     hb.lineWidth = 2;//设置绘制线条的宽度为2个像素。

//     hb.beginPath();//开始一个新的路径。在调用 beginPath 之后绘制的图形会构成一条路径。
//     let beatArray_2 = beatArray.map((value, index) => [index, value]);//把横坐标加上
//     beatArray_2.forEach(a => {//遍历 beatArray 数组中的每个元素 a。假设 beatArray 是一个二维数组，每个元素 a 是一个包含两个值的数组。
//         hb.lineTo(a[0] + range * -30, (a[1] /0.1575)*5+100 );//对于 a 的每一个元素，调用 hb.lineTo() 方法，这将在当前路径中添加一条从当前点到指定点的线。
//     });  // (a[0] + range * -30
//          // a[1] *100 +100 是 y 坐标。这里将 y 坐标加上 100 以便将线条绘制在画布的中间位置。
//          // 横坐标+时间单位x像素，纵坐标x增益+横轴位置
//     /**for循环 */
//     hb.stroke();//通过描绘路径来渲染线条。使用当前的描边样式（即绿色和 2 像素宽度）绘制出路径。
//     hb.closePath();//关闭路径。这个方法会创建从当前点到起点的路径线段。
// }


// //根据网格单位测量心电图相关距离
// var canvas = document.getElementById("heartBeat"); // 得到画布
// var cl = canvas.getContext("2d"); // 得到画布的上下文对象
// var flag = false;
// var x = 0; // 鼠标开始移动的位置X
// var y = 0; // 鼠标开始移动的位置Y
// var url = ""; // canvas图片的二进制格式转为dataURL格式
// /* 为canvas绑定mouse事件 */

// $("canvas")
//   .mousedown(function(e) {
//     flag = true;
//     x = e.offsetX; // 鼠标落下时的X
//     y = e.offsetY; // 鼠标落下时的Y
//     // console.log(x, y);

//     $("#mouseTip").css("display", "block");
//     $("#heartBeat").css("display", "block");
//     //当点击鼠标，让该canvas和span标签出现
//   })
//   .mouseup(function(e) {
//     flag = false;
//     url = $("#heartBeat")[0].toDataURL();
//     // 每次 mouseup 都保存一次画布状态
//     cl.clearRect(0, 0, canvas.width, canvas.height);
//     $("#mouseTip").css("display", "none");
//     $("#heartBeat").css("display", "none");
//     //当松开鼠标，让该canvas和sapn标签消失
//   })
//   .mousemove(function(e) {
//     drawrule(e); // 绘制方法+
//   });
// function drawPencil(e) {
//   if (flag) {
//     cl.lineTo(e.offsetX, e.offsetY);
//     cl.stroke();
//     // 调用绘制方法
//   } else {
//     cl.beginPath();
//     cl.moveTo(x, y);
//   }
// }
// function drawrule(e) {
//   if (flag) {
//     cl.clearRect(0, 0, canvas.width, canvas.height);
//     cl.beginPath();
//     cl.strokeStyle = "#f00";
//     cl.moveTo(x, y);
//     cl.lineTo(e.offsetX, e.offsetY);
//     cl.stroke();
//     var xline = e.offsetX - x;
//     var yline = e.offsetY - y;
//     //定义两个变量来记录横纵坐标的点击点和拖动至的点的距离
//     var print;
//     //定义变量记录输出值
//     // console.log(xline + "X");
//     // console.log(yline + "Y");
//     if (xline > -yline) {
//       //判断横向距和纵向距离大小区别，发生变化时给出不同的单位
//       xline *= 200 / 15;
//       print = xline + "ms";
//     } else {
//       yline *= 0.5 / 15;
//       print = yline + "mv";
//     }
//     document.getElementById("mouseTip").innerHTML = print;
//   } //横向15px=200ms,纵向15px=0.5mv
// }

// //标签跟着鼠标移动
// document.onmousemove = function(ev) {
//   var oEvent = ev || event;
//   var oDiv = document.getElementById("mouseTip");
//   oDiv.style.left = oEvent.clientX + 10 + "px";
//   oDiv.style.top = oEvent.clientY - 20 + "px";
//   //距离鼠标的位置，
// };