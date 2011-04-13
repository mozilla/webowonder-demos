var Ball = Class.create(Brick, {
  
  initialize: function($super) {
    $super();
    
    this.impulseVector = new b2Vec2();
    this.positionVector = new b2Vec2();
    this.velocityVector = new b2Vec2();
    
    this.rollLength = 0;
    this.lastPosition = new b2Vec2();

    this.isDraggable = false;
    this.isRemoveable = false;
    
    this.isDynamic = true;
    this.hasShadow = false;
  },
  
  update: function() {
    
    if (this.impulseVector.Length() > 0) {
      
      this.body.ApplyImpulse(this.impulseVector, this.body.GetPosition());
      this.impulseVector.Set(0, 0);
      
    }
    
    if (this.positionVector.Length() > 0) {
      
      this.body.SetXForm(this.positionVector, this.body.GetAngle());
      this.body.SetLinearVelocity(this.velocityVector);
      
      this.lastPosition.Set(this.positionVector.x, this.positionVector.y);
      this.positionVector.Set(0, 0);
      
    }
    
    var difference = this.minus(this.lastPosition, this.body.GetPosition());
    this.rollLength += difference.Length();
    
    this.lastPosition.Set(this.body.GetPosition().x, this.body.GetPosition().y);
    
    if (this.rollLength > 9999) {
      this.rollLength = 9999;
    }
    
    $('lengthDisplay').update(this.getFormatString(this.rollLength));
    this.parent.trackLength = this.rollLength / 10;
    
  },
  
  minus: function(a, b) {
    return new b2Vec2(
      a.x - b.x,
      a.y - b.y
    );
  },
  
  getFormatString: function(number) {
    
    number = parseInt(number, 10).toString();
    
    while (number.length < 4) {
      number = "0" + number;
    }
    
    return number.toString();
  },
  
  reset: function() {
    this.rollLength = 0;
    
    this.lastPosition.Set(this.cell.col + 0.5, this.cell.row + 0.5);
    
    this.body.SetXForm(this.lastPosition, 0);
    
    this.body.SetLinearVelocity({x: 0, y: 0});
    this.body.SetAngularVelocity(0);
    
    this.impulseVector.Set(0, 0);
  },

  drawShape: function(context) {
    
    var position;
    
    if (this.body) {
    
      position = this.body.GetPosition();
      
      var x = this.x + (position.x - this.cell.col - Ball.radius) * Brick.SIZE,
          y = this.y + (position.y - this.cell.row - Ball.radius) * Brick.SIZE;

      context.addClearRectangle(new Rectangle(x, y, Ball.radius * 2 * Brick.SIZE, Ball.radius * 2 * Brick.SIZE));
      
    } else {
      
      position = { 
        x: this.cell.col + 0.5, 
        y: this.cell.row + 0.5
      };
      
    }

    context.save();

      context.translate((position.x - this.cell.col) * Brick.SIZE, (position.y - this.cell.row) * Brick.SIZE);
      
      if (this.body) {
        context.rotate(this.body.GetAngle());
      }
      
      context.fillStyle = "#800000";
      
      context.beginPath();
      context.arc(0, 0, Ball.radius * Brick.SIZE, 0, Math.PI * 2, true);
      context.lineTo(Ball.radius * Brick.SIZE, 0);
      
      context.fill();

    context.restore();

  },

  createShapes: function(body) {
    var shapeDefinition = new b2CircleDef();

    shapeDefinition.radius = Ball.radius;
    shapeDefinition.restitution = 0;
    shapeDefinition.density = 2;
    shapeDefinition.friction = 0.9;

    shapeDefinition.filter.categoryBits = 0x0002;

    body.CreateShape(shapeDefinition);
    body.SetMassFromShapes();
    
    body.ballInstance = this;

  },
  
  rotate: function() {
    return;
  }
  
});

Ball.prototype.type = "Ball";

Ball.radius = 0.25;