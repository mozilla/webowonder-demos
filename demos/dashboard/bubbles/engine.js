// Helpers

var $ = function() {
    return document.querySelector.apply(document, arguments)
}

// ppk ftw :)
function findPos(e) {
    var curleft = curtop = 0;
    if (e.offsetParent) {
        do {
            curleft += e.offsetLeft;
            curtop += e.offsetTop;
        } while (e = e.offsetParent);
    }
    return {left: curleft, top: curtop};
}

function distance(a, b) {
    return Math.sqrt((a.x - b.x) * (a.x - b.x) +
                     (a.y - b.y) * (a.y - b.y));
}

// Based on http://codeflow.org/entries/2010/nov/29/verlet-collision-with-impulse-preservation/

const damping = 0.60;

var Bubble = function(world, x, y, radius, name, ctx, fgcolor, bgcolor) {
    this.world = world;
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.ax = 0;
    this.ay = 0;
    this.fgcolor = fgcolor;
    this.bgcolor = bgcolor;
    this.hanged = false;
    this.name = name;

    if (!radius) {
        radius = Math.max(30, ctx.measureText(name).width) / 2;
        radius += 5;
    }

    this.radius = radius;
}

Bubble.prototype = {
    toString: function() {
        return "Name: " + this.name + "; x: " + this.x + "; y: " + this.y + "; radius: " + this.radius + ";";
    },
    accelerate: function(delta){
        this.x += this.ax;
        this.y += this.ay;
        this.ax = 0;
        this.ay = 0;
    },
    inertia: function(){
        var x = this.x*2 - this.px;
        var y = this.y*2 - this.py;
        this.px = this.x;
        this.py = this.y;
        this.x = x;
        this.y = y;
    },
    getAbsoluteX: function() {
        return this.x + this.world.getX();
    },
    getAbsoluteY: function() {
        return this.y + this.world.getY();
    },
    draw: function(ctx){
        ctx.fillStyle = this.bgcolor;
        ctx.beginPath();
        ctx.arc(this.getAbsoluteX(), this.getAbsoluteY(), this.radius, 0, Math.PI*2, false);
        ctx.fill();
        if (this.name) {
            ctx.fillStyle = this.fgcolor;
            ctx.fillText(this.name, this.getAbsoluteX(), this.getAbsoluteY());
        }
    },
    hang: function() {
        this.hanged = true;
        this.ax = 0;
        this.ay = 0;
        this.px = this.x;
        this.py = this.y;
    },
    release: function() {
        this.hanged = false;
        this.ax = 0;
        this.ay = 0;
        this.px = this.x;
        this.py = this.y;
    }
}

/*********************/
/*      WORLDS       */
/*********************/

var SquareWorld = function(x, y, width, height, ctx, fgcolor, bgcolor) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.bgcolor = bgcolor;
}

SquareWorld.prototype = {
    getX: function() {return this.x;},
    getY: function() {return this.y;},
    ensureInside: function(bubble, preserve_impulse) {
        var radius = bubble.radius;
        var x = bubble.x;
        var y = bubble.y;

        if (x - radius < this.x){
            var vx = (bubble.px - bubble.x) * damping;
            bubble.x = this.x + radius;
            preserve_impulse && (bubble.px = bubble.x - vx);
        }
        else if (x + radius > this.x + this.width){
            var vx = (bubble.px - bubble.x) * damping;
            bubble.x = this.x + this.width - radius;
            preserve_impulse && (bubble.px = bubble.x - vx);
        }
        if (y - radius < this.y){
            var vy = (bubble.py - bubble.y) * damping;
            bubble.y = this.y + radius;
            preserve_impulse && (bubble.py = bubble.y - vy);
        }
        else if (y + radius > this.y + this.height){
            var vy = (bubble.py - bubble.y) * damping;
            bubble.y = this.y + this.height - radius;
            preserve_impulse && (bubble.py = bubble.y - vy);
        }
    }
}

var BubbleWorld = function(square, x, y, radius, ctx, color) {
    this.bubble = new Bubble(square, x, y, radius, null, ctx, null, color);
};

