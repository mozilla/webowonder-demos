/** -*- compile-command: "jslint-cli demo2.js" -*-
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

var Fullscreen = false;
var LandColor = [ 0.1450980392156863,0.43529411764705883,0.5176470588235295,1];
var LandFrontColor = [0.21568627450980393,0.6470588235294118,0.7647058823529411,0.8666666666666667];
var CountryColor = [0.2,0.2,0.2,1];
var HeightColor = [0.21568627450980393,0.6470588235294118,0.7647058823529411,0.8666666666666667];
HeightColor = [1.0,0,0,1.0];
HeightColor = [0.4588235294117647,0.8509803921568627,0.9725490196078431,1];
var Debug = false;

var TextureGenerateStamp = 0;
var WaveGenerator;

//Convert a hex value to its decimal value - the inputted hex must be in the
//	format of a hex triplet - the kind we use for HTML colours. The function
//	will return an array with three values.
function hex2num(hex) {
    if(hex.charAt(0) == "#") hex = hex.slice(1); //Remove the '#' char - if there is one.
    hex = hex.toUpperCase();
    var hex_alphabets = "0123456789ABCDEF";
    var value = new Array(4);
    var k = 0;
    var int1,int2;
    for(var i=0;i<8;i+=2) {
	int1 = hex_alphabets.indexOf(hex.charAt(i));
	int2 = hex_alphabets.indexOf(hex.charAt(i+1)); 
	value[k] = (int1 * 16) + int2;
        value[k] = value[k]/255.0;
	k++;
    }
    return(value);
}
//Give a array with three values as the argument and the function will return
//	the corresponding hex triplet.
function num2hex(triplet) {
    var hex_alphabets = "0123456789ABCDEF";
    var hex = "";
    var int1,int2;
    for(var i=0;i<4;i++) {
        var v = triplet[i] * 255.0;
	int1 = v / 16;
	int2 = v % 16;
	hex += hex_alphabets.charAt(int1) + hex_alphabets.charAt(int2); 
    }
    return(hex);
}


var WorldProgram;
function getWorldProgram()
{
    if (WorldProgram === undefined) {
        var vertexshader = [
            "",
            "#ifdef GL_ES",
            "precision highp float;",
            "#endif",
            "attribute vec3 Vertex;",
            "uniform mat4 ModelViewMatrix;",
            "uniform mat4 ProjectionMatrix;",
            "uniform vec4 fragColor;",
            "void main(void) {",
            "  gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(Vertex,1.0);",
            "}",
            ""
        ].join('\n');

        var fragmentshader = [
            "",
            "#ifdef GL_ES",
            "precision highp float;",
            "#endif",
            "uniform vec4 fragColor;",
            "void main(void) {",
            "gl_FragColor = fragColor;",
            "}",
            ""
        ].join('\n');

        var program = osg.Program.create(
            osg.Shader.create(gl.VERTEX_SHADER, vertexshader),
            osg.Shader.create(gl.FRAGMENT_SHADER, fragmentshader));

        WorldProgram = program;
    }
    return WorldProgram;
}

function getWorldShader()
{
    var stateset = new osg.StateSet();
    var uniform = osg.Uniform.createFloat4(LandColor,"fragColor");
    stateset.setAttributeAndMode(getWorldProgram());
    stateset.addUniform(uniform);

    jQuery("#lands").val(num2hex(LandColor));
    jQuery("#lands").change(function(data) {
        var val = jQuery("#lands").val();
        var newval = hex2num(val);
        osg.log("country color changed to " + newval);
        uniform.set(newval);
    });

    return stateset;
}

function getWorldShader2()
{
    var stateset = new osg.StateSet();
    var uniform = osg.Uniform.createFloat4(LandFrontColor,"fragColor");
    stateset.setAttributeAndMode(getWorldProgram());
    stateset.addUniform(uniform);

    jQuery("#landsFront").val(num2hex(LandFrontColor));
    jQuery("#landsFront").change(function(data) {
        var val = jQuery("#landsFront").val();
        var newval = hex2num(val);
        osg.log("country front color changed to " + newval);
        uniform.set(newval);
    });

    return stateset;
}




function getCountryShader()
{
    var vertexshader = [
        "",
        "#ifdef GL_ES",
        "precision highp float;",
        "#endif",
        "attribute vec3 Vertex;",
        "uniform mat4 ModelViewMatrix;",
        "uniform mat4 ProjectionMatrix;",
        "void main(void) {",
        "  gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(Vertex,1.0);",
        "}",
        ""
    ].join('\n');

    var fragmentshader = [
        "",
        "#ifdef GL_ES",
        "precision highp float;",
        "#endif",
        "uniform vec4 fragColor;",
        "void main(void) {",
        "gl_FragColor = fragColor;",
        "}",
        ""
    ].join('\n');

    var program = osg.Program.create(
        osg.Shader.create(gl.VERTEX_SHADER, vertexshader),
        osg.Shader.create(gl.FRAGMENT_SHADER, fragmentshader));
    var stateset = new osg.StateSet();
    var uniform = osg.Uniform.createFloat4(CountryColor,"fragColor");
    stateset.setAttributeAndMode(program);
    stateset.addUniform(uniform);

    jQuery("#country").val(num2hex(CountryColor));
    jQuery("#country").change(function(data) {
        var val = jQuery("#country").val();
        var newval = hex2num(val);
        osg.log("country color changed to " + newval);
        uniform.set(newval);
    });
    
    return stateset;
}


function getHeightShaderVolume()
{
    var vertexshader = [
        "",
        "#ifdef GL_ES",
        "precision highp float;",
        "#endif",
        "attribute vec3 Vertex;",
        "attribute vec3 TexCoord0;",
        "uniform mat4 ModelViewMatrix;",
        "uniform mat4 ProjectionMatrix;",
        "uniform mat4 NormalMatrix;",
        "uniform float scale;",
        "uniform sampler2D Texture0;",
        "varying float height;",
        "float maxHeight = 1400000.0;",
        "void main(void) {",
        "  vec4 color = texture2D( Texture0, TexCoord0.xy);",
        "  height = color[0];",
        "  vec3 normal = normalize(Vertex);",
        "  vec3 normalTransformed = vec3(NormalMatrix * vec4(normal,0.0));",
        "  float dotComputed = dot(normalTransformed, vec3(0,0,1));",
        "  height *= max(0.0, dotComputed);",
        "  gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(Vertex +  normal * ( height * maxHeight * scale),1.0);",
        "  height *= 5.0 * scale;",
        "}",
        ""
    ].join('\n');

    var fragmentshader = [
        "",
        "#ifdef GL_ES",
        "precision highp float;",
        "#endif",
        "uniform vec4 fragColor;",
        "varying float height;",
        "void main(void) {",
        "gl_FragColor = fragColor * height;",
        "}",
        ""
    ].join('\n');

    var program = osg.Program.create(
        osg.Shader.create(gl.VERTEX_SHADER, vertexshader),
        osg.Shader.create(gl.FRAGMENT_SHADER, fragmentshader));
    var stateset = new osg.StateSet();
    var uniform = osg.Uniform.createFloat4(HeightColor,"fragColor");
    var scale = osg.Uniform.createFloat1(scale,"scale");
    var uniformTexture = osg.Uniform.createInt1(0, "Texture0");
    stateset.setAttributeAndMode(program);
    stateset.setAttributeAndMode(new osg.LineWidth(1.0));
    stateset.addUniform(uniform);
    stateset.addUniform(uniformTexture);
    stateset.addUniform(scale);

    jQuery("#height").val(num2hex(HeightColor));
    jQuery("#height").change(function(data) {
        var val = jQuery("#height").val();
        var newval = hex2num(val);
        osg.log("height color changed to " + newval);
        uniform.set(newval);
    });
    
    return stateset;
}


function getHeightShaderFlat()
{
    var vertexshader = [
        "",
        "#ifdef GL_ES",
        "precision highp float;",
        "#endif",
        "attribute vec3 Vertex;",
        "attribute vec3 TexCoord0;",
        "uniform mat4 ModelViewMatrix;",
        "uniform mat4 ProjectionMatrix;",
        "uniform mat4 NormalMatrix;",
        "varying float dotComputed;",
        "varying vec2 TexCoordFragment;",
        "void main(void) {",
        "  TexCoordFragment = TexCoord0.xy;",
        "  vec3 normal = normalize(Vertex);",
        "  vec3 normalTransformed = vec3(NormalMatrix * vec4(normal,0.0));",
        "  dotComputed = max(0.0, dot(normalTransformed, vec3(0,0,1)));",
        "  if (dotComputed > 0.001) {",
        "     dotComputed = 1.0;",
        "  }",
        "  gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(Vertex, 1);",
        "}",
        ""
    ].join('\n');

    var fragmentshader = [
        "",
        "#ifdef GL_ES",
        "precision highp float;",
        "#endif",
        "uniform sampler2D Texture0;",
        "uniform vec4 fragColor;",
        "uniform float scale;",
        "varying float dotComputed;",
        "varying vec2 TexCoordFragment;",
        "void main(void) {",
        "  vec4 color = texture2D( Texture0, TexCoordFragment.xy);",
        "gl_FragColor = fragColor * min(2.0*dotComputed * color.x, 0.999999);",
        "}",
        ""
    ].join('\n');

    var program = osg.Program.create(
        osg.Shader.create(gl.VERTEX_SHADER, vertexshader),
        osg.Shader.create(gl.FRAGMENT_SHADER, fragmentshader));
    var stateset = new osg.StateSet();
    var uniform = osg.Uniform.createFloat4(HeightColor,"fragColor");
    var scale = osg.Uniform.createFloat1(scale,"scale");
    var uniformTexture = osg.Uniform.createInt1(0, "Texture0");
    stateset.setAttributeAndMode(program);
    stateset.setAttributeAndMode(new osg.LineWidth(1.0));
    stateset.addUniform(uniform);
    stateset.addUniform(uniformTexture);
    stateset.addUniform(scale);

    jQuery("#height").val(num2hex(HeightColor));
    jQuery("#height").change(function(data) {
        var val = jQuery("#height").val();
        var newval = hex2num(val);
        osg.log("height color changed to " + newval);
        uniform.set(newval);
    });
    
    return stateset;
}

var TweetShader;
function getTweetShader()
{
    if (TweetShader === undefined) {
        var vertexshader = [
            "",
            "#ifdef GL_ES",
            "precision highp float;",
            "#endif",
            "attribute vec3 Vertex;",
            "attribute vec2 TexCoord0;",
            "uniform mat4 ModelViewMatrix;",
            "uniform mat4 ProjectionMatrix;",
            "varying vec2 FragTexCoord0;",
            "void main(void) {",
            "  gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(Vertex,1.0);",
            "  FragTexCoord0 = TexCoord0;",
            "}",
            ""
        ].join('\n');

        var fragmentshader = [
            "",
            "#ifdef GL_ES",
            "precision highp float;",
            "#endif",
            "uniform vec4 fragColor;",
            "uniform sampler2D Texture0;",
            "varying vec2 FragTexCoord0;",
            "void main(void) {",
            "vec4 color = texture2D( Texture0, FragTexCoord0.xy);",
            "float a = color[3];",
            "color = color*a;",
            "color[3]= a;",
            "gl_FragColor = color*fragColor[0];",
            "}",
            ""
        ].join('\n');

        var program = osg.Program.create(
            osg.Shader.create(gl.VERTEX_SHADER, vertexshader),
            osg.Shader.create(gl.FRAGMENT_SHADER, fragmentshader));

        TweetShader = program;
    }
    var stateset = new osg.StateSet();
    var uniform = osg.Uniform.createFloat4([1.0,
                                            0.0,
                                            1.0,
                                            0.5],"fragColor");
    stateset.setAttributeAndMode(TweetShader);
    //stateset.setAttributeAndMode(new osg.BlendFunc('ONE', 'ONE_MINUS_SRC_ALPHA'));
    stateset.addUniform(uniform);
    return stateset;
}

function getCountryCodeFromName(name)
{
    if ( Country2Flag[name] === undefined) {
        osg.log("Can't find coutry code from " + name);
        return undefined;
    }
    return Country2Flag[name];
}



var RecycleImages = [];
function getOrCreateNewImage()
{
    var img;
    if (RecycleImages.length === 0) {
        var img = new Image();
    } else {
        img = RecycleImages.pop();
    }
    return img;
}


function TweetDisplayCallback() {
    this.WGS_84_RADIUS_EQUATOR = 6378137.0;
    this.limit = this.WGS_84_RADIUS_EQUATOR*0.5;
}

TweetDisplayCallback.prototype = {
    
    update: function(node, nv) {
        var ratio = 0;
        var currentTime = nv.getFrameStamp().getSimulationTime();
        if (node.startTime === undefined) {
            node.startTime = currentTime;
            if (node.duration === undefined) {
                node.duration = 5.0;
            }
        }

        var dt = currentTime - node.startTime;
        if (dt > node.duration) {
            node.setNodeMask(0);
            return;
        }
        ratio = dt/node.duration;
        if (node.originalMatrix) {
            var scale;
            if (dt > 1.0) {
                scale = 1.0;
            } else {
                scale = osgAnimation.EaseOutElastic(dt);
            }

            scale = scale * (this.manipulator.height/this.WGS_84_RADIUS_EQUATOR);
            if (this.manipulator.height > this.limit) {
                var rr = 1.0 - (this.manipulator.height-this.limit) * 0.8/(2.5*this.WGS_84_RADIUS_EQUATOR-this.limit);
                scale *= rr;
            }
            node.setMatrix(osg.Matrix.mult(osg.Matrix.makeScale(scale, scale, scale),node.originalMatrix));
        }

        var value = (1.0 - osgAnimation.EaseInQuad(ratio));
        var uniform = node.uniform;
        var c = [value, value, value, value];
        uniform.set(c);
        node.traverse(nv);
    }
};
var GlobalTweetDisplayCallback;
function getOrCreateTweetDisplayCallback() {
    if (GlobalTweetDisplayCallback === undefined) {
        GlobalTweetDisplayCallback = new TweetDisplayCallback();
        GlobalTweetDisplayCallback.manipulator = Viewer.getManipulator();
    }
    return GlobalTweetDisplayCallback;
}




function fmod(a, b){
    var x = Math.floor(a/b);
    return a - b*x;
}

function YouAreHereDisplayCallback() {
    this.WGS_84_RADIUS_EQUATOR = 6378137.0;
    this.limit = this.WGS_84_RADIUS_EQUATOR*0.5;
}

YouAreHereDisplayCallback.prototype = {
    update: function(node, nv) {
        var currentTime = nv.getFrameStamp().getSimulationTime();
        if (node.startTime === undefined) {
            node.startTime = currentTime;
            if (node.duration === undefined) {
                node.duration = 1.0;
            }
            if (node.duration0 === undefined) {
                node.duration0 = 0.1;
            }
            if (node.duration1 === undefined) {
                node.duration1 = 0.2;
            }
        }

        var dt = currentTime - node.startTime;
        dt = fmod(dt, node.duration);
        var ratio = dt/node.duration;
        var ratio0 = dt/node.duration0;
        var ratio1 = (dt-node.duration0)/node.duration1;

        var scale;
//        var value = osgAnimation.EaseOutQuart(ratio);
//        scale = 0.5 + value * 0.5;

        var value;
        if (ratio0 < 1.0) {
            value = osgAnimation.EaseOutQuart(ratio0);
        } else if (ratio1 < 1.0) {
            value = 1.0 - osgAnimation.EaseOutQuart(ratio1);
        } else {
            value = 0.0;
        }
        scale = 0.7 + value * 0.5;

        scale = scale * (this.manipulator.height/this.WGS_84_RADIUS_EQUATOR);
        if (this.manipulator.height > this.limit) {
            var rr = 1.0 - (this.manipulator.height-this.limit) * 0.8/(2.5*this.WGS_84_RADIUS_EQUATOR-this.limit);
            scale *= rr;
        }
        node.setMatrix(osg.Matrix.mult(osg.Matrix.makeScale(scale, scale, scale),node.originalMatrix));

        //var uniform = node.uniform;
        //var value2 = 1.0 - osgAnimation.EaseInQuad(ratio);
        //var c = [value2, value2, value2, value2];
        //uniform.set(c);

        node.traverse(nv);
    }
};



var RecycleTweets = [];
var RecycleTweetsTags = [];
function cleanExpiredTweets(scene)
{
    // clean old items
    var toRemove = [];
    var childs = scene.getChildren();
    for (var i = 0, l = childs.length; i < l; ++i) {
        var child = childs[i];
        if (child.getNodeMask() === 0) {
            toRemove.push(child);
        }
    }

    while (toRemove.length > 0) {
        var item = toRemove.pop();
        if (item.itemType === "tweet")
            RecycleTweets.push(item);
        else if (item.itemType === "tag")
            RecycleTweetsTags.push(item);
            
        scene.removeChild(item);
    }
}

function getOrCreateTweetNode(matrix, img)
{
    var texture;
    var node;
    if (RecycleTweets.length === 0) {
        texture = displayTweetPictureToCanvas(img);
        var w = 500000;
        var h = 500000;
        node = new osg.MatrixTransform();
        q = osg.createTexturedQuad(-w/2.0, -h/2.0, 0,
                                   w, 0, 0,
                                   0, h, 0);
        node.addChild(q);
        //osg.log(matrix);
        var st = getTweetShader();
        st.setTextureAttributeAndMode(0, texture);

        var uniform = osg.Uniform.createInt1(0.0, "Texture0");
        q.setStateSet(st);
        node.uniform = st.getUniformMap()['fragColor'];
        node.setUpdateCallback(getOrCreateTweetDisplayCallback());
        node.itemType = "tweet";
    } else {
        node = RecycleTweets.pop();
        texture = node.getChildren()[0].getStateSet().getTextureAttributeMap(0).Texture;
        displayTweetPictureToCanvas(img, texture);
    }
    node.name = img.src;

    node.setNodeMask(~0);
    node.getChildren()[0].getStateSet().setTextureAttributeAndMode(0, texture);
    node.setMatrix(matrix);
    node.originalMatrix = osg.Matrix.copy(matrix);

    node.itemToIntersect = true;
    delete node.startTime;
    delete node.duration;
    return node;
}


function getOrCreateTweetTagNode(matrix, text)
{
    var texture;
    var node;
    if (RecycleTweetsTags.length === 0) {
        texture = createTextureText(text);
        var ratio = texture.getHeight()*1.0/texture.getWidth();
        var w = 2000000*2.0;
        var h = w*ratio;
        var node = new osg.MatrixTransform();
        q = osg.createTexturedQuad(-w/2.0, -h/2.0, 0,
                                   w, 0, 0,
                                   0, h, 0);
        node.addChild(q);
        var st = getTweetShader();
        st.setTextureAttributeAndMode(0, texture);
        var uniform = osg.Uniform.createInt1(0, "Texture0");

        q.setStateSet(st);
        node.uniform = st.getUniformMap()['fragColor'];
        node.setUpdateCallback(getOrCreateTweetDisplayCallback());
        node.itemType = "tag";
    } else {
        node = RecycleTweetsTags.pop();
        texture = node.getChildren()[0].getStateSet().getTextureAttributeMap(0).Texture;
        createTextureText(text, texture);
    }
    node.name = text;
    node.setNodeMask(~0);
    node.setMatrix(matrix);
    node.originalMatrix = osg.Matrix.copy(matrix);

    node.itemToIntersect = true;

    delete node.startTime;
    delete node.duration;
    return node;
}

function displayTweetSource(lat, lng, img)
{
    var matrix = computeLocalToWorldTransformFromLatLongHeight(lat*Math.PI/180.0, lng*Math.PI/180.0, 1000);
    var node = getOrCreateTweetNode(matrix,img);

    return node;
}

function displayTweetTag(lat, lng, text)
{
    var matrix = computeLocalToWorldTransformFromLatLongHeight(lat*Math.PI/180.0, lng*Math.PI/180.0, 1000);
    var node = getOrCreateTweetTagNode(matrix, text);
    return node;
}

function displayYouAreHere(lat, lng, img)
{
    var matrix = computeLocalToWorldTransformFromLatLongHeight(lat*Math.PI/180.0, lng*Math.PI/180.0, 2000);

    var texture;
    var node;
    texture = new osg.Texture();
    texture.setImage(img);
    var w = 500000;
    var h = 500000;
    node = new osg.MatrixTransform();
    q = osg.createTexturedQuad(-w/2.0, -h/2.0, 0,
                               w, 0, 0,
                               0, h, 0);
    node.addChild(q);
    var st = getTweetShader();
    st.setTextureAttributeAndMode(0, texture);
    st.setAttributeAndMode(new osg.BlendFunc('ONE', 'ONE_MINUS_SRC_ALPHA'));
    st.setAttributeAndMode(new osg.Depth('ALWAYS', 0, 1.0, false));
    var uniform = osg.Uniform.createInt1(0.0, "Texture0");
    q.setStateSet(st);
    node.uniform = st.getUniformMap()['fragColor'];
    node.uniform.set([1,1,1,1]);
    var cb = new YouAreHereDisplayCallback();
    cb.manipulator = Viewer.getManipulator();
    node.setUpdateCallback(cb);

    node.setNodeMask(2);
    node.getChildren()[0].getStateSet().setTextureAttributeAndMode(0, texture);
    node.setMatrix(matrix);
    node.originalMatrix = osg.Matrix.copy(matrix);

    return node;
}




function UpdateHeightMap() {
    this.rate = 1.0/30.0; // update per second
};
UpdateHeightMap.prototype = {
    setUniformScale: function(uniform) {
        this.scale = uniform;
    },
    setTexture: function(texture) {
        this.texture = texture;
    },
    getHeightMapCanvas: function() {
        if (this.canvas === undefined) {
            this.canvas = document.getElementById("HeightMap");
        }
        return this.canvas;
    },
    update: function(node, nv) {
        var scale = Viewer.getManipulator().scale*25.0;
        this.scale.set([scale]);
        //osg.log("scale " + scale);
        if (WaveGenerator !== undefined) {
            WaveGenerator.update();
            this.texture.setFromCanvas(WaveGenerator.getCanvas());
            //WaveGenerator.swapbuffer();
        }
        node.traverse(nv);
    }
};

var HeightCanvas;
var HeightImageAttenuate;
var LastClearTime;

function displayHtmlTweetContent(tweet)
{
    var replaceURLWithHTMLLinks = function (text) {
        var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return text.replace(exp,"<a href='$1' target=\"_blank\">$1</a>"); 
    }

    var text = tweet.text;
    text = replaceURLWithHTMLLinks(text);

    var now = new Date();
    var d = new Date(tweet.created_at);
    var secs = (now.getTime()-d.getTime())/1000.0;
    var msg = "";
//    osg.log("tweet date " + new Date());
//    osg.log("now " + d);
    if (secs < 60) {
        msg = Math.floor(secs) + " seconds ago";
    } else {
        var minutes = Math.floor(secs/60.0);
        if (minutes <= 60) {
            msg = minutes + " minutes ago";
        }
        //osg.log("minutes " + minutes);
    }
//    osg.log("secs " + secs);
    
    jQuery("#TweetContent").html("<img id=\"closeTweet\" src=\"img/close.png\" alt=\"close\"><a href=\"http://twitter.com/" + tweet.user.screen_name + "\" target=\"_blank\"><img src=\"" + tweet.user.profile_image_url + "\" alt=\"\"></a>" + "<a href=\"http://twitter.com/" + tweet.user.screen_name +  "\" target=\"_blank\"><span id=\"username\">" + tweet.user.screen_name + " </span></a> <p>" + text + "</p> <span id=\"date\">" + msg + "</span>" );
    jQuery("#TweetContent").removeClass('hidden');
    jQuery("img#closeTweet").click(function() {
        jQuery("#TweetContent").addClass('hidden');
    });

}

function createScene()
{
    var getHeightShader = getHeightShaderVolume;
    var numTexturesAvailableInVertexShader = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
    osg.log("Nb Texture Unit in vertex shader " + numTexturesAvailableInVertexShader);
    if (numTexturesAvailableInVertexShader < 1) {
        osg.log("VolumeWave disabled because your OpenGL implementation has " + numTexturesAvailableInVertexShader + " vertex texture units and wave option require at least 1");
        getHeightShader = getHeightShaderFlat;
    }

    jQuery("#background").val(num2hex([0,0,0,0]));
    jQuery("#background").change(function(data) {
        var val = jQuery("#background").val();
        var newval = hex2num(val);
        osg.log("background color changed to " + newval);
        Viewer.view.setClearColor(newval);
    });
    Viewer.view.setClearColor([0,0,0,0]);


    var canvas = document.getElementById("3DView");
    var ratio = canvas.width/canvas.height;

    var scene = new osg.Node();

    var world = osg.ParseSceneGraph(getWorld());
    var world1 = osg.ParseSceneGraph(getWorld());
    var country = osg.ParseSceneGraph(getCountry());
    var coast = osg.ParseSceneGraph(getCoast());

    world.setStateSet(getWorldShader());
    world.setNodeMask(2);
    world.getOrCreateStateSet().setAttributeAndMode(new osg.CullFace('FRONT'));

    world1.setStateSet(getWorldShader2());
    world1.setNodeMask(2);
    world1.getOrCreateStateSet().setAttributeAndMode(new osg.CullFace('BACK'));
    world1.getOrCreateStateSet().getUniformMap()['fragColor'].set(LandFrontColor);

    country.addChild(coast);

    if (!DisableWave) {
        var height = osg.ParseSceneGraph(getHeight());
        var heightStateSet = getHeightShader();
        height.setStateSet(heightStateSet);
        var heightTexture = new osg.Texture();
        heightStateSet.setTextureAttributeAndMode(0, heightTexture);
        var heightUpdateCallback = new UpdateHeightMap();
        heightUpdateCallback.setUniformScale(heightStateSet.getUniformMap()['scale']);
        heightUpdateCallback.setTexture(heightTexture);
        height.setUpdateCallback(heightUpdateCallback);
        heightStateSet.setAttributeAndMode(new osg.BlendFunc('ONE', 'ONE_MINUS_SRC_ALPHA'));
        heightStateSet.setAttributeAndMode(new osg.Depth('DISABLE'));
        scene.addChild(height);
    }

    var frontTweets = new osg.Node();

    frontTweets.getOrCreateStateSet().setAttributeAndMode(new osg.CullFace('BACK'));

    scene.addChild(world);
    scene.addChild(world1);
    scene.addChild(country);



    world.getOrCreateStateSet().setAttributeAndMode(new osg.BlendFunc('ONE', 'ONE_MINUS_SRC_ALPHA'));
//    world.getOrCreateStateSet().setAttributeAndMode(new osg.BlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA));
    world1.getOrCreateStateSet().setAttributeAndMode(new osg.BlendFunc('ONE', 'ONE_MINUS_SRC_ALPHA'));

    country.setStateSet(getCountryShader());
    country.getOrCreateStateSet().setAttributeAndMode(new osg.BlendFunc('ONE', 'ONE'));
    country.getOrCreateStateSet().setAttributeAndMode(new osg.Depth('ALWAYS', 0, 1.0, false));

    var twitterItems = new osg.Node();
    var twitterTagsItems = new osg.Node();


    frontTweets.addChild(twitterItems);
    frontTweets.addChild(twitterTagsItems);

//    frontTweets.getOrCreateStateSet().setAttributeAndMode(new osg.BlendFunc('ONE', 'ONE_MINUS_SRC_ALPHA'));
    frontTweets.getOrCreateStateSet().setAttributeAndMode(new osg.BlendFunc('ONE', 'ONE_MINUS_SRC_ALPHA'));
    frontTweets.getOrCreateStateSet().setAttributeAndMode(new osg.Depth('ALWAYS', 0, 1.0, false));
//    scene.addChild(twitterItems);
//    scene.addChild(twitterTagsItems);


    var numberOfTweets = 0;
    var tweetsPerCountry = {};
    var tweetsHashTags = {};

    var createGoToLocation = function(location) {
        var f = function(event) {
            hideRankingInstructions();
            Viewer.manipulator.goToLocation(location.lat, location.lng);
        };
        return f;
    }

    var currentRank;
    var updateCountryStatsLastUpdate = 0;
    var updateCountryStats = function(data) {
        var date = (new Date()).getTime()/1000.0;
        if (date - updateCountryStatsLastUpdate > 0.3) {
            updateCountryStatsLastUpdate = date;
            var array = [];
            for (var k in data) {
                array.push({'key': k, 'nb':data[k].hits });
            }
            array.sort(function(a, b) {
                return b.nb - a.nb;
            });
            var text = "";
            var max = 8;
            if (array.length > max) {
                array.length = max;
            }

            var key;
            var name;

            var setupGlow = function(l) {
                l.addClass("glowing");
                setTimeout(function() { l.removeClass("glowing");}, 200);
            };

            for (var i = 0, l = array.length; i < l; i++) {
                key = array[i].key;
                var hits = data[key].hits;
                name = data[key].name;
                var location = data[key].location;
                var iconSize = 20;

                var flagCode;
                var countryCode;

                if (Country2Flag[name] !== undefined) {
                    flagCode = Country2Flag[name];
                } else {
                    osg.log("Can't find flag for " + name);
                }
                array[i].flag = flagCode.toLowerCase();

                if (Country2ID[name] !== undefined) {
                    countryCode = Country2ID[name];
                } else {
                    osg.log("Can't find country for " + name);
                }
                array[i].country = countryCode;
				
		var index = i + 1;
		var li = jQuery("#countries li:nth-child("+index.toString()+")");
				
                if (currentRank === undefined || i >= (currentRank.length)) {
                    li.find("div").addClass("flag-" + array[i].flag);
                    li.find("span.countryName").html(array[i].country);
                    li.find("span.tweetCount").html(hits);
                } else {
                    if (currentRank[i].flag !== array[i].flag) {
                        li.find("div").removeClass("flag-" + currentRank[i].flag);
                        li.find("div").addClass("flag-" + array[i].flag);
                        if (i === 0  ||  (array[i].flag !== currentRank[i-1].flag) ) {
                            setupGlow(li);
                        }
                    }
                    if (currentRank[i].country !== array[i].country) {
                        li.find("span.countryName").html(array[i].country);
                    }
                    li.find("span.tweetCount").html(hits);
                }
                if (array[i].cb === undefined) {
                    array[i].cb = createGoToLocation(location);
                }
                li.click(array[i].cb);

            }
            currentRank = array;
        }
    };

    var updateTweetsHashTagsLastUpdate = 0;
    var updateTweetsHashTags = function(data) {
        var date = (new Date()).getTime()/1000.0;
        if (date - updateTweetsHashTagsLastUpdate > 2.0) {
            updateTweetsHashTagsLastUpdate = date;
            var array = [];
            for (var k in data) {
                array.push({'name': k, 'nb':data[k]});
            }
            array.sort(function(a, b) {
                return b.nb - a.nb;
            });
            var text = "";
            var nbTags = 20;
            if (array.length < 20)
                nbTags = array.length;
            for (var i = 0, l = nbTags; i < l; i++) {
                var item = array[i];
                text += "#" + item.name + " : " + item.nb +" <br>";
            }
            jQuery("#tagsStats").html(text);
        }
    };
    
    var updateTweetsStats = function(data) {
        jQuery("#generalTweetCount").html(data);
    };

    var updateNumberOfCountry = function(data) {
        var nb = 0;
        for (var k in data) {
            nb += 1;
        }
        if (nb <= 1) {
            jQuery("#generalCountriesCount").html(nb + "");
        } else {
            jQuery("#generalCountriesCount").html(nb + "");
        }
    };

    var updateDuration = function(data) {
        var v;
        if (data < 60) {
            v = Math.floor(data);
            jQuery("#generalTimer").html(v + "''");
        } else {
            v = Math.floor(data/60.0);
            if (v <= 1) {
                jQuery("#generalTimer").html(v + "'");
            } else {
                jQuery("#generalTimer").html(v + "'");
            }
        }
    };

    var updateCurrentTweetsStats = function(data) {
        jQuery("#tweetsPersecond").html(data.getChildren().length);
    };

    var lastUpdateStatistics;
    var globalDuration = (new Date()).getTime()/1000.0;

    var consumeTweet = function(tweet) {
        //osg.log(tweet);
        var displayTweet = function(location, tweet) {

            if (numberOfTweets % 5 === 0) {
                cleanExpiredTweets(twitterItems);
                cleanExpiredTweets(twitterTagsItems);
            }
            numberOfTweets++;
            if (tweet.place !== null) {
                var ctry = tweet.place.country;
                if (ctry.length > 0) {
                    var key = ctry;
                    key = key.replace(' ','_');
                    if (tweetsPerCountry[key] === undefined) {
                        tweetsPerCountry[key] = { 'name': ctry, 'hits':0, 'location': location, 'key':key};
                    }
                    tweetsPerCountry[key].hits += 1;

                }
            }

            var currentTime = (new Date()).getTime()/1000.0;
            if (lastUpdateStatistics === undefined) {
                lastUpdateStatistics = currentTime;
            }
            if (currentTime - lastUpdateStatistics > 2.0) {
                updateCountryStats(tweetsPerCountry);
                updateNumberOfCountry(tweetsPerCountry);
                updateTweetsStats(numberOfTweets);
                updateCurrentTweetsStats(twitterItems);
                //updateTweetsHashTags(tweetsHashTags);

                var t = currentTime-globalDuration;
                updateDuration(t);

                lastUpdateStatistics = currentTime;
            }

            var lat = location.lat;
            var lng = location.lng;
            if (lat !== 0.0 && lng !== 0.0) {

                if (WaveGenerator !== undefined) {
                    WaveGenerator.setLatLng(lat, lng);
                }

                // add a small random related to distance from eye
                // 100 is too much so I have tuned a bit to 70
                var scale = Viewer.getManipulator().scale * 80.0;
                lat += (Math.random()*2.0 - 1.0)*scale;
                lng += (Math.random()*2.0 - 1.0)*scale;

                var img = new Image();
                img.onload = function() {
                    //osg.log(location);
                    //displayHtmlTweetContent(img,tweet);
                    var tweetNode = displayTweetSource(lat, lng, img);
                    tweetNode.tweet = tweet;
                    twitterItems.addChild(tweetNode);

                    if (tweet.entities !== undefined && tweet.entities.hashtags.length > 0) {
                        var tags = tweet.entities.hashtags;
                        var existingTag = {};
                        for (var i = 0, l = 1; i < l; i++) {
                            var hash = tags[i];
                            if (hash !== undefined && hash.text !== undefined && hash.text.length > 0 ) {
                                var tagText = hash.text;
                                if (existingTag[tagText] !== undefined) { // display once tag name even if present more than one time in a tweet
                                    continue;
                                }
                                existingTag[tagText] = true;

                                if (tweetsHashTags[tagText] === undefined) {
                                    tweetsHashTags[tagText] = 0;
                                }
                                tweetsHashTags[tagText] += 1;

                                //var scale = Viewer.getManipulator().scale;

                                //var range = 10.0 *scale * 10.0;
                                //var angle = 4.0 * scale * 10.0;
                                //var lat2 = lat - tags.length*angle/2.0 + i*angle;
                                //var lng2 = lng - range/2.0 + Math.random()*range;
                                var lat2 = lat;
                                var lng2 = lng;
                                var n = displayTweetTag(lat2, lng2, "#" +hash.text);
                                n.tweet = tweet;
                                twitterTagsItems.addChild(n);
                            }
                        }
                    }
                };
                img.src = tweet.user.profile_image_url;
                //img.src = "http://plopbyte.net/tmp/ff-demo/line.png";
            }
        };

        var lat ,lng;
        if (tweet.geo) {
            lat=tweet.geo.coordinates[0];
            lng=tweet.geo.coordinates[1];
            displayTweet({ 'lat' : lat, 'lng' : lng }, tweet);
        } else if (tweet.place !== null) {
            // compute location from bounding box
            var bb = tweet.place.bounding_box.coordinates[0];
            var center = osg.Vec2.copy(bb[0]);
            for ( var i = 1, l = bb.length; i < l; i++) {
                osg.Vec2.add(center, bb[i], center);
            }
            osg.Vec2.mult(center, 1.0/bb.length, center);

            lat=center[1];
            lng=center[0];
            displayTweet({ 'lat' : lat, 'lng' : lng }, tweet);
        } else {
            getLatLongFromLocation(tweet, displayTweet);
        }

    };

    var pollTimeLine = function() {
        cleanExpiredTweets(scene);
        getPublicTimeline(consumeTweet);
        window.setTimeout(pollTimeLine, 5*1000);
    };

    installProcessTweet(consumeTweet);

    Viewer.manipulator.update(-2.0, 0);

    if (!DisableWave) {
        WaveGenerator = new Wave();
    }

    scene.addChild(frontTweets);

    initializeInstructions(canvas, scene);
    return scene;
}
