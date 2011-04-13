var Ramp = Class.create(Brick, {

  drawShape: function(context) {

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(Brick.SIZE, Brick.SIZE);
    context.lineTo(0, Brick.SIZE);
    context.lineTo(0, 0);
    context.closePath();
    
    context.fill();

    context.clearShadow();

    context.stroke();

  },

  createShapes: function(body) {
    var shapeDefinition = new b2PolygonDef();

    shapeDefinition.vertexCount = 3;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;  

    shapeDefinition.vertices[0].Set(-0.5, -0.5);
    shapeDefinition.vertices[1].Set(0.5, 0.5);
    shapeDefinition.vertices[2].Set(-0.5, 0.5);

    body.CreateShape(shapeDefinition);
    
  }
});

Ramp.prototype.type = "Ramp";