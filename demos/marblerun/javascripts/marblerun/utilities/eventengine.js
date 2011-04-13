EventEngine = Class.create({
  
  initialize: function() {
    
    // startDrag, stopDrag, click, mouseDown, mouseUp, mouseMove

    this.listeners = [];
    this.state = {type: "unknown"};
    this.latestEvent = null;
    this.clickTimeout = null;

    this.clickTime = 250; // in milliseconds;

    var that = this;

    document.body.onmousedown = function(event) {that.onMouseDown.call(that, event);};
    document.body.onmouseup = function(event) {that.onMouseUp.call(that, event);};
    document.body.onmousemove = function(event) {that.onMouseMove.call(that, event);};

  },

  addListener: function(type, closure, thisArgument) {
    
    this.listeners.push({type: type, closure: closure, thisArgument: thisArgument});

  }, 

  removeListener: function(type, closure) {
    var i;

    for (i = 0; i < this.listeners.length; i++) {
      if (this.listeners[i].type === type && this.listeners[i].closure === closure) {
        this.listeners.splice(i, 1);
      }
    }
  },

  dispatchEvent: function(event) {
    var i;

    this.latestEvent = event;

    for (i = 0; i < this.listeners.length; i++) {
      if (this.listeners[i].type === event.type) {
        this.listeners[i].closure.call(this.listeners[i].thisArgument, event);
      }
    }
  },

  onMouseDown: function(event) {
    var coordinates = getRelativeCoordinates(event, $("editor"));

    var myEvent = new Event("mouseDown");
        myEvent.parameter = event;
        myEvent.mouseX = coordinates.x;
        myEvent.mouseY = coordinates.y;

    this.dispatchEvent(myEvent);

    this.state = {type: "down", x: coordinates.x, y: coordinates.y};

    var myScope = this;
    
    this.clickTimeoutID = setTimeout(
      
      function(coordinates, event) {
        myScope.onClickTimeout(coordinates, event);
      },
       
      this.clickTime, coordinates, event
    );
  }, 

  onMouseUp: function(event) {
    
    if (this.clickTimeoutID) {
      clearTimeout(this.clickTimeoutID);
      this.clickTimeoutID = null;
    }

    var type;

    if (this.state.type === "drag") {
      
      type = "stopDrag";
      
    } else if (this.state.type === "down") {
      
      type = "click";
      
    }

    var coordinates = getRelativeCoordinates(event, $("editor"));

    var myEvent = new Event(type);
        myEvent.parameter = event;
        myEvent.mouseX = coordinates.x;
        myEvent.mouseY = coordinates.y;

    this.state.type = "up";

    this.dispatchEvent(myEvent);
  },

  onMouseMove: function(event) {
    
    var coordinates = getRelativeCoordinates(event, $("editor"));
    
    var myEvent = new Event("mouseMove");
        myEvent.parameter = event;
        myEvent.mouseX = coordinates.x;
        myEvent.mouseY = coordinates.y;

    this.dispatchEvent(myEvent);

    if (this.state.type !== "up") {
      
      myEvent.type = "drag";
      this.dispatchEvent(myEvent);
      
    }

    if (this.state.type === "down") {
      var distance = (function(oldX, oldY, newX, newY) {
        
        var x = newX - oldX;
        var y = newY - oldY;

        return Math.sqrt(x * x + y * y);
      }(this.state.x, this.state.y, coordinates.x, coordinates.y));

      if (distance > 5) {
        
        this.onClickTimeout({x: this.state.x, y: this.state.y});

      }
    }
  },

  onClickTimeout: function(coordinates, event) {

    if (this.state.type !== "down") {
      return;
    }

    this.clickTimeoutID = null;

    this.state.type = "drag";

    var myEvent = new Event("startDrag");
        myEvent.parameter = event;
        myEvent.mouseX = coordinates.x;
        myEvent.mouseY = coordinates.y;

    this.dispatchEvent(myEvent);
  }

});