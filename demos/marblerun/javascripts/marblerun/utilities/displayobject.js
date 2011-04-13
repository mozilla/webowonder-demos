var DisplayObject = Class.create({
  
  initialize: function() {
    this.x = null;
    this.y = null;

    this.width = null;
    this.height = null;

    this.parent = null;
  },

  hitTest: function(x, y) {
    if (x < this.x || y < this.y  || x > this.x + this.width || y > this.y + this.height) {
      return false;
    } else {
      return true;
    }
  }, 

  parentToLocal: function(point) {
    
    return {x: point.x - this.x, y: point.y - this.y};

  }

});