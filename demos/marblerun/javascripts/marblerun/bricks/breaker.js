var Breaker = new Class.create(Brick, {

  initialize: function($super) {
    $super();
    
    this.bodies = null;
    this.isBroken = false;
    
    this.timeoutID = 0;
    this.isDynamic = false;
    this.hasShadow = true;
    
    this.generateShapes();
  },

  reset: function() {
    
    this.isDynamic = false;
    this.isBroken = false;
    
    if (this.timeoutID) {
      
      clearTimeout(this.timeoutID);
      this.timeoutID = 0;
    
    }
    
    if (this.bodies) {
      
      this.removeBodies(this.world);
      
    }
    
    if (!this.body) {
      
      this.createBody(this.world);
      
    }
  },
  
  createBody: function($super, world) {
    
    this.world = world;
    
    $super(world);
    
    var myScope = this;
    
    this.body.onCollision = function(contact) {
      myScope.onCollision(contact);
    };
    
    this.body.afterCollision = function(contact) {
      myScope.afterCollision(contact);
    }
    
  },
  
  createBodies: function(world) {
    
    this.bodies = [];
    
    var i;

    for (i = 0; i < this.shapes.length; i++) {
      
      var bodyDefinition = new b2BodyDef();

      bodyDefinition.position.Set(this.cell.col + 0.5, this.cell.row + 0.5);

      var body = world.CreateBody(bodyDefinition);

      this.createShape(body, i);

      body.SetMassFromShapes();

      this.bodies.push(body);

    }
    
  },
  
  removeBody: function($super, world) {
    
    $super(world);
    
    if (this.bodies) {
      
      this.removeBodies(world);
      
    }
    
    this.body = null;
  },

  removeBodies: function(world) {

    var bodyCount = world.m_bodyCount,
        i;

    for (i = 0; i < this.bodies.length; i++) {
      world.DestroyBody(this.bodies[i]);
    }

    if (bodyCount === world.m_bodyCount) {
      console.error("Bodies were not removed");
    }
    
    this.bodies = null;

  },

  drawShape: function(context) {
    
    if (this.isBroken) {
      return;
    }
    
    var i, j, x, y, position;
    
    context.save();
  
    if (this.bodies) {
      context.clearShadow();
    }
    
    context.translate(-this.cell.col * Brick.SIZE, -this.cell.row * Brick.SIZE);

    for (i = 0; i < this.shapes.length; i++) {
  
      context.save();
        
        if (this.bodies) { 
          
          position = this.bodies[i].GetPosition();
          
        } else {
          
          position = {x: this.cell.col + 0.5, y: this.cell.row + 0.5};
          
        }
    
        context.translate(position.x * Brick.SIZE, position.y * Brick.SIZE);
        
        if (this.bodies) {
          context.rotate(this.bodies[i].GetAngle());
        }
  
        context.beginPath();

        context.moveTo(this.shapes[i][0].x * Brick.SIZE, this.shapes[i][0].y * Brick.SIZE);
      
        for (j = 1; j < this.shapes[i].length; j++) {

            context.lineTo(this.shapes[i][j].x * Brick.SIZE, this.shapes[i][j].y * Brick.SIZE);

        }
      
        context.closePath();
        
        context.fill();
        context.stroke();
  
      context.restore();
    
      if (this.bodies) {

        x = this.x + (position.x - this.cell.col - 0.7) * Brick.SIZE;
        y = this.y + (position.y - this.cell.row - 0.7) * Brick.SIZE;

        context.addClearRectangle(new Rectangle(x, y, Brick.SIZE * 1.4, Brick.SIZE * 1.4));

      }
  
    }
    
    context.restore();
    
  },
  
  createShape: function(body, index) {
    
    var shapeDefinition = new b2PolygonDef(),
        i;

    shapeDefinition.vertexCount = this.shapes[index].length;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    for (i = 0; i < this.shapes[index].length; i++) {
    
      shapeDefinition.vertices[i] = this.shapes[index][i];
    
    }

    shapeDefinition.density = 2;

    // collides only with stage not ball
    shapeDefinition.filter.maskBits = 0x0001;

    body.CreateShape(shapeDefinition);
  },
  
  onCollision: function(contact) {
    
    if (this.timeoutID && (contact.shape1.GetBody().ballInstance || contact.shape2.GetBody().ballInstance)) {
      
      clearTimeout(this.timeoutID);
      this.timeoutID = 0;
    
    }
  },

  afterCollision: function(contact) {
    if (this.isBroken) {
      return;
    }
    
    if (contact.shape1.GetBody().ballInstance || contact.shape2.GetBody().ballInstance) {

      if (this.timeoutID) {

        clearTimeout(this.timeoutID);
        this.timeoutID = 0;

      }

      var myScope = this;

      this.timeoutID = setTimeout(function() {
        myScope.onTimeout();
      }, 200);
    }
  },
  
  onTimeout: function() {
    
    this.isDynamic = true;
    this.parent.renderNew = true;
    
    this.removeBody(this.world);
    this.createBodies(this.world);
    
    this.applyImpulse();
    
    var myScope = this;
    
    this.timeoutID = setTimeout(function() {
      myScope.removeBodies(myScope.world);
      myScope.isBroken = true;
    }, 500);
    
  },
  
  applyImpulse: function() {
    
    var i;
    
    var impulseVector = new b2Vec2(0, -Math.random());
    impulseVector = this.rotateVector(impulseVector, -Math.PI / 3);
    
    for (i = 0; i < this.bodies.length; i++) {
      
      this.bodies[i].ApplyImpulse(
        impulseVector, 
        this.bodies[i].GetPosition()
      );
      
      impulseVector = this.rotateVector(impulseVector, Math.PI / 3);
    }
  },
  
  generateShapes: function() {

    this.shapes = [];

    var middlePoint = new b2Vec2((Math.random() / 2) - 0.25, (Math.random() / 2) - 0.25),
        outlinePoints = [
          new b2Vec2(-0.5, (Math.random() / 2) - 0.25),

          new b2Vec2(-0.5, -0.5),

          new b2Vec2(-Math.random() / 2, -0.501),
          new b2Vec2(Math.random() / 2, -0.501),

          new b2Vec2(0.5, -0.5),

          new b2Vec2(0.501, (Math.random() / 2) - 0.25),

          new b2Vec2(0.5, 0.5),

          new b2Vec2(Math.random() / 2, 0.501),
          new b2Vec2(-Math.random() / 2, 0.501),

          new b2Vec2(-0.501, 0.5)
        ],
        vertexNumbers = [3, 2, 3, 3, 2, 3],
        counter = 0,
        i, j;
        
    vertexNumbers.shuffle();

    for (i = 0; i < 6; i++) {

      var shape = [];

      shape.push(middlePoint);

      for (j = 0; j < vertexNumbers[i]; j++) {

        shape.push(outlinePoints[counter % 10]);

        counter++;

      }

      counter--;

      this.shapes.push(shape);
    }
  },
  
  rotate: function() {
    return;
  }

});

Breaker.prototype.type = "Breaker";