var Beamer = new Class.create(Brick, {
  
  initialize: function($super) {
    $super();
    
    this.partner = null;
    this.hasBeamed = false;
  },
  
  reset: function() {
    
    this.hasBeamed = false;
    
  },

  drawShape: function(context) {

    context.beginPath();

    context.moveTo(0, Brick.SIZE / 2);
    context.lineTo(Brick.SIZE / 5, Brick.SIZE / 2);
    
    context.bezierCurveTo(
      Brick.SIZE / 5, Brick.SIZE * 9 / 10, 
      Brick.SIZE * 4 / 5, Brick.SIZE * 9 / 10, 
      Brick.SIZE * 4 / 5, Brick.SIZE / 2
    );
    
    context.lineTo(Brick.SIZE, Brick.SIZE / 2);
    context.lineTo(Brick.SIZE, Brick.SIZE);
    context.lineTo(0, Brick.SIZE);
    
    context.closePath();
    
    context.fill();
    
    context.clearShadow();
    
    context.stroke();
  },

  createShapes: function(body) {
    var rect1Definition = new b2PolygonDef();

    rect1Definition.vertexCount = 3;
    rect1Definition.restitution = 0;
    rect1Definition.friction = 0.9;

    rect1Definition.vertices[0].Set(-0.5, 0);
    rect1Definition.vertices[1].Set(0.2, 0.5);
    rect1Definition.vertices[2].Set(-0.5, 0.5);
    
    body.CreateShape(rect1Definition);
    
    var rect2Definition = new b2PolygonDef();

    rect2Definition.vertexCount = 3;
    rect2Definition.restitution = 0;
    rect2Definition.friction = 0.9;

    rect2Definition.vertices[0].Set(0.5, 0);
    rect2Definition.vertices[1].Set(0.5, 0.5);
    rect2Definition.vertices[2].Set(-0.2, 0.5);
    
    body.CreateShape(rect2Definition);
    
    var sensorDefinition = new b2PolygonDef();

    sensorDefinition.vertexCount = 3;
    sensorDefinition.restitution = 0;
    sensorDefinition.friction = 0.9;

    sensorDefinition.vertices[0].Set(0, 0);
    sensorDefinition.vertices[1].Set(0.2, 0.2);
    sensorDefinition.vertices[2].Set(-0.2, 0.2);
    
    sensorDefinition.isSensor = true;
    
    // collides only with ball
    sensorDefinition.filter.maskBits = 0x0002;
    
    body.CreateShape(sensorDefinition);

    var myScope = this;

    body.onCollision = function(contact) {
      myScope.onCollision(contact);
    };
    
    body.afterCollision = function(contact) {
      myScope.afterCollision(contact);
    };
    
    this.divorce();
  },
  
  removeBody: function($super, world) {
    $super(world);
    
    if (this.partner) {
      
      this.partner.divorce();
      this.partner = null;
      
    } else if (this.parent.singles[this.pairType] === this) {
      
      this.parent.singles[this.pairType] = null;
      
    }
    
  },
  
  divorce: function() {
    
    this.partner = null;
    this.parent.findPartner(this);
    
  },

  onCollision: function(contact) {
    
    var ball;

    if (contact.shape1.m_isSensor) {
      
      ball = contact.shape2.GetBody().ballInstance;
      
    } else if (contact.shape2.m_isSensor) {
      
      ball = contact.shape1.GetBody().ballInstance;
      
    } else {
      
      return;
      
    }
    
    if (this.partner && !this.hasBeamed) {
      
      var positionOffset = this.rotateVector(new b2Vec2(0, -0.1), this.partner.rotation);
      
      ball.positionVector.Set(this.partner.cell.col + 0.5 + positionOffset.x, this.partner.cell.row + 0.5 + positionOffset.y);
      
      positionOffset.Multiply(10);
      positionOffset.Multiply(ball.body.GetLinearVelocity().Length());
      ball.velocityVector = positionOffset;
      
      //ball.velocityVector = this.rotateVector(ball.body.GetLinearVelocity(), this.partner.rotation - this.rotation + Math.PI);
      
      this.hasBeamed = this.partner.hasBeamed = true;
    }
  },
  
  afterCollision: function(contact) {
    
    if (this.hasBeamed && this.partner &&
      (contact.shape1.GetBody().ballInstance || contact.shape2.GetBody().ballInstance)) {
      
      this.hasBeamed = this.partner.hasBeamed = false;
    }
  }

});

Beamer.prototype.type = "Beamer";
Beamer.prototype.pairType = "Beamer";