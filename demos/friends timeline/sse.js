function onload() {
	var timeline = document.getElementById( "timeline" ), 
		lastMsg = document.getElementById( "lastMsg" ),
		// Create the EventSource
		evtSrc = new EventSource( "http://www.oclast.com/sse.php" ),
		message = document.createElement( "div" );
	message.classList.add( "msg" );

	// Listen for messages/events on the EventSource
	evtSrc.onmessage = function ( e ) {
		addMessage( "status", JSON.parse(e.data) );
	}
	evtSrc.addEventListener("checkin", function( e ) {
		addMessage( "checkin", JSON.parse(e.data) );
	}, false);
	evtSrc.addEventListener("forward", function( e ) {
		addMessage( "forward", JSON.parse(e.data) );
	}, false);
	evtSrc.addEventListener("direct", function( e ) {
		addMessage( "direct", JSON.parse(e.data) );
	}, false);

	// Functions to display the messages
	function addMessage( type, data ) {
		var msg = message.cloneNode( false ),
			content;
		msg.classList.add( type );
		content = "<b>☺ " + userStr( data.from ) + "</b>";
		if ( type === "forward" ) {
			content += " » by " + userStr( data.through );
		}
		content += "<br/>" + ( data.msg || "<em>currently at</em> " + data.place ) + "<br/>";
		content += "<i>¤ " + data.location + "</i>";
		msg.innerHTML = content;
		lastMsg = timeline.insertBefore( msg, lastMsg );
	}

	function userStr( name ) {
		return "<a href='#"+ name +"'>"+ name +"</a>";
	}
}