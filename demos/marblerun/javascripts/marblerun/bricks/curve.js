var Curve = new Class.create(Brick, {

  drawShape: function(context) {

    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(Brick.SIZE / 2, 0,  Brick.SIZE, Brick.SIZE / 2, Brick.SIZE, Brick.SIZE);
    context.lineTo(0, Brick.SIZE);
    context.lineTo(0, 0);
    context.closePath();
     
    context.fill();
      
    context.clearShadow();

    context.stroke();

  },

  createShapes: function(body) {
    var shapeDefinition = new b2PolygonDef(),
      angle = Math.PI / 2 / 6,
      i, j;

    shapeDefinition.vertexCount = 8;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    shapeDefinition.vertices[0].Set(-0.5, 0.5);

    for (i = 6, j = 0; i >= 0; i--, j++) {
      shapeDefinition.vertices[j].Set(Math.cos(angle * i) - 0.5, -Math.sin(angle * i) + 0.5);
    }

    shapeDefinition.vertices[7].Set(-0.5, 0.5);

    body.CreateShape(shapeDefinition);
    
  }

});

Curve.prototype.type = "Curve";