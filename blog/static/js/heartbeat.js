var hb;//heartBeat简写，方便之后操作

document.addEventListener('DOMContentLoaded', function() {
  console.log("External JS file loaded");
  if (typeof window.beatArray !== 'undefined') {
      console.log('window.beatArray', 'from external script');  // Now you can use the beatArray in your JavaScript
  } else {
      console.log("beatArray is undefined in external script");
  }
});
// var beatArray= [
// [0, -10],
// [50, 30],
// [70, -50],
// [90, 50],
// [110, -15],
// [130, 25],
// [150, -60],
// [170, 15],
// [190, -30],
// [210, 32],
// [230, -2],
// [250, 25],
// [270, -45],
// [290, 32],
// [310, -54],
// [330, 25],
// [350, -16],
// [370, 30],
// [390, -50],
// [410, 50],
// [430, -15],
// [450, 25],
// [470, -60],
// [490, 15],
// [510, -30],
// [530, 32],
// [550, -2],
// [570, 25],
// [590, -45],
// [610, 32],
// [630, -54],
// [650, 25],
// [670, -16],
// [696, 30],
// [710, -50],
// [730, 50],
// [750, -15],
// [770, 25],
// [790, -60],
// [810, 15],
// [830, -30],
// [850, 32],
// [870, -2],
// [890, 25],
// [910, -45],
// [930, 32],
// [950, -54],
// [970, 25],
// [990, -16],
// [1010, 30],
// [1030, -50],
// [1050, 50],
// [1070, -15],
// [1090, 25],
// [1110, -60],
// [1130, 15],
// [1150, -30],
// [1170, 32],
// [1190, -2],
// [1210, 25],
// [1230, -45],
// [1250, 32],
// [1270, -54],
// [1290, 25],
// [1310, -16]
// ];

var ctx;
var c_canvas = document.getElementById("heartBeat");
var show = true; //定义网格显示隐藏变量
var mulNum = 1; //定义增益变量
var i = 1; //定义判断值变量



/**绘制网格总函数
 * 分别绘制
 * drawSmallGrid小网格
 * drawMediumGrid中网格
 * drawBigGrid大网格
 */
function drawGrid(c_canvas) {
    drawSmallGrid(c_canvas);
    drawMediumGrid(c_canvas);
    drawBigGrid(c_canvas);
    return;
  }
/**绘制小网格
 * 第一个for语句循环出纵向小方格细线条，间距为X轴方向3像素
 * 第二个for语句循环出横向小方格细线条，间距为Y轴方向3像素
 */
function drawSmallGrid(c_canvas) {
    ctx = c_canvas.getContext("2d");
    ctx.strokeStyle = "#f1dedf";
    ctx.strokeWidth = 1;
    ctx.beginPath();
    for (var x = 0.5; x < 750; x += 3) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 750);
      ctx.stroke();
    }
    for (var y = 0.5; y < 750; y += 3) {
      ctx.moveTo(0, y);
      ctx.lineTo(750, y);
      ctx.stroke();
    }
    ctx.closePath();
    return;
  }
/**绘制中型网格
 * 第一个for语句循环出纵向中方格中线条，间距为X轴方向15像素，小网格的5倍
 * 第二个for语句循环出横向中方格中线条，间距为Y轴方向15像素，小网格的5倍
 */
function drawMediumGrid(c_canvas){
    ctx = c_canvas.getContext("2d");
    ctx.strokeStyle="#fdbeb9";
    ctx.strokeWidth = 2
    //宽度是小网格的2倍
    ctx.beginPath();
    for(var x=0.5;x<750;x+=15){
        ctx.moveTo(x,0);
        ctx.lineTo(x,750);
        ctx.stroke();
    }
    for(var y=0.5;y<750;y+=15){
        ctx.moveTo(0,y);
        ctx.lineTo(750,y);
        ctx.stroke();
    }
    ctx.closePath();
    return;
}
/**绘制大型网格
 * 第一个for语句循环出纵向大方格中线条，间距为X轴方向75像素，小网格的5倍
 * 第二个for语句循环出横向大方格中线条，间距为Y轴方向75像素，小网格的5倍
 */
