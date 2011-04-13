Grid = Class.create(DisplayObject, {

  initialize: function($super) {
    $super();

    this.rows = 0;
    this.cols = 0;

    this.bricks = [];
    
    this.renderNew = false;
    
    this.renderStatics = false;
    this.renderDynamics = false;
  },

  draw: function(context) {
    
    this.drawStatics(context);
    this.drawDynamics(context);

  },
  
  drawStatics: function(context) {

    this.renderNew = false;

    this.setClipping(context);

      context.translate(this.x, this.y);

      this.drawStaticElements(context);

      this.drawFrame(context);

    this.releaseClipping(context);
    
  },
  
  drawDynamics: function(context) {
    this.setClipping(context);

      context.translate(this.x, this.y);

      this.renderDynamics = true;

      context.drawShadows = true;
      this.drawElements(context, true);

      this.renderDynamics = false;

    this.releaseClipping(context);
  },

  setClipping: function(context) {

    context.save();

    context.translate(0.5, 0.5);

      context.beginPath();
      context.moveTo(this.x - 2, this.y - 2);
      context.lineTo(this.x + this.width, this.y - 2);
      context.lineTo(this.x + this.width, this.y + this.height);
      context.lineTo(this.x - 2, this.y + this.height);
      context.closePath();

    context.translate(-0.5, -0.5);

    context.clip();
    
  },

  releaseClipping: function(context) {
    context.restore();
  },

  drawFrame: function(context) {
    
    context.save();

      context.translate(-0.5, -0.5);

      context.strokeStyle = "#2D2D2D";
      context.lineWidth = 2;

      context.strokeRect(0, 0, this.width, this.height);

    context.restore();

  },

  drawGrid: function (context) {

    context.strokeStyle = "#000000";
    context.lineWidth = 0.5;

    var i;
    
    for (i = 1; i < this.rows; i++) {
      
      context.beginPath();
      context.dashedLine(0, i * Brick.SIZE, this.cols * Brick.SIZE, i * Brick.SIZE, 3);
      context.closePath();
      
      context.stroke();

    }

    for (i = 1; i < this.cols; i++) {
      
      context.beginPath();
      context.dashedLine(i * Brick.SIZE, 0,  i * Brick.SIZE, this.rows * Brick.SIZE, 3);
      context.closePath();
      
      context.stroke();

    }

    context.beginPath();

  },

  drawFieldShadow: function(context) {

    context.save();

      context.beginPath();
      context.moveTo(- 10, 0);
      context.lineTo(this.width, 0);
      context.lineTo(this.width, this.height);
      context.lineTo(this.width + 10, this.height);
      context.lineTo(this.width + 10, - 10);
      context.lineTo(- 10, - 10);
      context.closePath();

      context.shadowOffsetX = -6;
      context.shadowOffsetY = 6;
      context.shadowBlur = 5;
      context.shadowColor = "rgba(0, 0, 0, 0.4)";

      context.fill();
    
    context.restore();

  },
  
  drawStaticElements: function(context) {
    
    // context.fillStyle = Pattern.fieldBackground;
    // context.fillRect(0, 0, this.width, this.height);
    
    this.drawGrid(context);
    this.drawFieldShadow(context);

    this.renderStatics = true;

    context.drawShadows = true;
    this.drawElements(context);

    context.drawShadows = false;
    this.drawElements(context);

    this.renderStatics = false;
    
  },

  drawElements: function(context) {

    if (this.bricks.length === 0) {
      return;
    }
    
    this.bricks[0].applyStyle(context);

    var i;

    for (i = 0; i < this.bricks.length; i++) {
      if ((this.bricks[i].isDynamic && this.renderDynamics) || 
          (!this.bricks[i].isDynamic && this.renderStatics)) {
      
        context.save();

          context.translate(this.bricks[i].cell.col * Brick.SIZE, this.bricks[i].cell.row * Brick.SIZE);
          this.bricks[i].draw(context);

        context.restore();
      }
    }

  },

  getCell: function(x, y) {
    if (x > 0 && y > 0 && x < this.width && y < this.height) {
      return {
        row: parseInt(y / Brick.SIZE, 10), 
        col: parseInt(x / Brick.SIZE, 10)
      };
    }
    
    return null;
  },
  
  checkCell: function(cell) {
    return (cell && cell.row >= 0 && cell.row < this.rows && cell.col >= 0 && cell.col < this.cols);
  },
  
  getCellBox: function(cell) {
    if (!this.checkCell(cell)) {
      return null;
    }
    
    return new Rectangle(
      this.x + cell.col * Brick.SIZE, this.y + cell.row * Brick.SIZE,
      Brick.SIZE, Brick.SIZE
    );
  },

  getBrickAt: function(cell) {
    var i;
    
    if (this.checkCell(cell)) {
      for (i = 0; i < this.bricks.length; i++) {
        if (this.bricks[i].cell.row === cell.row && this.bricks[i].cell.col === cell.col) {
          return this.bricks[i];
        }
      }
    }

    return null;
  },

  removeBrickAt: function(cell) {
    if (!this.checkCell(cell)) {
      return false;
    }
    
    var i;

    for (i = 0; i < this.bricks.length; i++) {
      
      if (this.bricks[i].cell.row === cell.row && this.bricks[i].cell.col === cell.col) {
          
        this.bricks.splice(i, 1);
        
        this.renderNew = true;
        
        return true;
      }
    }

    return true;
  },

  dropBrickAt: function(brick, cell) {
    
    if (!this.checkCell(cell)) {
      return false;
    }
    
    brick.cell = cell;
    
    return this.insertBrick(brick);
  },
  
  insertBrick: function(brick) {
    
    brick.parent = this;
    
    if (!this.removeBrickAt(brick.cell)) {
      return false;
    }
    
    brick.x = this.x + brick.cell.col * Brick.SIZE;
    brick.y = this.y + brick.cell.row * Brick.SIZE;
    
    brick.width = brick.height = Brick.SIZE;
    
    if (brick.isInFront) {
      
      this.bricks.push(brick);
      
    } else {
      
      this.bricks.unshift(brick);
      
    }
    
    this.renderNew = true;
    
    return true;
  }

});