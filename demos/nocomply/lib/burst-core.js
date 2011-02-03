  /* Burst-Core
     Copyright F1LT3R @ Bocoup
     License: CC3 */
(function( global, doc ){

  // Array Sort
  //////////////////////////////////////////////////////////////////////////////
  function sortNumber(a,b){ return a - b; }

  // Array Type-Check
  //////////////////////////////////////////////////////////////////////////////
  function isArray( obj ){
    if( obj.constructor.toString().indexOf( 'Array' ) == -1 ){
      return false;
    }else{
      return true;
    }
  };

  // Easing
  //////////////////////////////////////////////////////////////////////////////
  var ease = {
        step          : function(x,t,b,c,d){ if( t==d ){ return d; }else{ return 1; } },
        linear        : function(x,t,b,c,d){ return c*t/d + b; },
        inOutQuad     : function(x,t,b,c,d){ if((t/=d/2) < 1){ return c/2*t*t + b;}else{ return -c/2 * ((--t)*(t-2) - 1) + b; }},
        inQuad        : function(x,t,b,c,d){ return c*(t/=d)*t + b; },
        outQuad       : function(x,t,b,c,d){ return -c *(t/=d)*(t-2) + b; },
        inCubic       : function(x,t,b,c,d){ return c*(t/=d)*t*t + b; },
        outCubic      : function(x,t,b,c,d){ return c*((t=t/d-1)*t*t + 1) + b; },
        inOutCubic    : function(x,t,b,c,d){ if((t/=d/2) < 1){ return c/2*t*t*t + b;}else{ return c/2*((t-=2)*t*t + 2) + b; }},
        inQuart       : function(x,t,b,c,d){ return c*(t/=d)*t*t*t + b; },
        outQuart      : function(x,t,b,c,d){ return -c * ((t=t/d-1)*t*t*t - 1) + b; },
        inOutQuart    : function(x,t,b,c,d){ if ((t/=d/2) < 1) return c/2*t*t*t*t + b; return -c/2 * ((t-=2)*t*t*t - 2) + b; },
        inQuint       : function(x,t,b,c,d){ return c*(t/=d)*t*t*t*t + b; },
        outQuint      : function(x,t,b,c,d){ return c*((t=t/d-1)*t*t*t*t + 1) + b; },
        inOutQuint    : function(x,t,b,c,d){ if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b; return c/2*((t-=2)*t*t*t*t + 2) + b; },
        inSine        : function(x,t,b,c,d){ return -c * Math.cos(t/d * (Math.PI/2)) + c + b; },
        outSine       : function(x,t,b,c,d){ return c * Math.sin(t/d * (Math.PI/2)) + b; },
        inOutSine     : function(x,t,b,c,d){ return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b; },
        inExpo        : function(x,t,b,c,d){ return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b; },
        outExpo       : function(x,t,b,c,d){ return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b; },
        inOutExpo     : function(x,t,b,c,d){ if (t==0) return b; if (t==d) return b+c; if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b; return c/2 * (-Math.pow(2, -10 * --t) + 2) + b; },
        inCirc        : function(x,t,b,c,d){ return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b; },
        outCirc       : function(x,t,b,c,d){ return c * Math.sqrt(1 - (t=t/d-1)*t) + b; },
        inOutCirc     : function(x,t,b,c,d){ if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b; return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b; },
        inElastic     : function(x,t,b,c,d){ var s=1.70158; var p=0;var a=c; if (t==0) return b; if ((t/=d)==1) return b+c; if (!p) p=d*.3; if (a < Math.abs(c)) { a=c; var s=p/4; } else var s = p/(2*Math.PI) * Math.asin (c/a); return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b; },
        outElastic    : function(x,t,b,c,d){ var s=1.70158; var p=0;var a=c; if (t==0) return b; if ((t/=d)==1) return b+c; if (!p) p=d*.3; if (a < Math.abs(c)) { a=c; var s=p/4; } else var s = p/(2*Math.PI) * Math.asin (c/a); return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b; },
        inOutElastic  : function(x,t,b,c,d){ var s=1.70158; var p=0;var a=c; if (t==0) return b; if ((t/=d/2)==2) return b+c; if (!p) p=d*(.3*1.5); if (a < Math.abs(c)) { a=c; var s=p/4; } else var s = p/(2*Math.PI) * Math.asin (c/a); if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b; return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b; },
        inBack        : function(x,t,b,c,d){ var s = 1.70158; return c*(t/=d)*t*((s+1)*t - s) + b; },
        outBack       : function(x,t,b,c,d){ var s = 1.70158; return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b; },
        inOutBack     : function(x,t,b,c,d){ var s = 1.70158; if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b; return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b; },
        inBounce      : function(x,t,b,c,d){ return c - ease.outBounce( x, d-t, 0, c, d) + b; },
        outBounce     : function(x,t,b,c,d){ if((t/=d) < (1/2.75)){ return c*(7.5625*t*t) + b; } else if (t < (2/2.75)) { return c*(7.5625*(t-=(1.5/2.75))*t + 0.75) + b; } else if (t < (2.5/2.75)) { return c*(7.5625*(t-=(2.25/2.75))*t + 0.9375) + b; } else { return c*(7.5625*(t-=(2.625/2.75))*t + 0.984375) + b; } },
        inOutBounce   : function(x,t,b,c,d){ if(t < d/2){ return ease.inBounce(x, t*2, 0, c, d) * 0.5 + b;}else{ return ease.outBounce(x, t*2-d, 0, c, d) * 0.5 + c*0.5 + b; }}  
      },

      Burst_proto, Timeline_proto, Obj_proto, Track_proto, Key_proto
  ;

  // Burst Instance
  //////////////////////////////////////////////////////////////////////////////
  function Burst(){
    this.timelines={};
    this.loaded={};
    this.fps = 30;
    this.timelineCount = 0;
    this.onframe=undefined;
    this.exports = {};
    this.on = true;
  };

  Burst_proto = Burst.prototype;

  Burst_proto.getJSON = function( url ){
    var AJAX = new window.XMLHttpRequest();
    if( AJAX ){
      AJAX.open( "GET", url + "?t=" + new Date().getTime(), false );
      AJAX.send( null );
      return AJAX.responseText;
    }else{
      return false;
    }
  };

  Burst_proto.loadJSON = function( url, exportCallback, json ){
    if(!json){
      var json = JSON.parse( this.getJSON( url ) );
    }
    var timelineName, json_tl, timeline,
        objectName, json_obj, objRef, obj,
        tracks, track, keys, len, i, key
    ;
    for(timelineName in json){
      json_tl = json[ timelineName ];
      timeline = burst.timeline( timelineName, json_tl.start, json_tl.end, json_tl.speed, json_tl.looping );
      json_obj = json[ timelineName ].objects;
      for(objectName in json_obj){
        objRef = json_obj[objectName].objRef;
        this.exports[objRef] = {};
        obj = timeline.obj( objectName, this.exports[objRef] );
        tracks = json_obj[objectName].tracks;
        for(trackName in tracks){
          track = obj.track( trackName );
          for(trackName in tracks){
            keys = tracks[trackName];
            len = keys.length;
            for(i=0; i< len; i++){
              key = keys[i];
              if(i==0){
                this.exports[objRef][trackName] = key[1];
              }
              track.key(key[0], key[1], key[2]||'linear');
            }
          }
        }
      }
    }
    exportCallback?exportCallback( this.exports ):0;
    return json;
  };
  
  Burst_proto.remove = function( timelineName ){
    (function(){
      var _timeline = burst.timeline( timelineName ),
          objects   = _timeline.objects,
          tracks, keys, key, i, j, l, v, o, tr
      ;
      for(_object in objects){
        tracks = objects[_object].tracks;
        for(_track in tracks){
          keys = tracks[_track].keys;
          for(_key in keys){
            key = keys[_key];
            delete key.aryLen;
            delete key.callback;
            delete key.callbackFired;
            delete key.ease;
            delete key.frame;
            if(key.isArray){
              v = key.value;
              l = v.length;
              for(i=0; i< l; i++){
                delete v[i];
              }
            }
            delete key.isArray;
            delete key.isString;
            delete key.parent;
            delete key.value;
            delete key.always;
            delete key.key;
            delete key.obj;
            delete key.track;          
          }
          l = keys.length;
          for(i=0; i< l; i++){
            delete keys[i];
          }
        }
        t = tracks[_track];
        delete t.ease;
        delete t.keys;
        delete t.parent;
        delete t.prop;
        delete t.always;
        delete t.key;
        delete t.obj;
        delete t.play;
        o = objects[_object];
        delete o.name;
        delete o.objRef;
        delete o.parent;
        for(tr in o.tracks){
          delete o.tracks[tr];
        }
        delete o.tracks;
        t = _timeline;
        delete t.callback;
        delete t.end;
        delete t.frame;
        delete t.loop;
        delete t.name;
        for(tr in t.objects){
          delete t.objects[tr];
        }
        delete t.objects;
        delete t.speed;
        delete t.start;
        delete t.obj;
        delete t.play;
        delete t.parent;
      } 
      delete burst.timelines[timelineName];
      return true;
    })();
  };

  Burst_proto.timeline = function(name,start,end,speed,loop,callback){
    return this.timelines[name]||(arguments.length>1?this.timelines[name]=new Timeline(name,start,end,speed,loop,callback,this):undefined);
  };

  Burst_proto.load = function( name ){  
    return this.loaded[name] || (function(){
      for(var i in this.timelines ){
        if( this.timelines[i].name === name ){
          return (this.loaded[i] = this.timelines[i]);
        }
      }
    }).call(this);
    return false;
  };

  Burst_proto.unload = function( name ){
    delete this.loaded[name];
    return true;
  };

  Burst_proto.play = function(){
    var deepref = this;
    clearInterval( global.interval );
    global.interval = window.setInterval(function(){
      deepref.frame();
    }, 1000 / this.fps );
  };

  Burst_proto.frame = function( frame ){
    if(this.onframe){this.onframe();}
    for( var i in this.loaded ){
      if(this.hasOwnProperty("loaded")){
        this.loaded[i].play( frame );
      }
    }
  };
  
  Burst_proto.stop = function(){
    window.clearInterval( this.interval );
    delete this.interval;
  };

  // Timeline
  //////////////////////////////////////////////////////////////////////////////
  function Timeline(name,start,end,speed,loop,callback,parent){
    parent.timelineCount++;
    this.name=name;
    this.start=this.frame=start;
    this.end=end;
    this.speed=speed;

    this.loop=loop;
    this.callback=callback;
    this.parent=parent;
    this.objects={};
    return this;
  };

  Timeline_proto = Timeline.prototype;

  Timeline_proto.obj = function(name,objRef){
    return this.objects[name]||(this.objects[name]=new Obj(name,objRef,this));
  };
  
  Timeline_proto.play = function( frame ){
    this.frame = frame || (this.frame += this.speed);
    if( this.loop ){
      if( this.frame > this.end ){ this.frame = this.start; }
      if( this.frame < this.start ){ this.frame = this.end; }
    }else{
      if( this.frame >= this.end){
        this.frame = this.end;
        //this.parent.unload(this.name);
        if(this.callback){this.callback(this.frame);}
      }
      if( this.frame <= this.start ){
        this.frame = this.start;
        //this.parent.unload(this.name);
        if(this.callback){this.callback(this.frame);}
      }
    }
    var thisObj;
    for( var i in this.objects ){
      thisObject = this.objects[i];
      for( var j in thisObject.tracks ){
        thisObject.tracks[j].play( this.frame );
      }
    }
    if( this.always ){ this.always.call(this,this.frame); }
  };  


  // Object / "Actor"
  //////////////////////////////////////////////////////////////////////////////
  function Obj(name,objRef,parent){
    this.name=name;
    this.objRef=objRef;
    this.parent=parent;
    this.tracks={};
    return this;
  };

  Obj_proto = Obj.prototype;
  
  Obj_proto.track = function(prop){
    return this.tracks[prop]||(this.tracks[prop]=new Track(prop,this));
  };

  // Track
  //////////////////////////////////////////////////////////////////////////////
  function Track(prop,parent){
    this.prop=prop;
    this.ease=ease;
    this.parent=parent;
    this.keys=[];
    //this.unit=typeof this.parent.objRef[prop] === 'number' ? undefined : this.parent.objRef[prop].replace(/[.0-9]/g,'');
    this.alwaysCallback;
    return this;
  };

  Track_proto = Track.prototype;
  
  Track_proto.key = function(frame,value,ease,callback){
    for(var i=0,l=this.keys.length;i<l;i++){
      if(this.keys[i].frame === frame){
        return this.keys[i];
      }
    }
    if(arguments.length>1){
      var keyIndex=[], keyStack=[], thisKey = this.keys[this.keys.length] = new Key(frame,value,ease,callback,this);
      for(i=0;i<this.keys.length;i++){
        keyIndex[i]=this.keys[i].frame;
      }
      keyIndex.sort(sortNumber);
      for(i=0;i<this.keys.length;i++){
        for(var j=0;j<this.keys.length;j++){
          if(keyIndex[i]==this.keys[j].frame){
            keyStack[i]=this.keys[j];
          }
        }
      }
      this.keys=[];
      for(i=0, l=keyStack.length; i< l; i++){
        this.keys[i] = keyStack[i];
      }
      return thisKey;
    }else{
      return false;
    }
  };

  Track_proto.play = function(frame){
    var curKey, nextKey, val, indice, aryLen;
    for(var i=0, l=this.keys.length; i<l; i++){
      curKey = this.keys[i];
      nextKey = this.keys[i+1];
      if(nextKey === undefined && i+1 > l-1){
        nextKey = this.keys[l-1];
      }
      if( frame >= curKey.frame && frame < nextKey.frame ){

          if( curKey.isArray ){
            aryLen = curKey.aryLen;
            for(indice=0; indice< aryLen; indice++){
              val = this.ease[ curKey.ease ]( 0,
              frame-curKey.frame,
              curKey.value[ indice ],
              nextKey.value[ indice ]-curKey.value[ indice ],
              nextKey.frame-curKey.frame );
              this.parent.objRef[this.prop][ indice ] = val;
            }
          }else if( curKey.isString ){
            this.parent.objRef[this.prop] = curKey.value;
          }else{ 
            val = this.ease[ curKey.ease ]( 0,
            frame-curKey.frame,
            curKey.value,
            nextKey.value-curKey.value,
            nextKey.frame-curKey.frame );
            this.parent.objRef[this.prop] = val;
          }
          
          if(this.lastKeyFired && this.lastKeyFired.frame != curKey.frame){
            this.lastKeyFired.callbackFired = false;
          }
          
          if(curKey.callback && !curKey.callbackFired){
            curKey.callback.call(this.parent.objRef, {
              frame      : frame,
              prop       : this.prop,
              burstTrack : this
            });
            curKey.callbackFired=true;
            this.lastKeyFired = curKey;
          }

      }else if( frame >= nextKey.frame || frame === 0 ){
        if( curKey.isArray ){
          aryLen = curKey.aryLen;
          for(indice=0; indice< aryLen; indice++){
            this.parent.objRef[this.prop][ indice ] = curKey.value[ indice ];
          }
        }else{
         this.parent.objRef[this.prop][ indice ] = curKey.value;
        }
      }
    }
    if(this.alwaysCallback){
      this.alwaysCallback.call(this.parent.objRef, {
        frame      : frame,
        prop       : this.prop,
        burstTrack : this
      });
    }
  };

  Track_proto.always = function( func ){
    this.alwaysCallback = func;
    return this;
  };

  Track_proto.obj=function(name,objRef){
    var timeline = this.parent.parent;
    return timeline.obj.call(timeline,name,objRef);
  };

  // Key
  //////////////////////////////////////////////////////////////////////////////
  function Key(frame,value,ease,callback,parent){
    this.frame=frame;
    this.value=value; 
    if( isArray( value ) ){
      this.isArray = true;
      this.aryLen = value.length;
    }
    if( typeof value == 'string' ){
      this.isString = true;
    }
    this.ease=ease||'linear';
    this.callback=callback;
    this.callbackFired=false;
    this.parent=parent;
    return this;
  };

  Key_proto = Key.prototype;

  Key_proto.obj=function(name,objRef){
    var timeline = this.parent.parent.parent;
    return timeline.obj.call(timeline,name,objRef);
  };

  Key_proto.track=function(name,objRef,prop){
    var obj = this.parent.parent;
    return obj.track.call(obj,name,objRef,prop);
  };

  Key_proto.key=function(frame,value,ease,callback){
    var track = this.parent;
    return track.key.call(track,frame,value,ease,callback);
  };

  Key_proto.always=function(func){
    var track = this.parent;
    return track.always.call(track,func);
  };

  // Instantiation
  //////////////////////////////////////////////////////////////////////////////
  var burst = window.burst = new Burst();

})( window, document );