BubbleWorld.prototype = {
    getX: function() {return this.bubble.x;},
    getY: function() {return this.bubble.y;},
    ensureInside: function(bubble, preserve_impulse) {
        var radius = bubble.radius;
        var x = bubble.x;
        var y = bubble.y;

        var worldRadius = this.bubble.radius;

        radius = radius / worldRadius;
        x = x / worldRadius;
        y = y / worldRadius;

        var dist = distance({x: x, y: y}, {x: 0, y: 0});

        if (dist <= (1 - radius)) return;

        if (x == 0) {
            if (y > 0) var alpha = Math.PI / 4;
            else var alpha = Math.PI / -4;
        } else {
            var alpha = Math.atan(y / x);
        }

        if (x < 0) {
            x = -Math.cos(alpha) * (1 - radius);
            y = Math.sin(-alpha) * (1 - radius);
        } else {
            x = Math.cos(alpha) * (1 - radius);
            y = Math.sin(alpha) * (1 - radius);
        }

        var newX = (x * worldRadius);
        var newY = (y * worldRadius);

        var vx = (bubble.px - bubble.x)*0.4;
        var vy = (bubble.py - bubble.y)*0.4;

        bubble.x = newX;
        bubble.y = newY;

        if (preserve_impulse) {
            bubble.px = bubble.px;
            bubble.py = bubble.y;
        }
    }
}

var Simulation = function(ctx, bubbles){
    var width = ctx.canvas.width;
    var height = ctx.canvas.height;
    var interval;


    var collide = function(preserve_impulse){
        for(var i=0, l=bubbles.length; i<l; i++){
            var bubble1 = bubbles[i];
            for(var j=i+1; j<l; j++){
                var bubble2 = bubbles[j];
                if (bubble2.world !== bubble1.world) continue; //FIXME PERF
                var x = bubble1.x - bubble2.x;
                var y = bubble1.y - bubble2.y;
                var slength = x*x+y*y;
                var length = Math.sqrt(slength);
                var target = bubble1.radius + bubble2.radius;

                if (length < target){
                    var v1x = bubble1.x - bubble1.px;
                    var v1y = bubble1.y - bubble1.py;
                    var v2x = bubble2.x - bubble2.px;
                    var v2y = bubble2.y - bubble2.py;

                    var factor = (length-target)/length;
                    if (bubble1.hanged) {
                        bubble2.x += x*factor;
                        bubble2.y += y*factor;
                    } else if (bubble2.hanged) {
                        bubble1.x -= x*factor;
                        bubble1.y -= y*factor;
                    } else {
                        bubble1.x -= x*factor*0.5;
                        bubble1.y -= y*factor*0.5;
                        bubble2.x += x*factor*0.5;
                        bubble2.y += y*factor*0.5;
                    }

                    if (preserve_impulse){
                        var f1 = (damping*(x*v1x+y*v1y))/slength;
                        var f2 = (damping*(x*v2x+y*v2y))/slength;

                        v1x += f2*x-f1*x;
                        v2x += f1*x-f2*x;
                        v1y += f2*y-f1*y;
                        v2y += f1*y-f2*y;

                        bubble1.px = bubble1.x - v1x;
                        bubble1.py = bubble1.y - v1y;
                        bubble2.px = bubble2.x - v2x;
                        bubble2.py = bubble2.y - v2y;
                    }
                }
            }
        }
    }

    var border_collide = function(preserve_impulse){
        for(var i=0, l=bubbles.length; i<l; i++){
            bubbles[i].world.ensureInside(bubbles[i], preserve_impulse);
        }
    }

    var draw = function(){
        ctx.clearRect(0, 0, width, height);
        for(var i=0, l=bubbles.length; i<l; i++){
            bubbles[i].draw(ctx);
        }
    }

    var gravity = function(){
        for(var i=0, l=bubbles.length; i<l; i++){
            bubbles[i].ay += 0.8;
        }
    }

    var accelerate = function(delta){
        for(var i=0, l=bubbles.length; i<l; i++){
            if (!bubbles[i].hanged)
                bubbles[i].accelerate(delta);
        }
    }

    var inertia = function(delta){
        for(var i=0, l=bubbles.length; i<l; i++){
            if (!bubbles[i].hanged)
                bubbles[i].inertia(delta);
        }
    }

    var step = function(){
        gravity();
        accelerate();
        collide(false);
        border_collide(false);
        inertia();
        collide(true);
        border_collide(true);
        draw();
        window.mozRequestAnimationFrame(step);
    }

    this.start = function(){
        window.mozRequestAnimationFrame(step);
    }

    this.stop = function(){
        if (interval){
            clearInterval(interval);
            interval = null;
        }
    }

    this.getBubbleAt = function(x, y) {
        for (var i = bubbles.length - 1; i >= 0; i--) {
            var bx = bubbles[i].getAbsoluteX();
            var by = bubbles[i].getAbsoluteY();
            if (distance({x: bx, y: by}, {x: x, y: y}) < bubbles[i].radius) {
                return bubbles[i];
            }
        }
        return null;
    }
    draw();
}



