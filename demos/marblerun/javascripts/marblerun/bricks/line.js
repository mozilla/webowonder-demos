var Line = Class.create(Brick, {

  drawShape: function(context) {

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(Brick.SIZE, 0);
    context.lineTo(Brick.SIZE, Brick.SIZE / 7);
    context.lineTo(0, Brick.SIZE / 7);
    context.lineTo(0, 0);
    context.closePath();
  
    context.fill();
      
    context.clearShadow();

    context.stroke();

  },

  createShapes: function(body) {
    var shapeDefinition = new b2PolygonDef(),
        horizAlign = 0.01,
        vertAlign = 0.001;

    shapeDefinition.vertexCount = 8;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    shapeDefinition.vertices[0].Set(-0.5, -0.5 + vertAlign);
    shapeDefinition.vertices[1].Set(-0.5 + horizAlign, -0.5);
    
    shapeDefinition.vertices[2].Set(0.5 - horizAlign, -0.5);
    shapeDefinition.vertices[3].Set(0.5, -0.5 + vertAlign);
    
    shapeDefinition.vertices[4].Set(0.5, -0.5 + 0.125 - vertAlign);
    shapeDefinition.vertices[5].Set(0.5 - horizAlign, -0.5 + 0.125);
    
    shapeDefinition.vertices[6].Set(-0.5 + horizAlign, -0.5 + 0.125);
    shapeDefinition.vertices[7].Set(-0.5, -0.5 + 0.125 - vertAlign);

    body.CreateShape(shapeDefinition);

  }

});

Line.prototype.type = "Line";