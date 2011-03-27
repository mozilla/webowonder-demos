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
var LastTweetReceived = new Date();
var ConnectionTimeoutCheck = 10;
var CheckNetworkTimeout;
var NbCheckNetworkTimeout = 0;
var StreamConnected = 0;

function startNetwork() {
    try {
        jQuery('#connection').show();
        jQuery('#connection').removeClass('hidden');

        var checkNetwork = function() {
            if (CheckNetworkTimeout !== undefined) {
                window.clearTimeout(CheckNetworkTimeout);
                CheckNetworkTimeout = undefined;
            }
            var now = new Date();
            osg.log("checkNetwork " + now.getTime()/1000);
            if (FakeTweets === undefined) {
                var elapsed = (now.getTime()-LastTweetReceived.getTime())/1000.0;
                if (elapsed > ConnectionTimeoutCheck) {
                    //showConnection();
                    osg.log("no tweets received for " + ConnectionTimeoutCheck +" seconds");
                    if (NbCheckNetworkTimeout > 3) {
                        osg.log("no tweets received for " + ConnectionTimeoutCheck*3 +" seconds, restart connection");
                        if ( Socket !== undefined) {
                            Socket.connect();
                        } else {
                            startNetwork();
                        }
                        NbCheckNetworkTimeout = 0;
                        return;
                    } else {
                        showConnection();
                    }
                    NbCheckNetworkTimeout += 1;
                    //startNetwork();
                    //return;
                } else {
                    NbCheckNetworkTimeout = 0;
                }
                CheckNetworkTimeout = setTimeout(checkNetwork, ConnectionTimeoutCheck*1000);
            }
        };

        // change here to point to your socket.io server
        var socket = new io.Socket("184.106.112.6",{ port: 22048 }, {transports:['websocket', 'htmlfile', 'xhr-polling']});
        //var socket = new io.Socket(document.location.hostname);
        Socket = socket;
        socket.connect();
        socket.on('message', function(message){
            hideConnection();
            LastTweetReceived = new Date();
            processTweet(message);
        });
        socket.on('connect', function(message){
            StreamConnected += 1;
            if (StreamConnected === 1) {
                showInstructions();
            }
            hideConnection();
            LastTweetReceived = new Date();
            osg.log("connected to server");
            //checkNetwork();
        });
        socket.on('disconnect', function(message){
            if (DemoState.running === true) {
                showConnection();
                osg.log("disconnect, try to reconnect");

                if ( Socket !== undefined) {
                    Socket.connect();
                } else {
                    startNetwork();
                }
            }
        });
        socket.on('error', function(message) {
            osg.log("error, try to reconnect");
            showConnection();
            if ( Socket !== undefined) {
                Socket.connect();
            } else {
                startNetwork();
            }
        });

        osg.log("run the checker every " + ConnectionTimeoutCheck + " seconds");
        setTimeout(checkNetwork, ConnectionTimeoutCheck*1000);

    } catch (er) {
        hideConnection();
        showInstructions();
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