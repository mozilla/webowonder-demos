
  var globalSpriteAnimationSpeed = 400;
  
  //////////////////////////////////////////////////////////////////////////////

	function extend(a, b){
	  for(var i in b){
	    a[i] = b[i];
	  }
	};
	
	//// BITWALL /////////////////////////////////////////////////////////////////
	function BitWall(){this.bitwalls=[];this.lastSeconds=-1;};
	
	var BitWall_proto = BitWall.prototype;

	BitWall_proto.run = function(seconds)
	{
	  var lastTimer;
	  
	  if ((this.lastSeconds > seconds) || (this.lastSeconds===-1)) { this.lastSeconds = seconds; return; }
	  
	  lastTimer = seconds-this.lastSeconds;
	  
	  if (lastTimer===0) return;
	  
	  for (var i = 0, iMax = this.bitwalls.length; i<iMax; i++)
	  {
	    var wall = this.bitwalls[i];
	    var act = wall.sprite.action[wall.action];

      if (!act.timer) act.timer = 0;
	    act.timer += parseInt(lastTimer*1000);
	    	    
	    if (act.timer > act.speed * globalSpriteAnimationSpeed)
	    {
	      act.timer = 0;	     
        // wall.context.putImageData( viking.sprites[wall.spriteName][wall.action].frame(), 0, 0 );
        gl.bindTexture(gl.TEXTURE_2D, CubicVR.Textures[wall.texture.tex_id]);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, viking.sprites[wall.spriteName][wall.action].frame());
        gl.bindTexture(gl.TEXTURE_2D, null);        
	    }
	  }
	  
	  this.lastSeconds = seconds;
	}
	
	BitWall_proto.addSprites = function( sprites ){
	  for(var i=0, l=sprites.length; i< l; i++){
	  
	    var nextBitWallObject = (function(){
	      var nextBitWall = { sprite: viking.loadSprite( sprites[i] ) };
	      nextBitWall.spriteName = nextBitWall.sprite.name;
	      
	      for(var a in nextBitWall.sprite.action){
          nextBitWall.action = a;
          break;
        }
         
	      nextBitWall.context = (function(){
          var canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          return canvas.getContext('2d');
        })();
        
        nextBitWall.canvas = nextBitWall.context.canvas;
        
    	  nextBitWall.texture = (function(){
          var tex = new CubicVR.Texture();
          tex.setFilter(CubicVR.enums.texture.filter.NEAREST);
          tex.use();
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          return tex;
        })();

//         nextBitWall.drawFrame = function(){
// // humph: removing for perf debugging...
// //         nextBitWall.context.clearRect( 0, 0, 42, 42 );
//          nextBitWall.context.putImageData( viking.sprites[nextBitWall.spriteName][nextBitWall.action].frame(), 0, 0 );
//           gl.bindTexture(gl.TEXTURE_2D, CubicVR.Textures[nextBitWall.texture.tex_id]);
//           gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
//           gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nextBitWall.canvas);
//           gl.bindTexture(gl.TEXTURE_2D, null);
//        };
        
        //         nextBitWall.drawLoop = setInterval(function(){
        //   nextBitWall.drawFrame();
        // }, nextBitWall.sprite.action[nextBitWall.action].speed * globalSpriteAnimationSpeed);
        
        nextBitWall.cubeArray = new BitmapCubeArray( 42, 42, nextBitWall.texture, 0 );
        nextBitWall.sceneObject = new CubicVR.SceneObject( nextBitWall.cubeArray.mesh );
 
        // scene_test.bindSceneObject( nextBitWall.sceneObject );
        
        return nextBitWall;
      })( i );
      
      this[nextBitWallObject.spriteName] = nextBitWallObject;
      this.bitwalls.push(nextBitWallObject);
	  }
	};
	
	//////////////////////////////////////////////////////////////////////////////
