var Boost = new Class.create(Brick, {
  
  initialize: function($super) {
    $super();

    this.isInFront = false;
    this.hasShadow = false;
  },

  drawShape: function(context) {
    
    // context.beginPath();
    // context.moveTo(Brick.SIZE / 7, Brick.SIZE / 7);
    // context.lineTo(Brick.SIZE * 2 / 7, Brick.SIZE / 7);
    // context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE / 2);
    // context.lineTo(Brick.SIZE * 2 / 7, Brick.SIZE * 6 / 7);
    // context.lineTo(Brick.SIZE / 7, Brick.SIZE * 6 / 7);
    // context.lineTo(Brick.SIZE * 3 / 7, Brick.SIZE / 2);
    // context.closePath();
    // 
    // context.fill();
    // 
    // context.beginPath();
    // context.moveTo(Brick.SIZE * 3 / 7, Brick.SIZE / 7);
    // context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE / 7);
    // context.lineTo(Brick.SIZE * 6 / 7, Brick.SIZE / 2);
    // context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE * 6 / 7);
    // context.lineTo(Brick.SIZE * 3 / 7, Brick.SIZE * 6 / 7);
    // context.lineTo(Brick.SIZE * 5 / 7, Brick.SIZE / 2);
    // context.closePath();
    // 
    // context.fill();
    
    context.beginPath();
    context.moveTo(Brick.SIZE / 7, Brick.SIZE * 3 / 14);
    context.lineTo(Brick.SIZE * 2 / 7, Brick.SIZE * 3 / 14);
    context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE / 2);
    context.lineTo(Brick.SIZE * 2 / 7, Brick.SIZE * 11 / 14);
    context.lineTo(Brick.SIZE / 7, Brick.SIZE * 11 / 14);
    context.lineTo(Brick.SIZE * 3 / 7, Brick.SIZE / 2);
    context.closePath();
    
    context.fill();
    
    context.beginPath();
    context.moveTo(Brick.SIZE * 3 / 7, Brick.SIZE * 3 / 14);
    context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE * 3 / 14);
    context.lineTo(Brick.SIZE * 6 / 7, Brick.SIZE / 2);
    context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE * 11 / 14);
    context.lineTo(Brick.SIZE * 3 / 7, Brick.SIZE * 11 / 14);
    context.lineTo(Brick.SIZE * 5 / 7, Brick.SIZE / 2);
    context.closePath();
    
    context.fill();
    
    // context.strokeStyle = context.fillStyle;
    // context.lineWidth = 2;
    // 
    // context.beginPath();
    // 
    // context.moveTo(Brick.SIZE / 5, Brick.SIZE / 5);
    // context.lineTo(Brick.SIZE * 2 / 5, Brick.SIZE / 2);
    // context.lineTo(Brick.SIZE / 5, Brick.SIZE * 4 / 5);
    // 
    // context.moveTo(Brick.SIZE * 2 / 5, Brick.SIZE / 5);
    // context.lineTo(Brick.SIZE * 3 / 5, Brick.SIZE / 2);
    // context.lineTo(Brick.SIZE * 2 / 5, Brick.SIZE * 4 / 5);
    // 
    // context.moveTo(Brick.SIZE * 3 / 5, Brick.SIZE / 5);
    // context.lineTo(Brick.SIZE * 4 / 5, Brick.SIZE / 2);
    // context.lineTo(Brick.SIZE * 3 / 5, Brick.SIZE * 4 / 5);
    // 
    // context.stroke();
  },

  createShapes: function(body) {
    var shapeDefinition = new b2PolygonDef();

    shapeDefinition.vertexCount = 4;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    shapeDefinition.vertices[0].Set(-0.4, -0.4);
    shapeDefinition.vertices[1].Set(0.4, -0.4);
    shapeDefinition.vertices[2].Set(0.4, 0.4);
    shapeDefinition.vertices[3].Set(-0.4, 0.4);

    shapeDefinition.isSensor = true;

    // collides only with ball
    shapeDefinition.filter.maskBits = 0x0002;

    body.CreateShape(shapeDefinition);

    var myScope = this;

    body.whileCollision = function(contact) {
      myScope.whileCollision(contact);
    };
  },

  whileCollision: function(contact) {
    
    var ball;

    if (contact.shape1.GetBody().ballInstance) {
      
      ball = contact.shape1.GetBody().ballInstance;
      
    } else {
      
      ball = contact.shape2.GetBody().ballInstance;
      
    }

    var boostVector = new b2Vec2(.3, 0);
    
    ball.impulseVector.Add(this.rotateVector(boostVector, this.body.GetAngle()));

  }

});

Boost.prototype.type = "Boost";