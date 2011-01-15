/** -*- compile-command: "jslint-cli demo.js" -*-
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

var TextRenderingCanvas;

function createTextureText(str, texture)
{
    if (TextRenderingCanvas === undefined) {
        TextRenderingCanvas = document.getElementById("TextRendering");
    }

    var canvas = TextRenderingCanvas;
    var textureSizeX = canvas.width;
    var textureSizeY = canvas.height;

    canvas.ctx = canvas.getContext("2d");
    var c = canvas.ctx;
    c.textBaseline = "middle";
//    c.globalCompositeOperation = "copy";
    c.clearRect (0, 0, textureSizeX, textureSizeY);
//    c.fillStyle = "rgba(0,0,0,0.0)";
//    c.fillRect(0, 0, textureSizeX, textureSizeY);
//    c.globalCompositeOperation = "source-over";

    c.font = "25px CartoGothicStd-Bold";
    var size = c.measureText(str).width;
   
    c.fillStyle = "rgba(255, 255, 255, 1.0)";
	c.shadowOffsetX = 1;
	c.shadowOffsetY = 1;
	c.shadowBlur    = 1;
	c.shadowColor   = 'rgba(0, 0, 0, 1)';
    c.fillText(str, textureSizeX/2.0 - size/2.0 , textureSizeY/2.0);


    var t;
    if (texture !== undefined) {
        t = texture;
        t.setFromCanvas(TextRenderingCanvas);
    } else {
        t = osg.Texture.createFromCanvas(TextRenderingCanvas);
    }
    t.texture_text = str;
    return t;
}
