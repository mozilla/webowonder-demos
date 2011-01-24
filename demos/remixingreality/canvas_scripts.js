Draw = Klass({
  initialize : function(canvas) {
    this.canvas = canvas;
    this.canvas.setAttribute('tabindex', '-1');
    this.ctx = canvas.getContext('2d');
    var self = this;
    this.canvas.onmousedown = function(ev) {
      this.focus();
    };
    this.canvas.onmouseup = function(ev) {
      if (ev.button == Mouse.LEFT) {
        this.focus();
        self.draw(ev);
      }
      Event.stop(ev);
    };
    this.canvas.onkeydown = function(ev) {
      if (Key.match(ev, [Key.DELETE, Key.BACKSPACE]))
        self.ctx.clearRect(0,0,self.canvas.width, self.canvas.height);
    }
    this.canvas.onmousemove = function(ev) {
      if (Mouse.state[Mouse.LEFT]) {
        this.focus();
        self.draw(ev);
      } else {
        self.lastPoint = null;
      }
      Event.stop(ev);
    };
  },

  draw : function(ev) {
    var p = Mouse.getRelativeCoords(this.canvas, ev);
    if (!this.lastPoint)
      this.lastPoint = {x:p.x-1, y:p.y-1};
    this.ctx.strokeStyle = 'lightblue';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.canvas.changed = true;
    this.lastPoint = p;
  }
});

TextEdit = Klass({
  initialize: function(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    var self = this;
    this.input = TEXT('Hello, world!', {
      style : { width: '100px' },
      onkeyup : function() {
        self.setText(this.value);
      },
      onfocus : function() {
        setImage(self.canvas);
      }
    });
    this.canvas.parentNode.appendChild(this.input);
    this.setText(this.input.value);
  },

  setText : function(txt) {
    if (txt == this.text) return;
    this.text = txt;
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.ctx.font = '23px Arial';
    this.ctx.fillStyle = 'black';
    this.ctx.fillText(txt,2,64);
    this.canvas.changed = true;
  }
});
