/** -*- compile-command: "jslint-cli init.js" -*-
 *
 * Copyright (C) 2010 Cedric Pinson
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

var State;


function search(text) {
    var element = Tree[LevelStack[LevelStack.length-1]];

    for (var i = 0, l = element.getChildren().length; i < l; i++) {
        var child = element.getChildren()[i];
        var result = child.realName.match(text);
        if (result !== null) {
            osg.log("match " + text.toString()  + " in " + child.realName);
        }
    }
}




function getWindowSize() {
    var myWidth = 0, myHeight = 0;
    
    if( typeof( window.innerWidth ) == 'number' ) {
        //Non-IE
        myWidth = window.innerWidth;
        myHeight = window.innerHeight;
    } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
        //IE 6+ in 'standards compliant mode'
        myWidth = document.documentElement.clientWidth;
        myHeight = document.documentElement.clientHeight;
    } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
        //IE 4 compatible
        myWidth = document.body.clientWidth;
        myHeight = document.body.clientHeight;
    }
    return { 'w': myWidth, 'h': myHeight };
//    window.alert( 'Width = ' + myWidth );
//    window.alert( 'Height = ' + myHeight );
}



var numberFrame = 0;
var startTime;
var updateVisitor = new osg.UpdateVisitor();
var cullVisitor = new osg.CullVisitor();
var cullVisitorNew = new osg.CullVisitorNew();
var textRenderingCanvas;
var textRenderingProcessing;


function createTextureText(str)
{
    if (textRenderingCanvas === undefined) {
        textRenderingCanvas = document.getElementById("TextRendering");
    }
    if (textRenderingCanvas === undefined) {
        return undefined;
    }

    var canvas = textRenderingCanvas;
    canvas.ctx = canvas.getContext("2d");
    var c = canvas.ctx;
    c.fillStyle = "#000";
    c.fillRect(0, 0, 500, 500);
    
    c.font = "12px AaarghNormal";
    c.fillStyle = "#fff";
//    c.textAlign("center");
//    c.textBaseline("middle");
    c.fillText(str, 2, 30);
    var t = osg.Texture.createFromCanvas(textRenderingCanvas);
    t.texture_text = str;
    return t;
}



var oldImplementation = { 
    draw: function() {
        cullVisitor.renderBin.drawImplementation(State);
    },
    cull: function() {
        cullVisitor.reset();
        root.accept(cullVisitor);
    }
};

var RenderStage;
var StateGraph;

var newImplementation = { 
    draw: function() {
        RenderStage.draw(State);
    },
    cull: function() {
        root.setRenderOrder(osg.Camera.NESTED_RENDER);
        StateGraph.clean();

        RenderStage.reset();
        RenderStage.setViewport(root.getViewport());

        cullVisitorNew.reset();
        cullVisitorNew.setStateGraph(StateGraph);
        cullVisitorNew.setRenderStage(RenderStage);

        root.accept(cullVisitorNew);
    }
};

var IMPLEMENTATION=newImplementation;

function draw() {
    IMPLEMENTATION.draw();
}
function cull() {
    IMPLEMENTATION.cull();
}

function frame() {
    var cullTime;
    var frameTime;
    var drawTime;

    if (RenderStage === undefined) {
        RenderStage = new osg.RenderStage();
    }
    if (StateGraph === undefined) {
        StateGraph = new osg.StateGraph();
        StateGraph.stateset = new osg.StateSet();
    }
//    createTextureText("Toto l'asticot");

    frameTime = (new Date()).getTime();
    if (updateVisitor.getFrameStamp().getFrameNumber() === 0) {
        var result = createScene();
        root.addChild(result);
        updateVisitor.getFrameStamp().setReferenceTime(frameTime/1000.0);

        search('a');
    }
    updateVisitor.getFrameStamp().setSimulationTime(frameTime/1000.0 - updateVisitor.getFrameStamp().getReferenceTime());

    if (root.manipulator) {
        root.setViewMatrix(root.manipulator.getInverseMatrix());
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    root.accept(updateVisitor);

    cullTime = (new Date()).getTime();
    cull();
    cullTime = (new Date()).getTime() - cullTime;
        //jQuery("#cullTime").text(cullTime/1000.0);

    drawTime = (new Date()).getTime();
    draw();
    drawTime = (new Date()).getTime() - drawTime;
        //jQuery("#drawTime").text(drawTime/1000.0);

    var f = updateVisitor.getFrameStamp().getFrameNumber()+1;
    updateVisitor.getFrameStamp().setFrameNumber(f);

    numberFrame++;
    if (numberFrame % 60 === 0.0) {
        /* Run a test. */
        var nd = (new Date()).getTime();
        var diff = nd - startTime;

        jQuery("#fps").text(numberFrame/(diff/1000));
        startTime = nd;
        numberFrame = 0;
    }

    frameTime = (new Date()).getTime() - frameTime;
    //jQuery("#frameTime").text(updateVisitor.getFrameStamp().getSimulationTime());
}



var Cube;
function webGLStart() {

    var size = getWindowSize();
    jQuery('#3DView').css("width",size.w);
    jQuery('#3DView').css("height", size.h);
    jQuery('#3DView').css("margin", -8);
    jQuery('#3DView').css("padding", 0);
    jQuery('#3DView').css("left", 0);

//    getTwitt();

    if (Fullscreen === true) {
        jQuery('#title').hide();
    }
    if (Fullscreen === true)
        jQuery('#debugInfo').hide();

    var canvas = document.getElementById("3DView");
    canvas.width = size.w;
    canvas.height = size.h;

    osg.initGL(canvas);
    State = osg.State.create();

    var ratio = size.w/size.h;

    root = new osg.View();
    root.light = osg.Light.create();

    root.setViewport(new osg.Viewport(0,0,size.w,size.h));
    root.setViewMatrix(osg.Matrix.makeLookAt([0,0,-10], [0,0,0], [0,1,0]));
    root.setProjectionMatrix(osg.Matrix.makePerspective(90, ratio, 0.001, 100.0));


    gl.clearColor(0.09, 0.18, 0.22, 1.0);

    gl.clearDepth(1.0);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthFunc(gl.LEQUAL);
    gl.lineWidth(2.0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
//    gl.viewport(0,0,size.w, size.h);
    setTimeout(function() {
        initMeta();
        setInterval(frame, 16);
    }, 4.0);

    // Grab processing.js instance, disable looping
//    textRenderingProcessing.noLoop();
}


