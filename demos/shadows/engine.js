
// The Letter-Heads by simurai
// I'm not really a programmer, so yeah.. you can make fun of my code. ;-)


var mr_heads = ["mr1","mr2","mr3","mr4","mr5"];
var ms_heads = ["ms1","ms2","ms3","ms4","ms5"];

var state = "out";		// out, mr or ms
var timer;				// autoplay timer
var count = 0;			// autoplay countdown
var skip = false;		// skip is used to delay the auto-play on user interaction

var mr_hint = true;		// click me hint
var ms_hint = true;		// click me hint

var currentFont = 1;
var currentHead = Math.floor(Math.random()*5);





$(document).ready(function() {	
	
	
// on mouse move
	
	$(document).mousemove(function(e){		
	
		var docW = $(window).width();
		var docH = $(window).height();
		
		var diffX = (docW/2) - e.clientX;
		var diffY = (docH/2) - e.clientY;
		
		if (diffX > 0) {
			var scale = 1+(diffX/docW);
		} else {
			var scale = 1+((diffX*-1)/docW);
		}
		

		if (state != "out") {
				
			// front
			var frontTransform =   'translate('+ Math.floor( diffX /-40 ) +'px, '+ Math.floor( diffY /-100 ) +'px   )';
			var wbk_frontTransform = 'translate3d('+ Math.floor( diffX /-40 ) +'px, '+ Math.floor( diffY /-100 ) +'px, 0)';
			$("#front").css( {"-moz-transform": frontTransform, "-webkit-transform": wbk_frontTransform, "-ms-transform": frontTransform, "-o-transform": frontTransform, "transform": frontTransform } );
			
			
			// back
			var backTransform =   'translate('+ Math.floor( diffX /8 ) +'px, '+ Math.floor( diffY /30 ) +'px   ) scaleX('+ scale +')';
			var wbk_backTransform = 'translate3d('+ Math.floor( diffX /8 ) +'px, '+ Math.floor( diffY /30 ) +'px, 0) scaleX('+ scale +')';
			$("#back").css( {"-moz-transform": backTransform, "-webkit-transform": wbk_backTransform, "-ms-transform": backTransform, "-o-transform": backTransform, "transform": backTransform } );
		
		}
		
		
		// bg
		var bgTransform =   'translate('+ Math.floor( (docW/2-500) + (diffX/-3) ) +'px, '+ Math.floor( (docH/2-500) + (diffY/-6) ) +'px)   ';	
		var wbk_bgTransform = 'translate3d('+ Math.floor( (docW/2-500) + (diffX/-3) ) +'px, '+ Math.floor( (docH/2-500) + (diffY/-6) ) +'px, 0)';
		$("#bg").css( { "-moz-transform": bgTransform, "-webkit-transform": wbk_bgTransform, "-ms-transform": bgTransform, "-o-transform": bgTransform, "transform": bgTransform } );
		
		
    });
    
    
    
    
    
// functions
	
    var nextHead = function() {
    		
		if(currentHead >= 5) {
			currentHead = 1;
		} else {
			currentHead++;
		}
		
				
		$('.leds .active').removeClass( "active" );
		var newLed = "#leds-" +state + " li:nth-child("+ currentHead +")";
		$(newLed).addClass( "active" );
		
		
		if (state == "mr") {
			$("#letters").attr({className: "mr " + mr_heads[currentHead-1] + " font" + currentFont });
		} else if (state == "ms") {
			$("#letters").attr({className: "ms " + ms_heads[currentHead-1] + " font" + currentFont });
		}
		
		playAudio("audio_step_" + Math.ceil(Math.random()*7) );
		playAudio("audio_morph");
    };
    
    

    var nextFont = function() {
    	var oldFont = "font" + currentFont;
    	if(currentFont >= 3) {
    		currentFont = 1;
    	} else {
    		currentFont++;
    	}
    	var newFont = "font" + currentFont;
    	$('#letters').removeClass( oldFont ).addClass( newFont );
    	
    	$('#fonts button .active').removeClass( "active" );
    	var newActive = "#fonts button span:nth-child("+ currentFont +")";
    	$(newActive).addClass( "active" );
    };
    
    
    
    var playAudio = function(id) {    	
    	try {
            var a = document.getElementById(id);  
    		a.currentTime = 0;
    		a.play();
        } catch(e) {
            //$("#debug").html(e);
        } 
    };
	
	

//init
	
	$(function() {
		
		
		// Make each letter accessible and add the shadow.
		// This is just to impress the "View Page Source" folks. ;-)
		
		var title_html = '';
		var title_chars = $('#front').text().split('');
		$(title_chars).each(function(i, letter) {
			title_html += '<span class="letter">'+letter+'</span>';
		});	
		
		$('#front').html(title_html);
		$('#letters').append('<div id="back">'+title_html+'</div>');
		
		
		
		
		
		
		
		// frame clicks
				
		$('#mr').click(function() {
			if( mr_hint ) {
				$('#mr .hint').fadeOut(500);
				mr_hint = false;
			}
			if(state == "ms") {
				currentHead = Math.floor(Math.random()*5);
				playAudio("audio_gender_rl");
			}
			state = "mr";
			count = 10;
			skip = true;
			nextHead();
		});
		$('#mr').mousedown(function() {
			playAudio("audio_frame");
		});
		
		
		$('#ms').click(function() {
			if( ms_hint ) {
				$('#ms .hint').fadeOut(500);
				ms_hint = false;
			}
			if(state == "mr") {
				currentHead = Math.floor(Math.random()*5);
				playAudio("audio_gender_lr");
			}
			state = "ms";
			count = 10;
			skip = true;
			nextHead();
		});
		$('#ms').mousedown(function() {
			playAudio("audio_frame");
		});
		
		
		
		
		// fonts switcher
		
		$('#fonts button').mousedown(function() {
			playAudio("audio_fonts_down");
		});
		$('#fonts button').mouseup(function() {
			nextFont();
			playAudio("audio_fonts_up");
		});
				
		
		
		// enable autoplay
		
		timer = setInterval(function() {
		    
		    if(skip) {
		    	skip = false;
		    } else if(count > 0) {
		    	count--;
		    	nextHead();
		    } else if(state != "out") {
		    	state = "out";
		    	$('.leds .active').removeClass( "active" );
		    	$("#letters").attr({className: 'out font' + currentFont });
		    }
		    
		}, 8000);	
		
		
		
		
		
		
		
		// system hookup
		
		var targetOrigin = '*';  //This will be the gallery url
		
		window.addEventListener("message", function(e) { 
		    
		    if ("start_demo" == e.data) {
		    	window.parent.postMessage('show_exit_ui', targetOrigin);
		    	    	
		    } else if ("stop_demo" == e.data) {
		        clearInterval(timer);
		        $(document).unbind('mousemove');
		        $('#fonts button').unbind('mousedown').unbind('mouseup');
		        $('#mr').unbind('click').unbind('mousedown');
		        $('#ms').unbind('click').unbind('mousedown');
		        
		        window.parent.postMessage('finished_exit', targetOrigin);
		        
		    };
		    
		}, false);
				
		
		
		// start	
		
		var startLight = function() {
			$('body').fadeIn(400);
			window.parent.postMessage('loaded', targetOrigin);		
		}
		
		setTimeout(startLight, 500);
				
		
		
	});
		

});



