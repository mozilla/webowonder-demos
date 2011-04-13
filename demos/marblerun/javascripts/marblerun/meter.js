var Meter = Class.create(DisplayObject, {
  
  initialize: function($super, canvas) {
    $super();

    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.context.translate(0.5, 0.5);

    this.width = 218;
    this.height = 185;

    this.angle = - Math.PI / 4;
    this.targetAngle = null;
    this.timeINT = null;
  },

  setSize: function() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  },

  setRotation: function(percent) {
    clearTimeout(this.timeINT);
    this.targetAngle = percent * Math.PI / 2 - Math.PI / 4;

    var that = this;
    setTimeout(function() {that.calculateRotation();}, 1000);
  },

  calculateRotation: function() {
    this.angle += (this.targetAngle - this.angle) / 8;

    if (Math.abs(this.angle - this.targetAngle) < 0.01) {

      this.angle = this.targetAngle;
      this.draw();
      
      this.timeINT = null;

    } else {
      this.draw();

      var that = this;
      this.timeINT = setTimeout(function() {that.calculateRotation();}, 50);
    }
  },

  draw: function() {

    this.setSize();

    this.context.fillStyle = Pattern.meterBackground;
    this.context.fillRect(0, 0, this.width, this.height);

    this.context.save();

      this.context.translate(109, 120);
      this.context.rotate(this.angle);
      this.context.translate(-19, -65);

      this.context.drawImage(Pattern.image.meterPointer, 0, 0, 22, 92);

    this.context.restore();

    this.context.fillStyle = Pattern.meterForeground;
    this.context.fillRect(0, 0, this.width, this.height);

  }

});