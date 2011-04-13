var Kicker = Class.create(Brick, {

  drawShape: function(context) {

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(1, 0);
    context.bezierCurveTo(1, Brick.SIZE / 2, Brick.SIZE / 2, Brick.SIZE - 1, Brick.SIZE, Brick.SIZE - 1);
    context.lineTo(Brick.SIZE, Brick.SIZE);
    context.lineTo(0, Brick.SIZE);
    context.lineTo(0, 0);
    context.closePath();
    
    context.fill();
    
    context.clearShadow();

    context.stroke();

  },

  createShapes: function(body) {
    var shapeDefinitions = [],
        numberOfSegments = 6, // must be even
        i;

    for (i = 0; i < numberOfSegments; i++) {
      shapeDefinitions[i] = new b2PolygonDef();
      shapeDefinitions[i].vertexCount = 4;
      shapeDefinitions[i].restitution = 0;
      shapeDefinitions[i].friction = 0.9;  
    }

    var angle = Math.PI / 2 / numberOfSegments;

    var circleVector = {x: -Math.cos(angle), y: Math.sin(angle)},
        lineVector = {x: -1.0, y: Math.tan(angle)};

    shapeDefinitions[0].vertexCount = 3;
    shapeDefinitions[0].vertices[0].Set(-0.5, -0.5);
    shapeDefinitions[0].vertices[1].Set(circleVector.x + 0.5, circleVector.y - 0.5);
    shapeDefinitions[0].vertices[2].Set(lineVector.x + 0.5, lineVector.y - 0.5);

    for (i = 1; i < numberOfSegments - 1; i++) {
      var newCircleVector = {x: -Math.cos((i + 1) * angle), y: Math.sin((i + 1) * angle)},
          newLineVector;

      if (i >= numberOfSegments / 2) {

        var n = numberOfSegments - i - 1;
        newLineVector = {x: -Math.tan(n * angle), y: 1.0};

      } else {

        newLineVector = {x: -1.0, y: Math.tan((i + 1) * angle)};
        
      }
      
      shapeDefinitions[i].vertices[0].Set(circleVector.x + 0.5, circleVector.y - 0.5);
      shapeDefinitions[i].vertices[1].Set(newCircleVector.x + 0.5, newCircleVector.y - 0.5);
      shapeDefinitions[i].vertices[2].Set(newLineVector.x + 0.5, newLineVector.y - 0.5);
      shapeDefinitions[i].vertices[3].Set(lineVector.x + 0.5, lineVector.y - 0.5);

      circleVector = newCircleVector;
      lineVector = newLineVector;
    }

    shapeDefinitions[numberOfSegments - 1].vertexCount = 3;
    shapeDefinitions[numberOfSegments - 1].vertices[0].Set(0.5, 0.5);
    shapeDefinitions[numberOfSegments - 1].vertices[1].Set(lineVector.x + 0.5, lineVector.y - 0.5);
    shapeDefinitions[numberOfSegments - 1].vertices[2].Set(circleVector.x + 0.5, circleVector.y - 0.5);
    
    for (i = 0; i < numberOfSegments; i++) {
      body.CreateShape(shapeDefinitions[i]);
    }

  }

});

Kicker.prototype.type = "Kicker";