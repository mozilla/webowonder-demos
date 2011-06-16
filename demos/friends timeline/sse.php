<?php

// Send appropriate mime type
header("Content-Type: text/event-stream\n\n");

// Read sample messages
$filename = "timelineEvents.txt";
$handle = fopen($filename, "r");
$contents = fread($handle, filesize($filename));
fclose($handle);

// Split the messages into an array
$messages = preg_split( "/\n\n/", $contents );

// Send one message every 2 to 7 seconds
foreach ( $messages as $message ) {
	echo $message;
	echo "\n\n";

	ob_flush();
	flush();

	sleep( rand(2, 7) );
}

?>