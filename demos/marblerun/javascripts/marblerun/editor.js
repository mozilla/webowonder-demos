var Editor = Class.create(Renderer, {

  initialize: function($super, staticCanvas, dynamicCanvas, imageCanvas) {
    $super(staticCanvas, dynamicCanvas);

    this.imageCanvas = imageCanvas;

    this.baseToolbox = new Toolbox();
    this.baseToolbox.parent = this;
    this.baseToolbox.x = this.field.x + this.field.width + 3 * Brick.SIZE;
    this.baseToolbox.y = this.field.y;

    this.specialToolbox = new Toolbox();
    this.specialToolbox.parent = this;
    this.specialToolbox.x = this.baseToolbox.x + this.baseToolbox.width + Brick.SIZE;
    this.specialToolbox.y = this.baseToolbox.y;

    this.eventEngine = new EventEngine();
    this.dragElement = this.hoverElement = this.selectElement = null;

    this.setSize();
    this.addBricksToToolboxes();
    this.initializeHTMLInterface();
    
    // this.baseToolbox.onClick(1.5 * Brick.SIZE, 3.5 * Brick.SIZE);
  },

  quit: function($super) {
    $super();
    
    this.removeEventListening();
  },

  init: function($super) {
    $super();
    
    this.addEventListening();
    this.field.resetTrack();
  },

  setSize: function() {

    var width = this.specialToolbox.x + this.specialToolbox.width + 3,
        height = this.field.y + this.field.height + Brick.SIZE;

    this.width = this.staticCanvas.width = this.dynamicCanvas.width = width;
    this.height = this.staticCanvas.height = this.dynamicCanvas.height = height;

  },
  
  addEventListening: function() {

    this.eventEngine.addListener("click", this.onClick, this);
    this.eventEngine.addListener("mouseMove", this.onMouseMove, this);

    this.eventEngine.addListener("startDrag", this.onStartDrag, this);
    this.eventEngine.addListener("stopDrag", this.onStopDrag, this);
    
  },

  removeEventListening: function() {
    this.eventEngine.removeListener("click", this.onClick);
    this.eventEngine.removeListener("mouseMove", this.onMouseMove);

    this.eventEngine.removeListener("startDrag", this.onStartDrag);
    this.eventEngine.removeListener("stopDrag", this.onStopDrag);
  },
  
  addBricksToToolboxes: function() {
    
    var baseBricks = [Brick, Ramp, Kicker, Curve, Line],
      i;

    for (i = 0; i < baseBricks.length; i++) {
      this.baseToolbox.addBrick(baseBricks[i]);
    }

    var that = this;

    /*var request = new Ajax.Request('/unlocks', {
      method: 'get',
      requestHeaders: {Accept: 'application/json'},
      
      onSuccess: function(transport) {
        
        for (i = 5; i < transport.responseJSON.unlocks.length; i++) {
          that.specialToolbox.addBrick(eval(transport.responseJSON.unlocks[i]));
        }
        
        if (transport.responseJSON.locks) {
          that.specialToolbox.addPreviewBrick(eval(transport.responseJSON.locks[0]))
        }
      },
      
      onFailure: function(transport) {
        //console.log("AjaxError on loading unlocks!");
      }
    });*/

    jQuery.ajax({
      url: "http://marblerun.at" + '/unlocks',
      type: 'GET',
      headers: {
        "Accept": "application/json"
      },
      data: {
      },
      success: function(transport) {
        
        try {
          transport = JSON.parse(transport);
        } catch(error) {
          transport = transport;
        }

        for (i = 5; i < transport.unlocks.length; i++) {
          that.specialToolbox.addBrick(eval(transport.unlocks[i]));
        }
        
        if (transport.locks) {
          that.specialToolbox.addPreviewBrick(eval(transport.locks[0]))
        }
      },

      error: function(transport) {
        
      }
    });
  },
  
  initializeHTMLInterface: function($super) {
    var myScope = this;

    $('runButton').observe('click', function(event) {
      myScope.field.startBox2D();
    });

    $('clearButton').observe('click', function(event) {
      myScope.field.clearTrack(true);
    });

    $('publishButton').observe('click', function(event) {
      if ($('publishButton').hasClassName('activePublish') && myScope.field.validTrack) {

        myScope.publishTrack();
        $('publishButtonWarning').style.visibility = "hidden";
        
      } else {

        $('publishButtonWarning').style.visibility = "visible";

      }
    });
  },
  
  drawStatics: function() {
    
    if (this.field.renderNew || 
      this.baseToolbox.renderNew || this.specialToolbox.renderNew) {

        this.clearCanvas(this.staticCanvas);

        this.staticContext.save();

          this.staticContext.translate(0.5, 0.5);

          this.field.drawStatics(this.staticContext);
          
          this.baseToolbox.drawStatics(this.staticContext);
          this.specialToolbox.drawStatics(this.staticContext);

          // this.staticImageData = this.staticContext.getImageData(0, 0, this.staticCanvas.width, this.staticCanvas.height);

        this.staticContext.restore();
    }
  },
  
  drawDynamics: function() {
    
    this.dynamicContext.save();
      
      this.clearDynamicCanvas();
      
      
      this.dynamicContext.translate(0.5, 0.5);
      
      this.field.drawDynamics(this.dynamicContext);
      
      this.baseToolbox.drawDynamics(this.dynamicContext);
      this.specialToolbox.drawDynamics(this.dynamicContext);
      
      if (this.hoverElement) {
        
        this.dynamicContext.save();
        
          this.dynamicContext.fillStyle = "#333333";
          this.dynamicContext.globalAlpha = 0.15;
        
          this.hoverElement.draw(this.dynamicContext);
        
        this.dynamicContext.restore();
        
      }
      
      if (this.selectElement) {
        
        this.dynamicContext.save();
        
          this.dynamicContext.fillStyle = "#800000";
          this.dynamicContext.globalAlpha = 0.3;
        
          this.selectElement.draw(this.dynamicContext);
        
        this.dynamicContext.restore();
        
      }
      
      if (this.field.debugMode) {
      
        this.field.draw(this.dynamicContext);
      
      }
      
      if (this.dragElement) {
        
        this.dynamicContext.drawShadows = true;
        
        this.dragElement.drawGlobal(this.dynamicContext);
        
        this.dynamicContext.drawShadows = false;
        
      }
    
    this.dynamicContext.restore();
  },
  
  onClick: function(event) {
    
    if (this.field.hitTest(event.mouseX, event.mouseY)) {

      if (!this.field.intervalID) {

        this.field.onClick(event.mouseX - this.field.x, event.mouseY - this.field.y);

      }

      this.field.resetTrack();
      
    } else if (this.baseToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.baseToolbox.onClick(event.mouseX - this.baseToolbox.x, event.mouseY - this.baseToolbox.y);

    } else if (this.specialToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.specialToolbox.onClick(event.mouseX - this.specialToolbox.x, event.mouseY - this.specialToolbox.y);

    }
  },
  
  onMouseMove: function(event) {

    this.hoverElement = null;

    if (this.field.hitTest(event.mouseX, event.mouseY)) {

      this.hoverElement = this.getCellBox(this.field, event.mouseX, event.mouseY);

    } else if (this.baseToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.hoverElement = this.getCellBox(this.baseToolbox, event.mouseX, event.mouseY);

    } else if (this.specialToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.hoverElement = this.getCellBox(this.specialToolbox, event.mouseX, event.mouseY);

    }
  },
  
  getCellBox: function(grid, mouseX, mouseY) {
    return grid.getCellBox(
      grid.getCell(
        mouseX - grid.x, 
        mouseY - grid.y
      )
    );
  },
  
  onStartDrag: function(event) {

    this.field.resetTrack();

    if (this.field.hitTest(event.mouseX, event.mouseY)) {

      this.field.resetTrack();
      this.field.onStartDrag(event.mouseX - this.field.x, event.mouseY - this.field.y);

    } else if (this.baseToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.baseToolbox.onStartDrag(event.mouseX - this.baseToolbox.x, event.mouseY - this.baseToolbox.y);

    } else if (this.specialToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.specialToolbox.onStartDrag(event.mouseX - this.specialToolbox.x, event.mouseY - this.specialToolbox.y);

    }
  },

  onDrag: function(event) {

    if (this.dragElement && event.mouseX && event.mouseY) {
      
      this.dragElement.x = parseInt(event.mouseX - Brick.SIZE / 2, 10);
      this.dragElement.y = parseInt(event.mouseY - Brick.SIZE / 2, 10);
      
    }
  },
  
  dragBrick: function(brick) {

    var point = {x: this.eventEngine.latestEvent.mouseX, y: this.eventEngine.latestEvent.mouseY};

    brick.x = point.x - Brick.BIG_SIZE / 2;
    brick.y = point.y - Brick.BIG_SIZE / 2; 

    this.dragElement = brick;

    this.eventEngine.addListener("drag", this.onDrag, this);
  },
  
  startDragBricking: function() {
    
    this.eventEngine.addListener("drag", this.onDragBricking, this);
    
  },
  
  onDragBricking: function(event) {

    if (this.field.hitTest(event.mouseX, event.mouseY)) {

      this.field.onDrag(event.mouseX - this.field.x, event.mouseY - this.field.y);

    }

  },

  onStopDrag: function(event) {

    if (this.dragElement) {
      
      this.field.onStopDrag(event, this.dragElement);
      
      this.dragElement = null;
    
    }

    this.eventEngine.removeListener("drag", this.onDragBricking);
    this.eventEngine.removeListener("drag", this.onDrag);
  },

  publishTrack: function() {
    
    if (this.field.validTrack) {

      contentLoader.parseResponse({responseJSON: {mode: "load"}});

      var parameters = {},
          length = this.field.trackLength;

      parameters['track[json]'] = Object.toJSON(this.field.getTrack());
      parameters['track[length]'] = length;
      parameters['track[imagedata]'] = this.field.getTrackImage(this.imageCanvas);
      parameters['track[username]'] = $('userName').value;
      parameters['track[trackname]'] = $('trackName').value;

      /*var request = new Ajax.Request('/tracks', {
        method: 'post',
        parameters: parameters,
        requestHeaders: {Accept: 'application/json'},
        
        onSuccess: function(transport) {
          contentLoader.parseResponse(transport, true);
        },
        
        onFailure: function(transport) {
          contentLoader.parseResponse(transport, false);
        }
      });*/

      jQuery.ajax({
        url: "http://marblerun.at" + '/tracks',
        type: 'POST',
        headers: {
          "Accept": "application/json"
        },
        data: {
          'track[json]': Object.toJSON(this.field.getTrack()),
          'track[length]': length,
          'track[imagedata]': this.field.getTrackImage(this.imageCanvas),
          'track[username]': $('userName').value,
          'track[trackname]': $('trackName').value
        },
        success: function(transport) {
          contentLoader.parseResponse({ responseJSON: transport }, true);
        },

        error: function(transport) {
          contentLoader.parseResponse({ responseJSON: transport }, false);
        }
      });

      this.field.clearTrack(true);
    } 
  }
  
});