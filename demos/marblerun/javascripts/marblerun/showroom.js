var Showroom = Class.create(Renderer, {
  
  initialize: function($super, staticCanvas, dynamicCanvas) {
    $super(staticCanvas, dynamicCanvas);
    
    this.initializeHTMLInterface();

    this.trackID = null;
    this.autoMode = false;
    
    this.tweenMode = false;
    this.tweenDown = true;
    this.tweenStart = false;
    
    this.fieldOffset = 0;
    this.fieldImage = null;
    
  },

  quit: function($super) {
    $super();
    
    if (this.tweenTimeoutID) {
      clearTimeout(this.tweenTimeoutID);
      this.tweenTimeoutID = null;
      this.tweenMode = false;
    }
    
    $('showroomLikeButton').stopObserving();
    $('showroomFlagButton').stopObserving();
  },
  
  drawDynamics: function($super, context) {
    
    if (this.tweenMode) {
      
      this.clearDynamicCanvas();
      
    } else if (this.tweenStart) {
      
      this.tweenStart = false;
      
      if (this.tweenDown) {
      
        this.fadeTrack(trackStore.next(this.trackID));
      
      } else {
        
        this.fadeTrack(trackStore.previous(this.trackID));
        
      }
      
    } else {
      
      $super(context);
      
    }
    
  },
  
  drawTweenMode: function(context) {
    
    var offset;
    
    context.save();
    
      offset = this.fieldOffset + (this.field.height + Brick.SIZE) * (this.fieldOffset < 0 ? 1 : -1);
    
      context.translate(-0.5, offset - 0.5);
      
      context.drawImage(
        this.fieldImage,
        this.field.x, this.field.y, this.field.width, this.field.height,
        0, 0, this.field.width, this.field.height
      );
    
    context.restore();
    
    
    context.save();
    
      offset = this.fieldOffset + (this.fieldOffset > 0 ? -Brick.SIZE : this.field.height);
      
      context.translate(0, offset);
      
      this.drawInlay(context);
    
    context.restore();
    
  },
  
  drawInlay: function(context) {
    
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(this.field.width, 0);
    context.lineTo(this.field.width, Brick.SIZE);
    context.lineTo(0, Brick.SIZE);
    context.closePath();
    
    context.clip();
    
    
    context.fillStyle = Brick.FILL;
    context.strokeStyle = Brick.STROKE;
    context.lineWidth = 3;
    
    context.fillRect(0, 0, this.field.width, Brick.SIZE);
    
    
    context.beginPath();
    var i;
    
    for (i = 0; i < this.field.width + Brick.SIZE; i += Brick.SIZE / 3) {
      
      context.moveTo(i, 0);
      context.lineTo(i - Brick.SIZE, Brick.SIZE);
      
    }
    
    context.stroke();
    
    
    context.lineWidth = 1;
    context.beginPath();
    
    for (i = 1; i < this.field.cols; i++) {
      
      context.moveTo(i * Brick.SIZE, 0);
      context.lineTo(i * Brick.SIZE, Brick.SIZE);
      
    }
    
    context.stroke();
    
    context.beginPath();
    
  },

  onBallExit: function($super) {

    $super();

    if (this.autoMode) {

      if (trackStore.hasNext(this.trackID)) {

        this.tweenDown = true;
        this.fadeTrack(trackStore.next(this.trackID));

      } else {

        contentLoader.loadContent("/tracks/" + this.trackID + "/next", true);

      }

    }

  },

  parseTrack: function(data) {
    
    this.initField();
    
    this.trackID = data.id;
    this.field.setTrack(data.json);
    
    trackStore.loadNext(this.trackID);
    trackStore.loadPrevious(this.trackID);
    this.setLikeBlameButtons();

    if (this.autoMode && !this.tweenMode) {
      this.field.startBox2D();
    }
  },

  initializeHTMLInterface: function() {
    var myScope = this;

    $('showButton').observe('click', function(event) {
      myScope.field.startBox2D();
    });

    $('autoButton').observe('click', function(event) {
      $('autoButton').toggleClassName('active');

      myScope.autoMode = $('autoButton').hasClassName('active');
    });
    
    $('nextButton').observe('click', function(event) {

      if (trackStore.hasNext(myScope.trackID)) {
        myScope.tweenDown = true;
        myScope.tweenStart = true;
        return;
      }

      contentLoader.loadContent("/tracks/" + myScope.trackID + "/next");
    });

    $('previousButton').observe('click', function(event) {

      if (trackStore.hasPrevious(myScope.trackID)) {
        myScope.tweenDown = false;
        myScope.tweenStart = true;
        return;
      }

      contentLoader.loadContent("/tracks/" + myScope.trackID + "/previous");
    });
    
  },

  setLikeBlameButtons: function() {
    var myScope = this;

    if (Cookie.likedTracks.indexOf(this.trackID) === -1) {
      $('showroomLikeButton').observe('click', function() {
        myScope.like();
      });

      $('showroomLikeButton').setStyle({display: "block"});
    } else {

      $('showroomLikeButton').stopObserving();
      $('showroomLikeButton').setStyle({display: "none"});
    }

    if (Cookie.flagedTracks.indexOf(this.trackID) === -1) {
      $('showroomFlagButton').observe('click', function() {
        myScope.flag();
      });

      $('showroomFlag').setStyle({display: "block"});
    } else {
      $('showroomFlagButton').stopObserving();
      $('showroomFlag').setStyle({display: "none"});
    }
  },

  startRender: function($super) {
    $super();
    
    if (this.autoMode && !this.tweenTimeoutID) {

      this.field.startBox2D();

    }
  },

  like: function() {

    if (this.trackID) {
      var parameters = {};
      var myScope = this;

      parameters.likes = 1;
        
      /*var request = new Ajax.Request('/tracks/' + this.trackID, {
        method: 'put',
        parameters: parameters,
        requestHeaders: {Accept: 'application/json'},
        
        onSuccess: function(transport) {
          Cookie.likedTracks.push(myScope.trackID);
          Cookie.set('likes', JSON.stringify(Cookie.likedTracks), {maxAge: 60 * 60 * 24 * 365});

          $('tableLikes').update(parseInt($('tableLikes').innerHTML, 10) + 1);

          $('showroomLikeButton').setStyle({display: "none"});
        },
        
        onFailure: function(transport) {
          $('showroomLikeButton').setStyle({display: "none"});
        }
      });*/

      jQuery.ajax({
        url: "http://marblerun.at" + '/tracks/' + this.trackID,
        type: 'PUT',
        headers: {
          "Accept": "application/json"
        },
        data: {
          likes: 1
        },
        success: function(transport) {
          Cookie.likedTracks.push(myScope.trackID);
          Cookie.set('likes', JSON.stringify(Cookie.likedTracks), {maxAge: 60 * 60 * 24 * 365});

          $('tableLikes').update(parseInt($('tableLikes').innerHTML, 10) + 1);

          $('showroomLikeButton').setStyle({display: "none"});
        },

        error: function(transport) {
          $('showroomLikeButton').setStyle({display: "none"});
        }
      });
    }
  },

  flag: function() {
    if (this.trackID) {
      var parameters = {};
      var myScope = this;

      parameters.flags = 1;
        
      /*var request = new Ajax.Request('/tracks/' + this.trackID, {
        method: 'put',
        parameters: parameters,
        requestHeaders: {Accept: 'application/json'},
        
        onSuccess: function(transport) {
          Cookie.flagedTracks.push(myScope.trackID);
          Cookie.set('flags', JSON.stringify(Cookie.flagedTracks), {maxAge: 60 * 60 * 24 * 365});

          $('showroomFlag').setStyle({display: "none"});
        },
        
        onFailure: function(transport) {
          $('showroomFlag').setStyle({display: "none"});
        }
      });*/

      jQuery.ajax({
        url: "http://marblerun.at" + '/tracks/' + this.trackID,
        type: 'PUT',
        headers: {
          "Accept": "application/json"
        },
        data: {
          flags: 1
        },
        success: function(transport) {
          Cookie.flagedTracks.push(myScope.trackID);
          Cookie.set('flags', JSON.stringify(Cookie.flagedTracks), {maxAge: 60 * 60 * 24 * 365});

          $('showroomFlag').setStyle({display: "none"});
        },

        error: function(transport) {
          $('showroomFlag').setStyle({display: "none"});
        }
      });
    }
  },
  
  fadeTrack: function(trackID) {
    
    this.tweenPercent = 0;
    this.fieldOffset = this.totalHeight = (this.field.height + Brick.SIZE) * (this.tweenDown ? 1 : -1);
    
    this.fieldImage = new Image();
    var myScope = this;
    
    this.fieldImage.onload = function() {
      
      myScope.tweenMode = true;
      trackStore.loadTrack(trackID, contentLoader.parseResponse, contentLoader, true);
      myScope.tweenMode = true;
      myScope.tween();
      
    };
    
    this.fieldImage.src = this.staticCanvas.toDataURL("image/png");
  },
  
  tween: function() {
    
    this.field.renderNew = true;
    
    if (this.tweenPercent >= 1.0) {
      
      this.tweenMode = false;
      this.tweenTimeoutID = null;
      
      this.fieldOffset = 0;
      
      if (this.autoMode) {
        this.field.startBox2D();
      }
      
    } else {
    
      this.fieldOffset = (Math.cos(this.tweenPercent * Math.PI) + 1.0) / 2 * this.totalHeight;
      this.tweenPercent += 0.05;
      
      var myScope = this;
          
      this.tweenTimeoutID = setTimeout(function() {
      
        myScope.tween();
      
      }, 50);
      
    }
  }

});