var canvas, simulation;

window.onload = function() {
    canvas = $('#bubbles');

    dragndrop();

    var ctx = canvas.getContext('2d');

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "10px monospace";

    var squareworld = new SquareWorld(0, 0, canvas.width, canvas.height, ctx, 'white', 'black');

    window.g_html5 = new BubbleWorld(squareworld, 0, 100, 140, ctx, '#2EC4DD');
    window.g_css3 = new BubbleWorld(squareworld, 1, 101, 80, ctx, '#2EC4DD');
    window.g_js = new BubbleWorld(squareworld, 2, 102, 80, ctx, '#2EC4DD');
    window.g_svg = new BubbleWorld(squareworld, 3, 103, 80, ctx, '#2EC4DD');
    window.g_performance = new BubbleWorld(squareworld, 4, 104, 80, ctx, '#2EC4DD');
    window.g_security = new BubbleWorld(squareworld, 5, 105, 80, ctx, '#2EC4DD');
    window.g_multiplatform = new BubbleWorld(squareworld, 6, 106, 80, ctx, '#2EC4DD');

    var bubbles = [];

    //var groups = "html5 css3 js svg performance security multiplatform".split(" ");
    var groups = "html5".split(" ");

    for (var i = 0; i < groups.length; i++) {
        var elts = document.querySelectorAll('#' + groups[i] + '> article > h1');
        bubbles.push(window["g_" + groups[i]].bubble);
    }

    for (var i = 0; i < groups.length; i++) {
        var elts = document.querySelectorAll('#' + groups[i] + '> article > h1');
        var b = new Bubble(window["g_" + groups[i]], -1, 0, null, groups[i], ctx, 'black', '#6CCFE4');
        bubbles.push(b);
        for (var j = 0; j < elts.length; j++) {
            var elt = elts[j];
            var text = elt.innerHTML;
            text = text.replace("&gt;", "");
            text = text.replace("&lt;", "");
            text = text.replace(" ", "\n");
            b = new Bubble(window["g_" + groups[i]], j, 0, null, text, ctx, 'white', '#6CCFE4');
            bubbles.push(b);
        }
    }

    /*
    var _b1 = new Bubble(b_1, 0, 0, 30, "1", ctx, 'white', '#6CCFE4');
    var _b2 = new Bubble(b_1, 0, 1, 30, "2", ctx, 'white', '#6CCFE4');

    var _ba = new Bubble(b_a, 0, 0, 30, "a", ctx, 'white', '#6CCFE4');
    var _bb = new Bubble(b_a, 0, 1, 30, "b", ctx, 'white', '#6CCFE4');

    bubbles.push(_b1);
    bubbles.push(_b2);
    bubbles.push(_ba);
    bubbles.push(_bb);
    */

    simulation = new Simulation(ctx, bubbles);
    simulation.start();
}

function dragndrop() {
    var offset = findPos(canvas);

    var selectedBubble = null;
    var prevPos;

    canvas.addEventListener("mousedown", function(e) {
        prevPos = {x: e.clientX, y: e.clientY};
        var x = e.clientX - offset.left;
        var y = e.clientY - offset.top;
        selectedBubble = simulation.getBubbleAt(x, y);
        if (selectedBubble) {
            selectedBubble.hang();
        }
    }, true);

    canvas.addEventListener("mouseup", function(e) {
        if (selectedBubble) {
            selectedBubble.release();
            selectedBubble = null;
        }
    }, true);
    canvas.addEventListener("mousemove", function(e) {
        if (!selectedBubble) return;

        var delta = {x: e.clientX - prevPos.x, y: e.clientY - prevPos.y};
        prevPos = {x: e.clientX, y: e.clientY};

        selectedBubble.x += delta.x;
        selectedBubble.y += delta.y;
    }, true);

}

