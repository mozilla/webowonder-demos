var Toolbox = Class.create(Grid, {
  
  initialize: function($super) {
    $super();

    this.rows = 15;
    this.cols = 3;

    this.width = Brick.SIZE * this.cols;
    this.height = Brick.SIZE * this.rows;
    
    this.brickCounter = 0;

  },

  addBrick: function(klass) {
    var brick = new klass();

    brick.cell = {row: this.brickCounter * 2 + 1, col: 1};
    brick.parent = this;

    this.dropBrickAt(brick, brick.cell);
    this.brickCounter++;
    
    if (brick.pairType) {
      var pairBrick = new klass();
      pairBrick.parent = this;
      
      pairBrick.setRotation(Math.PI);
      pairBrick.cell = brick.cell;
      this.bricks.push(pairBrick);
      
      brick.partner = pairBrick;
    }
    
    return brick;

  },
  
  addPreviewBrick: function(klass) {
    var brick = this.addBrick(klass);
    brick.isDraggable = false;
    brick.isPreview = true;
    
    if (brick.partner) {
      
      brick.partner.isDraggable = false;
      brick.partner.isPreview = true;
      
    }
  },
  
  onClick: function(mouseX, mouseY) {
    var cell = this.getCell(mouseX, mouseY),
        brick = this.getBrickAt(cell);

    if (brick && brick.isDraggable && this.parent.selectElement && this.parent.selectElement.brick === brick) {

      brick.rotate(Math.PI / 2);
      this.renderNew = true;
      
      if (brick.partner) {
        
        brick.partner.rotate(Math.PI / 2);
        
      }

    }

    this.select(cell);
  },

  onStartDrag: function(mouseX, mouseY) {
    var cell = this.getCell(mouseX, mouseY),
        brick = this.getBrickAt(cell);
    
    if (brick && brick.isDraggable) {

      var dragBrick = new (eval(brick.type))();
          dragBrick.rotation = brick.rotation;
          
      this.parent.dragBrick(dragBrick);
      
    }
    
    this.select(cell);
  },

  select: function(cell) {
    var brick = this.getBrickAt(cell),
        box = null;

    box = this.getCellBox(cell);
    
    if (brick && brick.isDraggable) {
      
      box.brick = brick;
      
    }
    
    this.parent.selectElement = box;
  }

});
