var Brick = Class.create(DisplayObject, {
  
  initialize: function($super) {
    $super();

    this.x = 0;
    this.y = 0;
    
    this.rotation = 0;
    this.targetRotation = 0;
    this.rotateID = null;
    
    this.isVisible = true;
    this.isDraggable = true;
    this.isRemoveable = true;
    
    this.isPreview = false;
    this.isInFront = true;
    this.isDynamic = false;
    this.hasShadow = true;

    this.cell = {
      row: 0,
      col: 0
    };
  },
  
  update: function() {
    
  },

  draw: function(context) {
    
    if (this.isVisible) {

      if (this.rotation !== 0) { 
        this.applyRotation(context);
      }

      if (context.drawShadows && this.hasShadow && !this.isPreview) {
        this.applyShadow(context);
      }
      
      if (this.isPreview) {
        
        context.globalAlpha = .3;
        
      }

      this.drawShape(context);
      
      if (this.isPreview) {
        
        this.applyStyle(context);
        
      }

      if (this.rotateID) {
        this.applyClearing(context);
      }

      context.beginPath();

    }
  },

  reset: function() {
    
  },

  drawShape: function(context) {

    context.fillRect(0, 0, Brick.SIZE, Brick.SIZE);
    
    context.clearShadow();

    context.strokeRect(0, 0, Brick.SIZE, Brick.SIZE);

  },
  
  applyStyle: function(context) {
    
    context.fillStyle = Brick.FILL;
    context.strokeStyle = Brick.STROKE;
    
    context.lineJoing = "miter";
    context.lineWidth = 1;
    
  },

  applyShadow: function(context) {

    var shadowOffset = new b2Vec2(Math.cos(Math.PI / 4) * -Brick.SIZE / 4, Math.sin(Math.PI / 4) * Brick.SIZE / 4);
    
    // global
    if (shadowOffsetGetsTransformed) {
      
      shadowOffset = this.rotateVector(shadowOffset, -this.rotation);
      
    }

    context.shadowOffsetX = shadowOffset.x;
    context.shadowOffsetY = shadowOffset.y;

    context.shadowBlur = 5;
    context.shadowColor = "rgba(0, 0, 0, 0.5)";

  },

  applyScale: function(context) {
    
    context.translate(Brick.SIZE / 2, Brick.SIZE / 2);
    context.scale(1.1, 1.1);
    context.translate(- Brick.SIZE / 2, - Brick.SIZE / 2);

  },

  applyRotation: function(context) {

    context.translate(Brick.SIZE / 2, Brick.SIZE / 2);
    context.rotate(this.rotation);
    context.translate(- Brick.SIZE / 2, - Brick.SIZE / 2);

  },
  
  applyClearing: function(context) {
    
    var clearRectangle = new Rectangle(
      this.x - Brick.SIZE * 0.4, this.y - Brick.SIZE * 0.2, 
      Brick.SIZE * 1.6, Brick.SIZE * 1.6
    );
    
    context.addClearRectangle(clearRectangle);
  },

  drawGlobal: function(context) {

    var storeSize = Brick.SIZE;
    Brick.SIZE = Brick.BIG_SIZE;

    context.save();

      context.translate(this.x, this.y);
      this.applyStyle(context);
      this.draw(context);

    context.restore();

    this.applyClearing(context);

    Brick.SIZE = storeSize;
  },

  createBody: function(world) {
    var bodyDefinition = new b2BodyDef();

    bodyDefinition.position.Set(this.cell.col + 0.5, this.cell.row + 0.5);

    this.body = world.CreateBody(bodyDefinition);

    this.createShapes(this.body);

    this.body.SetMassFromShapes();
    
    this.setRotation(this.rotation);
  },
  
  createShapes: function(body) {
    
    var shapeDefinition = new b2PolygonDef();
    
    shapeDefinition.SetAsBox(0.5, 0.5);
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    body.CreateShape(shapeDefinition);
    
  },
  
  removeBody: function(world) {
    
    var bodyCount = world.m_bodyCount;

    world.DestroyBody(this.body);

    if (bodyCount === world.m_bodyCount) {
      //console.error("Body was not removed");
    }
    
  },
  
  moveToCell: function(cell) {
    
    this.cell = cell;
    
    if (this.body) {
    
      this.body.SetXForm(new b2Vec2(cell.col + 0.5, cell.row + 0.5), this.body.GetAngle());
    
    }
  },

  rotate: function(radian) {
    
    if (this.rotateID) {
      
      clearTimeout(this.rotateID);
      
      this.targetRotation += radian;
    
    } else {
    
      this.storedDynamic = this.isDynamic;
      this.isDynamic = true;
    
      this.parent.renderNew = true;
    
      this.targetRotation = this.rotation + radian;
      
    }
    
    var myScope = this;
    
    this.rotateID = setTimeout(function() {
      myScope.rotateTimeout();
    }, 30);
    
  },
  
  rotateTimeout: function() {
    
    this.rotation += (this.targetRotation - this.rotation) / 3;
    //this.rotation += 0.3;

    if (Math.abs(this.rotation - this.targetRotation) < 0.03) {
    //if (this.targetRotation - this.rotation < 0.03) {

      this.rotateStop();

    } else {

      var myScope = this;

      this.rotateID = setTimeout(function() {
        myScope.rotateTimeout();
      }, 30);
      
    }
    
  }, 
  
  rotateStop: function() {
    
    this.setRotation(this.targetRotation);
    
    this.isDynamic = this.storedDynamic;
    
    this.parent.renderNew = true;
    
    this.rotateID = null;
    
  },
  
  setRotation: function(radian) {
    
    if (this.body) {

      this.body.SetXForm(this.body.GetPosition(), radian);

      this.rotation = this.body.GetAngle();

    } else {

      this.rotation = radian;

    }
    
  },
  
  rotateVector: function(vector, angle) {
    return new b2Vec2(
      vector.x * Math.cos(angle) - vector.y * Math.sin(angle),
      vector.x * Math.sin(angle) + vector.y * Math.cos(angle)
    );
  }

});

Brick.SIZE = 28;
Brick.BIG_SIZE = 32;
Brick.TINY_SIZE = 12;

Brick.FILL = "#1E1E1E";
Brick.STROKE = "#F2E049";

Brick.prototype.type = "Brick";
