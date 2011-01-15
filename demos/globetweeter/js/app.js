/** -*- compile-command: "jslint-cli app.js" -*-
 *
 * Copyright (C) 2011 Cedric Pinson
 *
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Authors:
 *  Cedric Pinson <cedric.pinson@plopbyte.net>
 *
 */

var FakeTweets;
var Socket;
var LastTweetReceived;
function startNetwork() {
    try {
        var checkNetwork = function() {
            if (FakeTweets === undefined) {
                var now = new Date();
                var elapsed = (now.getTime()-LastTweetReceived.getTime())/1000.0;
                if (elapsed > 5.0) {
                    osg.log("no tweet received from 5 seconds, restart connection");
                    startNetwork();
                    setTimeout(checkNetwork, 5000);
                }
            }
        };

        // change here to point to your socket.io server
        var socket = new io.Socket("184.106.112.6",{ port: 22048 });
        //var socket = new io.Socket(document.location.hostname);
        Socket = socket;
        socket.connect();
        socket.on('message', function(message){
            LastTweetReceived = new Date();
            processTweet(message);
        });
        socket.on('connect', function(message){
            LastTweetReceived = new Date();
            osg.log("connected to server, run the checker every 5.0 seconds");
            checkNetwork();
        });
        socket.on('disconnect', function(message){
            Socket = undefined;
            if (DemoState.running === true) {
                osg.log(message);
                osg.log("disconnect, try to reconnect");
                startNetwork();
            }
        });
    } catch (er) {
        osg.log(er);
        osg.log("offline mode, emitting fake tweets");
        jQuery.getJSON("js/samples.json", function(data) {
            osg.log("offline data ready, emitting fake tweets");
            FakeTweets = data;
            var tweetIndex = 0;
            var emitFakeTweet = function() {
                tweetIndex = (tweetIndex+1)%FakeTweets.length;
                processTweet(FakeTweets[tweetIndex]);
                window.setTimeout(emitFakeTweet, 0.25*1000);
            };
            emitFakeTweet();

        });
    }
}