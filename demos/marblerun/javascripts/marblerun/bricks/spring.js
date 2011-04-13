var Spring = new Class.create(Brick, {

  drawShape: function(context) {
    
    context.strokeStyle = context.fillStyle;
    context.lineWidth = 2;

    context.beginPath();
    
    context.moveTo(Brick.SIZE / 5, Brick.SIZE * 0.22);
    context.lineTo(Brick.SIZE * 4 / 5, Brick.SIZE * 0.07);
    
    context.moveTo(Brick.SIZE / 5, Brick.SIZE * 0.37);
    context.lineTo(Brick.SIZE * 4 / 5, Brick.SIZE * 0.22);
    
    context.moveTo(Brick.SIZE / 5, Brick.SIZE * 0.52);
    context.lineTo(Brick.SIZE * 4 / 5, Brick.SIZE * 0.37);
        
    context.stroke();
    
    
    context.fillRect(0, 0, Brick.SIZE, Brick.SIZE / 8);
    context.fillRect(0, Brick.SIZE / 2, Brick.SIZE, Brick.SIZE / 2);
    
    context.clearShadow();
    
    this.applyStyle(context);
    
    context.strokeRect(0, 0, Brick.SIZE, Brick.SIZE);
    
  },

  createBody: function($super, world) {
    
    $super(world);

    var myScope = this;

    this.body.onCollision = function(contact) {
      myScope.onCollision(contact);
    };
  },

  onCollision: function(contact) {
    var ball;
    
    if (contact.shape1.GetBody().ballInstance) {
      
      ball = contact.shape1.GetBody().ballInstance;
      
    } else if (contact.shape2.GetBody().ballInstance) {
      
      ball = contact.shape2.GetBody().ballInstance;
      
    } else {
      
      return;
      
    }
    
    var bodyPoint = this.body.GetPosition();
    var relativeContactPoint = new b2Vec2(
      contact.position.x - bodyPoint.x, 
      contact.position.y - bodyPoint.y
    );
    var contactPoint = this.rotateVector(relativeContactPoint, -this.body.GetAngle());
    
    if (contactPoint.x > - 0.5 && contactPoint.x < 0.5 && contactPoint.y > - 0.6 && contactPoint.y < - 0.4) {
    
      var springVector = new b2Vec2(0, -6);
    
      ball.impulseVector.Add(this.rotateVector(springVector, this.body.GetAngle()));
    }

  }

});

Spring.prototype.type = "Spring";