CanvasRenderingContext2D.prototype.dashedLine = function (fromX, fromY, toX, toY, dashLength) {
  
  var gt = function(a, b) {
    return Math.abs(a) > Math.abs(b);
  };

  var A = toX - fromX,
      B = toY - fromY;
      
  var C = Math.sqrt(A * A + B * B),
      c = dashLength;

  var a = (c * A) / C,
      b = (c * B) / C;

  var x = a,
      y = b,
      line = true;

  this.moveTo(fromX, fromY);

  while (gt(A, x) || gt(B, y)) {
    
    if (line) {
      
      this.lineTo(fromX + x, fromY + y);
    
    } else {
      
      this.moveTo(fromX + x, fromY + y);
      
    }

    line = !line;

    x += a;
    y += b;
    
  }
  
  if (line) {
    
    this.lineTo(toX, toY);
  
  } else {
    
    this.moveTo(toX, toY);
    
  }
  
};

CanvasRenderingContext2D.prototype.clearRects = [];

CanvasRenderingContext2D.prototype.addClearRectangle = function(rectangle) {
  
  this.clearRects.push(rectangle);
  
};

CanvasRenderingContext2D.prototype.clearRectangles = function() {
  var i;

  for (i = 0; i < this.clearRects.length; i++) {
    
    this.clearRect(
      this.clearRects[i].x - 1, this.clearRects[i].y - 1, 
      this.clearRects[i].width + 2, this.clearRects[i].height + 2
    );
    
  }
};

CanvasRenderingContext2D.prototype.clearShadow = function() {
  
  this.shadowColor = "rgba(0, 0, 0, 0)";
  
};

Array.prototype.shuffle = function() { 
  var i = this.length; 
  
  if (i < 2) {
    return false;
  }
      
  do { 
    var zi = Math.floor(Math.random() * i); 
    var t = this[zi];
     
    this[zi] = this[--i];
    this[i] = t;
  } while (i);
  
  return true;
};

Date.prototype.getMonthName = function() {
  return ["January", "February", "March", "April", "May", "June",
          "July", "August", "September",
          "October", "November", "December"][this.getMonth()];
};

Date.prototype.getFormatHours = function() {
  if (this.getHours() === 12) {
    return 12;
  }

  return this.fullString(this.getHours() % 12);
};

Date.prototype.getFormatMinutes = function() {
  return this.fullString(this.getMinutes());
};

Date.prototype.fullString = function(value) {
  value = value.toString();

  if (value.length === 1) {
    return "0" + value;
  }

  return value;
};

Date.prototype.getDayTime = function() {
  if (this.getHours() > 11) { 
    return "PM";
  }

  return "AM";
};

function getAbsolutePosition(element) {
  var r = { x: element.offsetLeft, y: element.offsetTop };
  if (element.offsetParent) {
    var tmp = getAbsolutePosition(element.offsetParent);
    r.x += tmp.x;
    r.y += tmp.y;
  }
  return r;
}

function getRelativeCoordinates(event, reference) {

  var x, y, e, pos;
  event = event || window.event;

  var el = event.target || event.srcElement;

  if (!window.opera && typeof event.offsetX !== 'undefined') {
    // Use offset coordinates and find common offsetParent
    pos = { x: event.offsetX, y: event.offsetY };

    // Send the coordinates upwards through the offsetParent chain.
    e = el;
    while (e) {
      e.mouseX = pos.x;
      e.mouseY = pos.y;
      pos.x += e.offsetLeft;
      pos.y += e.offsetTop;
      e = e.offsetParent;
    }

    // Look for the coordinates starting from the reference element.
    e = reference;
    var offset = { x: 0, y: 0 };

    while (e) {

      if (typeof e.mouseX !== 'undefined') {
        x = e.mouseX - offset.x;
        y = e.mouseY - offset.y;
        break;
      }

      offset.x += e.offsetLeft;
      offset.y += e.offsetTop;
      e = e.offsetParent;
    }

    // Reset stored coordinates
    e = el;

    while (e) {

      e.mouseX = undefined;
      e.mouseY = undefined;
      e = e.offsetParent;

    }

  } else {

    // Use absolute coordinates
    pos = getAbsolutePosition(reference);
    x = event.pageX  - pos.x;
    y = event.pageY - pos.y;
  }

  // Subtract distance to middle
  return { x: x, y: y };
}

function testShadowOffsetTransform() {
  
  var canvas = document.createElement('canvas');
  canvas.width = canvas.height = 8;

  var context = canvas.getContext('2d');
  
  context.shadowColor = "rgba(255, 255, 255, 1.0)";
  context.shadowOffsetX = 4;
  
  context.translate(1.5, 1.5);
  context.rotate(Math.PI / 2);
  
  context.fillStyle = "#000000";
  context.fillRect(-2, -2, 4, 4);
  
  var imageData = context.getImageData(1, 5, 1, 1);
  
  //document.removeChild(canvas);
  
  return (imageData.data[0] === 255);
};

// requestAnim shim layer by Paul Irish
    window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 25);
              };
    })();