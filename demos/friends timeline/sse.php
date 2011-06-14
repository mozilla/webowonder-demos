<?php

// Send appropriate mime type
header("Content-Type: text/event-stream\n\n");

// Parse messages
$filename = "timelineEvents.txt";
$handle = fopen($filename, "r");
$contents = fread($handle, filesize($filename));
fclose($handle);

$messages = preg_split( "/\n\n/", $contents );

// Send a new message very 2 to 7 seconds
foreach ( $messages as $message ) {
	sleep( rand(2, 7) );
	echo $message;
	echo "\n\n";

	ob_flush();
	flush();
}

?>