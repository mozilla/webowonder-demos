Draw = Klass({
  initialize : function(canvas) {
    this.canvas = canvas;
    this.canvas.setAttribute('tabindex', '-1');
    this.ctx = canvas.getContext('2d');
    var self = this;
    var img = new Image();
    img.onload = function() {
      self.clear();
    };
    img.src = 'i/drawing_bg.png';
    this.background = img;
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
    window.onkeydown = function(ev) {
      if (Key.match(ev, [Key.DELETE, Key.BACKSPACE])) {
        self.ctx.clearRect(0,0,self.canvas.width, self.canvas.height);
        self.ctx.drawImage(img, 0, 0, self.canvas.width, self.canvas.height);
      }
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
    this.canvas.style.cursor = 'crosshair';
    this.canvas.Draw = this;
  },

  clear : function() {
    this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height);
  },

  draw : function(ev) {
    var p = Mouse.getRelativeCoords(this.canvas, ev);
    if (!this.lastPoint)
      this.lastPoint = {x:p.x-1, y:p.y-1};
    this.ctx.strokeStyle = 'black';
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

AudioPlayer = Klass({
  sc : 1,

  initialize : function(audio) {
    var self = this;
    this.point = {x:0, y:0};
    this.lastTime = null;
    this.audio = audio;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 140;
    this.canvas.height = 140;
    audio.parentNode.insertBefore(this.canvas, audio);
    audio.style.display = 'none';
    audio.addEventListener('progress', function() {
      self.noProgress = false;
    }, false);
    audio.addEventListener('loaded', function() {
      self.noProgress = false;
    }, false);
    audio.addEventListener('durationchange', function() {
      self.noProgress = false;
    }, false);
    this.ctx = this.canvas.getContext('2d');
    this.canvas.style.cursor = 'pointer';
    this.canvas.onclick = function(ev) {
      var p = Mouse.getRelativeCoords(this, ev);
      self.point = p;
      var w = self.canvas.width;
      var h = self.canvas.height;
      var dx = w/2-self.point.x;
      var dy = h/2-self.point.y;
      var dc = Math.sqrt(dx*dx + dy*dy);
      if (dc > h/2-20-6 && dc < h/2-20+6) {
        var pos = ((Math.atan2(dy,dx) / (2*Math.PI)) + 0.75) % 1;
        self.audio.currentTime = pos * self.audio.duration;
      } else {
        if (self.audio.paused || self.audio.currentTime == self.audio.duration)
          self.audio.play();
        else
          self.audio.pause();
      }
      ev.preventDefault();
    };
    window.addEventListener('mousemove', function(ev) {
      self.point = null;
    }, false);
    this.canvas.onmouseout = function() {
      self.point = null;
    };
    this.canvas.onmousemove = function(ev) {
      var p = Mouse.getRelativeCoords(this, ev);
      self.point = p;
      var w = self.canvas.width;
      var h = self.canvas.height;
      var dx = w/2-self.point.x;
      var dy = h/2-self.point.y;
      var dc = Math.sqrt(dx*dx + dy*dy);
      if (Mouse.state[Mouse.LEFT] && dc > h/2-20-6 && dc < h/2-20+6) {
        var pos = ((Math.atan2(dy,dx) / (2*Math.PI)) + 0.75) % 1;
        self.audio.currentTime = pos * self.audio.duration;
      }
      Event.stop(ev);
    };
    setInterval(function() {
      self.draw();
    }, 33);
  },

  draw : function() {
    if (this.point == null && this.lastTime == this.audio.currentTime && this.noProgress) {
      return;
    }
    this.noProgress = true;
    this.lastTime = this.audio.currentTime;
    var t = new Date().getTime();
    var w = this.canvas.width;
    var h = this.canvas.height;
    var ctx = this.ctx;
    ctx.clearRect(0,0,w,h);
    ctx.save();
    ctx.translate(w/2,h/2);
    var bufs = this.audio.buffered;
    ctx.strokeStyle = 'rgba(0,192,255,0.1)';
    ctx.lineWidth = 12;
    for (var i=0; i<bufs.length; i++) {
      var start = bufs.start(i) / this.audio.duration;
      var end = bufs.end(i) / this.audio.duration;
      ctx.beginPath();
      ctx.arc(0,0, h/2 - 20, -Math.PI/2 + start*Math.PI*2, -Math.PI/2 + end*Math.PI*2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,192,255,1)';
    ctx.arc(0,0, h/2 - 20, -Math.PI/2, -Math.PI/2+Math.PI*2 * (this.audio.currentTime / this.audio.duration));
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.beginPath();
    this.sc += (1 - this.sc) / 2;
    var lt = this.lastThrob;
    this.lastThrob = null;
    if (this.point) {
      var dx = w/2-this.point.x;
      var dy = h/2-this.point.y;
      var dc = Math.sqrt(dx*dx + dy*dy);
      if (dc < 30) {
        if (lt == null)
          lt = this.lastThrob = t;
        else
          this.lastThrob = lt;
        this.sc = 1.1 + 0.1 * -Math.cos((t-lt)/250);
      }
    }
    ctx.scale(this.sc, this.sc);
    if (this.audio.paused || this.audio.currentTime == this.audio.duration) {
      ctx.moveTo(+ 30, 0);
      ctx.lineTo(- 20, - 20);
      ctx.lineTo(- 20, + 20);
      ctx.closePath();
      ctx.fillStyle = '#00c0ff';
      ctx.fill();
    } else {
      ctx.fillStyle = '#00c0ff';
      ctx.fillRect(- 20, - 20, 15, 40);
      ctx.fillRect(+ 5, - 20, 15, 40);
    }
    ctx.restore();
  }
});
