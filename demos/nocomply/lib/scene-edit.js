(function(global, doc){
    
  global.loadSpriteGUI = function(){

    window.burst.on=true;
    window.spriteGUI = true;

    $('#scene-edit').css({display:'block'});
    $('#time-slider-container').css({display:'block'});    
    $('#cubicvr-canvas').css({width: 640, height: 380 });

    $('#toggle-burst').click(function(){
      if( $(this).text() === 'Burst: ON' ){
        $(this).text('Burst: OFF')
        window.burst.on = false;
      }else{
        $(this).text('Burst: ON')
        window.burst.on = true;
      }
    });

    function updateScene(){
      if(window.burst.on){
        window.burst.frame( timerData.timerSeconds );
        window.updateSprites();
      }      
      window.seq.runFrame(timerData.timerSeconds);
      window.runFrameFunc();
    };
        
    // Define Globals
    var i,li,tr,t,
        audio               = $('#no-comply')[0],
        timeSlider          = $('#time-slider'),
        currentTime         = $('#currentTime input'),
        bitWallSpriteTable  = $('#bitWallSpriteList table'),
        bitWall             = global.bitWall,
        lastTouched         = null
    ;

    audio.currentTime = 52.00;
    timerData.timerSeconds = 52.00;
    //audio.pause();

    // Build BitWall Sprite List
    bitWallSpriteTable.children('tr:gt(0)').remove();

    for(aSprite in bitWall){
    
      if( typeof bitWall[aSprite] == 'object' ){
        (function( sprite ){

          tr = $('<tr/>',{id:sprite});
          tr.append(
            $('<td/>',{className:'name'}).text(sprite),
            $('<td/>',{className:'position'}),
            $('<td/>',{className:'scale'}),
            $('<td/>',{className:'rotation'}),
            $('<td/>',{className:'action'}),
            $('<td/>',{className:'key'})
          );
          
          var sceneObject = bitWall[sprite].sceneObject,
              position    = tr.find('td[class^=position]'),
              scale       = tr.find('td[class^=scale]'),
              rotation    = tr.find('td[class^=rotation]'),
              action      = tr.find('td[class^=action]')
          ;

          var posX = $('<input/>').addClass('x rounded-input');
          position.append(posX);                              
          posX.val(sceneObject.position[0]);
          posX.change(function( e ){
            sceneObject.position[0] = parseFloat( $(this).val() );
            lastTouched = 'posX';
            updateScene();
          });
          var posY = $('<input/>').addClass('y rounded-input');
          position.append(posY);
          posY.val(sceneObject.position[1]);
          posY.change(function( e ){
            sceneObject.position[1] = parseFloat( $(this).val() );
            lastTouched = 'posY';
            updateScene();
          });
          var posZ = $('<input/>').addClass('z rounded-input');
          position.append(posZ);
          posZ.val(sceneObject.position[2]);
          posZ.change(function( e ){
            console.log(sceneObject.position[2]);
            sceneObject.position[2] = parseFloat( $(this).val() );
            console.log(sceneObject.position[2]);
            updateScene();
          });
          var sclX = $('<input/>').addClass('x rounded-input');
          scale.append(sclX);
          sclX.val(sceneObject.scale[0]);
          sclX.change(function( e ){
            sceneObject.scale[0] = parseFloat( $(this).val() );
            lastTouched = 'sclX';
            updateScene();
          });
          var sclY = $('<input/>').addClass('y rounded-input');
          scale.append(sclY);
          sclY.val(sceneObject.scale[1]);
          sclY.change(function( e ){
            sceneObject.scale[1] = parseFloat( $(this).val() );
            lastTouched = 'sclY';
            updateScene();
          });
          var sclZ = $('<input/>').addClass('z rounded-input');
          scale.append(sclZ);
          sclZ.val(sceneObject.scale[2]);
          sclZ.change(function( e ){
            sceneObject.scale[2] = parseFloat( $(this).val() );
            lastTouched = 'sclZ';
            updateScene();
          });  
         
          var rotX = $('<input/>').addClass('x rounded-input');
          rotation.append(rotX);
          rotX.val(sceneObject.rotation[0]);
          rotX.change(function( e ){
            sceneObject.rotation[0] = parseFloat( $(this).val() );
            lastTouched = 'rotX';
            updateScene();
          });
          var rotY = $('<input/>').addClass('y rounded-input');
          rotation.append(rotY);
          rotY.val(sceneObject.rotation[1]);
          rotY.change(function( e ){
            sceneObject.rotation[1] = parseFloat( $(this).val() ); 
            lastTouched = 'rotY';
            updateScene();
          });
          var rotZ = $('<input/>').addClass('z rounded-input');
          rotation.append(rotZ);
          rotZ.val(sceneObject.rotation[2]);
          rotZ.change(function( e ){
            sceneObject.rotation[2] = parseFloat( $(this).val() );            
            lastTouched = 'rotZ';
            updateScene();
          });       

          var actionDropDown = $('<select/>').addClass('action rounded-input dropdown');
          for(actionName in bitWall[sprite].sprite.action){
            var select = $('<option/>').text(actionName);
            actionDropDown.append(select);
            lastTouched = 'action';
          }
          actionDropDown.change(function(){ 
            bitWall[sprite].action = $(this).val();
            updateScene();
          });
          action.append(actionDropDown);
          
          bitWallSpriteTable.append( tr );

        })( aSprite );
      }
    }

    audio.addEventListener('timeupdate', function(){
      timeSlider.slider({ value: global.timerData.timerSeconds * 1000 });
      currentTime.val( global.timerData.timerSeconds );
    }, false);

    // Update Time Display and Update Cubic Clock
    $('#time-slider').slider({
      min   : 0,
      max   : audio.duration * 1000,
      value : 0,
      stop  : function(e,ui){
       audio.currentTime = ui.value/1000;
      },
      slide : function(e,ui){
        var newTime  = ui.value/1000;
        currentTime.val( newTime );
        global.timerData.timerSeconds = parseFloat( newTime );
         audio.currentTime = newTime;
        updateScene();
      }
    });
  
    currentTime.change(function(){
      var newTime = $(this).val();
      currentTime.val( newTime );
      global.timerData.timerSeconds = parseFloat( newTime );
      audio.currentTime = newTime;
      //updateScene();
    });

  };

})( window, document );
