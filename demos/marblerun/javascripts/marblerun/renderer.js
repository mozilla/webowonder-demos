var Renderer = Class.create(DisplayObject, {
  
  initialize: function($super, staticCanvas, dynamicCanvas) {
    $super();

    this.staticCanvas = staticCanvas;
    this.dynamicCanvas = dynamicCanvas;

    this.staticContext = this.staticCanvas.getContext('2d');
    this.dynamicContext = this.dynamicCanvas.getContext('2d');

    this.initField();

    this.timeoutID = null;
    this.isAnimated = false;

    //this.staticImageData = null;
  },

  initField: function() {

    this.field = new Field();
    this.field.parent = this;
    this.field.x = 64;
    this.field.y = Brick.SIZE;
    this.field.setup();

  },

  initializeHTMLInterface: function() {},
  
  debug: function() {
    this.field.debugMode = !this.field.debugMode;
  },

  startRender: function() {
    
    if (!this.isAnimated) {
      
      this.isAnimated = true;
      this.animate();
      
    }
  },

  stopRender: function() {
    
    this.isAnimated = false;
    
  },

  quit: function() {
    this.stopRender();
    this.field.stopBox2D();

    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
      this.timeoutID = null;
    }
  },

  init: function() {
    this.startRender();
  },

  onBallExit: function() {
    
    this.field.stopBox2D();
    
  }, 

  clearCanvas: function(canvas) {
    var context = canvas.getContext('2d');
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    context.beginPath();
  },
  
  animate: function() {
    
    if (this.isAnimated) {
      
      var myScope = this;
      
      requestAnimFrame(function() {
        myScope.animate();
      });
    }
    
    this.draw();
  },

  draw: function() {
    
    this.drawDynamics();
    this.drawStatics();
    
    // this.staticContext.putImageData(this.staticImageData, 0, 0);
    
    this.dynamicContext.getImageData(0, 0, 1, 1);
    
  },
  
  drawStatics: function() {
    
    if (this.field.renderNew) {
      
      this.staticContext.save();
      
        this.clearCanvas(this.staticCanvas);

        this.staticContext.translate(0.5, 0.5);
        this.field.drawStatics(this.staticContext);

        //this.staticImageData = this.staticContext.getImageData(0, 0, this.staticCanvas.width, this.staticCanvas.height);

      this.staticContext.restore();
    }
  },
  
  drawDynamics: function() {
    
    this.dynamicContext.save();
    
      this.clearDynamicCanvas();
      
      this.dynamicContext.translate(0.5, 0.5);
      
      this.field.drawDynamics(this.dynamicContext);
      
      
      if (this.field.debugMode) {
      
        this.field.draw(this.dynamicContext);
      
      }
    
    this.dynamicContext.restore();
  },
  
  clearDynamicCanvas: function() {
    
    this.dynamicContext.clearRectangles();
    
    this.dynamicContext.clearRects = [];
    
  }

});