var OneWay = Class.create(Line, {
  
  initialize: function($super) {
    
    $super();
    
    this.isActive = false;
    
  },
  
  reset: function() {
    
    this.isActive = false;
    
  },

  drawShape: function($super, context) {
    
    $super(context);
    
    context.beginPath();
    context.moveTo(Brick.SIZE / 2, Brick.SIZE * 7 / 20);
    context.lineTo(Brick.SIZE * 7 / 10, Brick.SIZE * 13 / 20);
    context.lineTo(Brick.SIZE * 3 / 10, Brick.SIZE * 13 / 20);
    context.closePath();
    
    context.fill();

  },

  createShapes: function($super, body) {
    
    $super(body);
    
    var shapeDefinition = new b2PolygonDef();

    shapeDefinition.vertexCount = 4;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    shapeDefinition.vertices[0].Set(-1.5, -0.45);
    shapeDefinition.vertices[1].Set(1.5, -0.45);
    shapeDefinition.vertices[2].Set(1.5, 0);
    shapeDefinition.vertices[3].Set(-1.5, 0);

    shapeDefinition.isSensor = true;

    // collides only with ball
    shapeDefinition.filter.maskBits = 0x0002;

    body.CreateShape(shapeDefinition);
    
    var myScope = this;
    
    body.beforeCollision = function(shape1, shape2) {
      return myScope.beforeCollision(shape1, shape2);
    };

    body.onCollision = function(contact) {
      myScope.onCollision(contact);
    };

    body.afterCollision = function(contact) {
      myScope.afterCollision(contact);
    };
  },

  removeBody: function($super, world) {
    $super(world);

  },
  
  beforeCollision: function(shape1, shape2) {
    
    if (shape1.GetBody().ballInstance && this.isActive) {
        
      return false;
      
    } else if (shape2.GetBody().ballInstance && this.isActive) {
        
      return false;
      
    }
    
    return true;
    
  },

  onCollision: function(contact) {

    if (contact.shape1.GetBody().ballInstance && contact.shape2.m_isSensor) {

      this.isActive = true;
      
    } else if (contact.shape2.GetBody().ballInstance && contact.shape1.m_isSensor) {
        
      this.isActive = true;
      
    }

  },

  afterCollision: function(contact) {
    
    if (contact.shape1.GetBody().ballInstance && contact.shape2.m_isSensor) { 
        
      this.isActive = false;
      
    } else if (contact.shape2.GetBody().ballInstance && contact.shape1.m_isSensor) {
        
      this.isActive = false;

    }

  }

});

OneWay.prototype.type = "OneWay";