function drawBigGrid(c_canvas) {
    ctx = c_canvas.getContext("2d");
    ctx.strokeStyle = "#e0514b";
    ctx.strokeWidth = 3;
    ctx.beginPath();
    for (var x = 0.5; x < 750; x += 75) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 750);
      ctx.stroke();
    }
    for (var y = 0.5; y < 750; y += 75) {
      ctx.moveTo(0, y);
      ctx.lineTo(750, y);
      ctx.stroke();
    }
    ctx.closePath();
    return;
}


//网格显示隐藏功能
function showGrid() {
    show = !show; //每次执行这个方法，show就会变一次
    if (show) {
      draw();//重画全部
      document.getElementById("showGrid").innerHTML = "网格(开)";
      //改变button按钮上的文字
    } else {
      hide();//清除画布
      drawLine(c_canvas);//将心电图再画上去，网格不画
      document.getElementById("showGrid").innerHTML = "网格(关)";
      //改变button按钮上的文字
    }
  }

//清除画布
function hide() {
    ctx.beginPath();
    ctx.clearRect(0, 0, 1000, 1000);
    ctx.stroke();
}

function draw() {
    drawGrid(c_canvas);
    drawLine(c_canvas);
    return;
}


/**绘制心电图 */
function drawLine(c_canvas) {// 定义一个名为 drawLine 的函数，接受一个参数 c_canvas，代表 HTML 中的 <canvas> 元素。
    hb = c_canvas.getContext("2d");//使用 getContext("2d") 方法获取绘图上下文，该上下文用于在画布上绘制图形。这里，hb 是一个用于绘制二维图形的 CanvasRenderingContext2D 对象。
    hb.strokeStyle = "#0f0";//设置绘制线条的颜色为绿色（十六进制颜色代码为 #0f0）。
    //线条颜色为绿色
    hb.lineWidth = 2;//设置绘制线条的宽度为2个像素。
    //线条粗细为2
    hb.beginPath();//开始一个新的路径。在调用 beginPath 之后绘制的图形会构成一条路径。
    let beatArray_2 = beatArray.map((value, index) => [index, value]);//把横坐标加上
    beatArray_2.forEach(a => {//遍历 beatArray 数组中的每个元素 a。假设 beatArray 是一个二维数组，每个元素 a 是一个包含两个值的数组。
        hb.lineTo(a[0] + range * -30, (a[1] /0.1575)*5+100 );//对于 a 的每一个元素，调用 hb.lineTo() 方法，这将在当前路径中添加一条从当前点到指定点的线。
    });  // (a[0] + range * -30
         // a[1] *100 +100 是 y 坐标。这里将 y 坐标加上 100 以便将线条绘制在画布的中间位置。
         // 横坐标+时间单位x像素，纵坐标x增益+横轴位置
    /**for循环 */
    hb.stroke();//通过描绘路径来渲染线条。使用当前的描边样式（即绿色和 2 像素宽度）绘制出路径。
    hb.closePath();//关闭路径。这个方法会创建从当前点到起点的路径线段。
}


//心电图波纹增益
function multiple() {
    if (i == 4) {
      i = 1;
    }
    i++;
    switch (i) {
      case 2:
        mulNum = 2;
        document.getElementById("multiple").innerHTML = "增益(20)";
        break;
      case 3:
        mulNum = 0.5;
        document.getElementById("multiple").innerHTML = "增益(5)";
        break;
      case 4:
        mulNum = 1;
        document.getElementById("multiple").innerHTML = "增益(10)";
        break;
    }
    hide();//清除
    draw();//重绘
}



var range = 0; //定义初始时间

//range改变心电图显示时间段
$(function() {
    $("#timeRange").on("mouseover", function() {
      var $context = $(this);
      if ($context.data("event")) return;
      $context.data("event", "bindChange");
  
      $context.one("mousedown", function() {
        $(document).on("mousemove", function() {
          // 获取 range input 的当前值
          range = document.getElementById("timeRange").value;
          hide();// 隐藏当前显示的心电图
          draw();// 重绘心电图（假设有一个 draw() 函数）
          document.getElementById("time").innerHTML = range;// 更新页面上的 span 元素的内容为当前 range 的值
        });
      });
    });
  });

draw(); //调用绘制网格



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