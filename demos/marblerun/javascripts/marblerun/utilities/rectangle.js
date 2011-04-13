var Rectangle = function(x, y, width, height) {
  this.x = x;
  this.y = y;
  
  this.width = width;
  this.height = height;
};

Rectangle.prototype.draw = function(context) {

  context.fillRect(this.x, this.y, this.width, this.height);

  context.addClearRectangle(this);

};