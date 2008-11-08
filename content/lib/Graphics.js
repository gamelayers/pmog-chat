/**
    Graphics.js
    
    By Guyon Roche
    
    Reference: http://www.webreference.com/programming/javascript/gr/column2/
*/

function Graphics(canvas)
{
	this.canvas = canvas;
	this.cache = new PArray;
	this.shapes = new Object;
	this.nObject = 0;

	// defaults
	this.penColor = "black";
	this.zIndex = 0;
}

Graphics.prototype.createPlotElement = function(x,y,w,h) 
{
	// detect canvas
	if ( !this.oCanvas )
	{
		if ( (this.canvas == undefined) || (this.canvas == "") ) 
			this.oCanvas = document.body;
		else 
			this.oCanvas = document.getElementById(this.canvas);
	}

	// retrieve DIV
	var oDiv;
	if ( this.cache.length )
		oDiv = this.cache.pop();
	else 
	{
		oDiv = document.createElement('div');
		this.oCanvas.appendChild(oDiv);

		oDiv.style.position = "absolute";
		oDiv.style.margin = "0px";
		oDiv.style.padding = "0px";
		oDiv.style.overflow = "hidden";
		oDiv.style.border = "0px";
	}

	// set attributes
	oDiv.style.zIndex = this.zIndex;
	oDiv.style.backgroundColor = this.penColor;
	oDiv.style.left = x + "px";
	oDiv.style.top = y + "px";
	oDiv.style.width = w + "px";
	oDiv.style.height = h + "px";

	oDiv.style.visibility = "visible";
	
	return oDiv;
}

Graphics.prototype.releasePlotElement = function(oDiv)
{
	oDiv.style.visibility = "hidden";
	this.cache.push(oDiv);
}

Graphics.prototype.addShape = function(shape)
{
	shape.oGraphics = this;
	shape.graphicsID = this.nObject;
	this.shapes[this.nObject] = shape;
	this.nObject++;
	shape.draw();
	if (shape.subShapes) {
	    var subshapes = shape.subShapes();
	    for (var i = 0; i < subshapes.length; i++) {
	        this.addShape(subshapes[i]);
	    }
	}
	return shape;
}

Graphics.prototype.removeShape = function(shape)
{
	if ( (shape instanceof Object) && 
		(shape.oGraphics == this) && 
		(this.shapes[shape.graphicsID] == shape) )
	{
		shape.undraw();
		this.shapes[shape.graphicsID] = undefined;
		shape.oGraphics = undefined;
	}
}
Graphics.prototype.clear = function()
{
	for ( var i in this.shapes )
		this.removeShape(this.shapes[i]);
}


//=============================================================================
// Point
Graphics.prototype.drawPoint = function(x,y)
{
	return this.addShape(new Point(x,y))
}

function Point(x,y)
{
	this.x = x;
	this.y = y;
}

Point.prototype.offset = function(xOffset, yOffset) {
    return new Point(this.x + xOffset, this.y + yOffset);
}

Point.prototype.draw = function()
{
	this.oDiv = this.oGraphics.createPlotElement(this.x,this.y,1,1);
}
Point.prototype.undraw = function()
{
	this.oGraphics.releasePlotElement(this.oDiv);
	this.oDiv = undefined;
}

//=============================================================================
// Line
Graphics.prototype.drawLine = function(x1,y1,x2,y2)
{
	return this.addShape(new Line(x1,y1,x2,y2))
}

function Line(x1,y1,x2,y2)
{
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;
}

Line.prototype.draw = function()
{
	this.plots = new PArray;

	var dx = this.x2 - this.x1;
	var dy = this.y2 - this.y1;
	var x = this.x1;
	var y = this.y1;

	var n = Math.max(Math.abs(dx),Math.abs(dy));
	dx = dx / n;
	dy = dy / n;
	for (var i = 0; i <= n; i++ )
	{
		this.plots.push(this.oGraphics.createPlotElement(Math.round(x),Math.round(y),1,1));

		x += dx;
		y += dy;
	}
}
Line.prototype.undraw = function()
{
	while ( this.plots.length )
		this.oGraphics.releasePlotElement(this.plots.pop());
	this.plots = undefined;
}

Graphics.prototype.drawPolygon = function(points) {
    var polygon = new Polygon(points);
/*    for (var i = 0; i < polygon.lines.length; i++) {
        this.addShape(polygon.lines[i]);
    }*/
    return this.addShape(polygon);
}

