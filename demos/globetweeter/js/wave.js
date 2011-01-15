/** -*- compile-command: "jslint-cli wave.js" -*-
 *
 * Copyright (C) 2010 Cedric Pinson
 *
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
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

var Wave = function()
{
    this.buffers = [];
    this.buffers.push(document.getElementById("HeightMap"));
    this.buffers.push(document.getElementById("HeightMap2"));
    this.currentBuffer = 0;
    var prevCtx = this.buffers[0].getContext("2d");
    prevCtx.fillStyle = "rgb(0,0,0)";
    prevCtx.fillRect(0,0, this.buffers[0].width,this.buffers[0].height);
    var newCtx = this.buffers[1].getContext("2d");
    newCtx.fillStyle = "rgb(0,0,0)";
    newCtx.fillRect(0,0, this.buffers[0].width,this.buffers[0].height);

    this.lastUpdate;
    this.hitsList = [];

    this.nb = 0;
    this.duration = 0;
};
Wave.prototype = {
    processHits: function(hits, prevImageData) {
        for (var h = 0, nbl = hits.length; h < nbl; h++) {
            var width = prevImageData.width;
            var pdata2 = prevImageData.data;
            coord = hits[h];
            var x = parseInt(Math.floor(coord[0]));
            var y = parseInt(Math.floor(coord[1]));
            var currentHeight = pdata2[(y * width + x ) * 4];
            currentHeight += 25;
            if (currentHeight > 255) {
                currentHeight = 255;
            }
            pdata2[(y * width + x ) * 4] = currentHeight;
        }
    },
    update: function() {
        var enter = (new Date()).getTime();
        var dt = 1.0/30.0;
        var currentTime = (new Date()).getTime()/1000.0;
        if (this.lastUpdate === undefined) {
            this.lastUpdate = currentTime;
        }
        var diff = currentTime-this.lastUpdate;
        if (diff < dt) {
            //osg.log("skip");
            return;
        }

        var nb = parseInt(Math.floor(diff/dt));
        for (var step = 0, l = nb; step < l; step++) {
            
            var prevBuffer = this.buffers[this.currentBuffer];
            var newBuffer = this.buffers[(this.currentBuffer+1)%2];

            var prevCtx = prevBuffer.getContext("2d");
            var newCtx = newBuffer.getContext("2d");
            
            var prevImageData = prevCtx.getImageData(0, 0, prevBuffer.width, prevBuffer.height);
            var newImageData = newCtx.getImageData(0, 0, prevBuffer.width, prevBuffer.height);

            var width = prevBuffer.width;
            var height = prevBuffer.height;

            var coord;
            var refresh = (this.hitsList.length > 0);
            if (refresh === true) {
                this.processHits(this.hitsList, prevImageData);
                prevCtx.putImageData(prevImageData, 0, 0);
                this.hitsList.length = 0;
            }

            for (var total = 0, w = width, h = height, totalIteration = width*height; total < totalIteration; total++) {
                
                var A = dt*dt*340.0/10.0;
                var B = 2.0-4.0*A;
                var damping = 0.996;
                
                var i = total%w;
                var j = Math.floor(total/w);

                var pdata = prevImageData.data;
                var ndata = newImageData.data;
                var up = pdata[(((j-1+h)%h) * w + i) * 4];
                var down = pdata[(((j+1)%h) * w + i) * 4];
                var left  = pdata[(j * w + (i-1+w)%w ) * 4];
                var right = pdata[(j * w + (i+1)%w ) * 4];
                var newvalue = A*(up+down+left+right) + B*pdata[(j * w + i ) * 4] - ndata[(j * w + i) * 4];
                newvalue *= damping;
                ndata[(j * w + i) * 4] = newvalue;
            }

            newCtx.putImageData(newImageData, 0, 0);
            this.swapbuffer();
        }
        this.lastUpdate += dt*nb;

        this.duration += (new Date()).getTime()-enter;
        this.nb +=1;
        if (this.lastDisplay === undefined) {
            this.lastDisplay = enter;
        }
        if (false && (enter - this.lastDisplay)/1000.0 > 2.0) {
            this.lastDisplay = enter;
            osg.log("average time in ms per iteration " + this.duration/this.nb);
        }
    },

    setLatLng: function(lat, lng) {
        var canvas = this.buffers[this.currentBuffer];
        lng = lng * canvas.width/360.0 + canvas.width/2.0;
        lat = -1.0 * lat * canvas.height/180.0 + canvas.height/2.0;
        this.hitsList.push([lng,lat]);
    },

    getCanvas: function() {
        return this.buffers[(this.currentBuffer+1)%2];
    },

    swapbuffer: function() {
        this.currentBuffer = (this.currentBuffer + 1)%2;
    }
  
};