
var hideConnection = function() {
    jQuery('#connection').addClass('hidden');
    setTimeout(function() {
        jQuery('#location-instructions').hide();
    }, 3000);
};

var showConnection = function() {
    jQuery('#connection').show();
    setTimeout(function() {
        jQuery('#connection').removeClass('hidden');
    }, 3000);
};

var hideRankingInstructions = function() {
    jQuery('#ranking-instructions').addClass('hidden');
    
    setTimeout(function(){
	jQuery('#ranking-instructions').remove();
    },1000);		
};

var showInstructions;

var initializeInstructions = function(canvas, scene) 
{
    jQuery('#location-instructions').hide();
    showInstructions = function() {

        setTimeout(function() {
	    jQuery('#demo-instructions').removeClass('hidden');
        },3000);

        jQuery('#demo-instructions span.dismiss').click(function() {
	    jQuery('#demo-instructions').addClass('hidden');
	    
	    setTimeout(function(){
	        jQuery('#demo-instructions').remove();

	        setTimeout(function(){
		    jQuery('#ranking-instructions').removeClass('hidden');
	        },1000);
	    },1000);		
        });

        jQuery('#ranking-instructions span.dismiss').click(function() {
            hideRankingInstructions();
        });

        jQuery('#credits header').click(function() {		
	    if(jQuery('#credits').hasClass('visible')) {
	        jQuery('#credits').removeClass('visible');
	    } else {
	        jQuery('#credits').addClass('visible');
	    }		
        });

        var geoLocSuccess = function(pos) {
            var img = new Image();
            img.src = "img/youarehere.png";
            var node = displayYouAreHere(pos.coords.latitude, pos.coords.longitude, img);
            scene.addChild(node);
            osg.log("You hare at lat(" + pos.coords.latitude + ") lng("+pos.coords.longitude + ")");
            var f = function(event) {
                Viewer.manipulator.goToLocation(pos.coords.latitude, pos.coords.longitude);
                return true;
            };
            jQuery(canvas).dblclick( f );
            jQuery(canvas).dblclick();

	    jQuery('#location-instructions img').remove();
	    jQuery('#location-instructions').addClass('normal').text('Geolocation succesful! Double-click anywhere to return to your location.');
        };
        var geoLocError = function () {
            // The user click no or something wrong happenned, ignore
            osg.log("no geolocation get");
        };


        jQuery('#shareLocation').click(function() {
	    //start geolocation request here
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(geoLocSuccess, geoLocError);
	        jQuery('#location-instructions').append("<img src=\"img/spinner.gif\">");
            } else {
                // not supported
                osg.log("no geo location in your browser");
            }

	    setTimeout(function() {
	        jQuery('#shareLocation').fadeOut(300);
	        
	        setTimeout(function() {
		    jQuery('#location-instructions').fadeIn(200);
	        },300);
	    },200);
	    
        });
    };
};