/**
    accepts an array of points [x1, y1, x2, y2, ...]
*/
function Polygon(points)
{
    this.lines = $PA();
    var length = points.length;
    if (length < 4) {
        throw "illegal argument: not enough points";
    }
    // Add the beginning to the end; it simplifies the algorithm.
    points[length] = points[0];
    points[length + 1] = points[1];    
    for (var i = 0; i < length; i+=2) {
        this.lines.push(new Line(points[i], points[i + 1], points[i + 2], points[i + 3]));
    }

}

Polygon.prototype.draw = function()
{
/*    for (var i = 0; i < this.lines.length; i++) {
        this.lines[i].draw();
    }*/
}

Polygon.prototype.undraw = function() 
{
/*    for (var i = 0; i < this.lines.length; i++) {
        this.lines[i].undraw();
    }*/
}

Polygon.prototype.subShapes = function()
{
    return this.lines;
}

//=============================================================================
// Circle
Graphics.prototype.drawCircle = function(x,y,r)
{
	return this.addShape(new Circle(x,y,r));
}

function Circle(x,y,r)
{
	this.x = x;
	this.y = y;
	this.radius = r;
}

Circle.prototype.draw = function()
{
	this.plots = new PArray;

	var r2 = this.radius * this.radius;
	var x = 0;
	var y = this.radius;

	while ( x <= y )
	{
		this.plots.push(this.oGraphics.createPlotElement(Math.round(this.x + x), Math.round(this.y + y), 1, 1));
		this.plots.push(this.oGraphics.createPlotElement(Math.round(this.x - x), Math.round(this.y + y), 1, 1));
		this.plots.push(this.oGraphics.createPlotElement(Math.round(this.x + x), Math.round(this.y - y), 1, 1));
		this.plots.push(this.oGraphics.createPlotElement(Math.round(this.x - x), Math.round(this.y - y), 1, 1));
		this.plots.push(this.oGraphics.createPlotElement(Math.round(this.x + y), Math.round(this.y + x), 1, 1));
		this.plots.push(this.oGraphics.createPlotElement(Math.round(this.x + y), Math.round(this.y - x), 1, 1));
		this.plots.push(this.oGraphics.createPlotElement(Math.round(this.x - y), Math.round(this.y + x), 1, 1));
		this.plots.push(this.oGraphics.createPlotElement(Math.round(this.x - y), Math.round(this.y - x), 1, 1));

		x++;
		y = Math.round(Math.sqrt(r2 - x*x));
	}
}
Circle.prototype.undraw = Line.prototype.undraw;

//=============================================================================
// FillRectangle
Graphics.prototype.fillRectangle = function(x,y,w,h)
{
	return this.addShape(new FillRectangle(x,y,w,h))
}

function FillRectangle(x,y,w,h)
{
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
}

FillRectangle.prototype.draw = function()
{
	this.oDiv = this.oGraphics.createPlotElement(this.x,this.y,this.w,this.h);
}
FillRectangle.prototype.undraw = Point.prototype.undraw;

//=============================================================================
/*
var gr = new Graphics("theCanvas");
var c = null;

var p = null;
var a = 0;
function drawProp()
{
	if ( p ) gr.removeShape(p);
	
	var x = Math.round(Math.sin(a) * 45);
	var y = Math.round(Math.cos(a) * 45);
	a -= Math.PI / 25;
	gr.penColor = "black";
	p = gr.drawLine(100 + x, 100 + y, 100 - x, 100 - y);
	window.setTimeout("drawProp();", 10);
}

function drawShapes()
{
	gr.penColor = "red";
	gr.drawLine(10,10,190,190);

	gr.penColor = "green";
	gr.drawLine(190,10,10,190);

	gr.penColor = "blue";
	c = gr.drawCircle(100,100,45);

	gr.zIndex = 1;	
	gr.penColor = "lime";
	gr.fillRectangle(50,70,100,20);
	gr.zIndex = 0;
	
	drawProp();
}

</script>
</head>
<body onload="drawShapes();">
	Demo of an Extensible Object Oriented JavaScript Vector Graphics Package.
	<div id="theCanvas" style="position:absolute; left:100px; top:50px; width:200px; height:200px; overflow:hidden;"></div>
</body>
</html>
*/