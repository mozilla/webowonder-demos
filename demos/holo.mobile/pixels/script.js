const X_Amplitude = 15;
const Y_Amplitude = 15;

var row1, row2, row3, d1, d2, d3;

var landscape = true;

var layers, back, scene, marginTop, marginLeft, scale;

var xshift = 0;
var yshift = 0;

function px(v) {return v + "px"}

window.onload = function() {
    scene = document.getElementById("scene");
    var totalHeight = scene.clientHeight;
    var totalWidth = scene.clientWidth;

    row1 = document.getElementById("row1");
    row1.orgHeight = 100 * row1.clientHeight / totalHeight;

    row2 = document.getElementById("row2");
    row2.orgHeight = 100 * row2.clientHeight / totalHeight;

    row3 = document.getElementById("row3");
    row3.orgHeight = 100 * row3.clientHeight / totalHeight;

    d1 = document.querySelectorAll(".d1");
    d2 = document.querySelectorAll(".d2");
    d3 = document.querySelectorAll(".d3");

    ds = document.querySelectorAll(".d1, .d2, .d3");

    for (var i = 0, ii = ds.length; i < ii; i++) {
        var d = ds[i];
        d.orgWidth = 100 * d.clientWidth / totalWidth;
    }

    layers = document.querySelectorAll("#layers > div");
    back = document.querySelector("#row2 > .d2");

    scale = back.clientWidth / scene.clientWidth;

    document.body.classList.add("no3D");

    setTimeout(function() {
        document.body.classList.remove("loading");

        setTimeout(function() {
          start3D();
        }, 2000)

    }, 4000);

}

var initialized = false;

function start3D() {
    if (initialized) return;
    initialized = true;
    document.body.classList.remove("no3D");

    window.addEventListener("MozOrientation", function(e) {
        if (!landscape) {
            xshift = e.x * -2.5;
            yshift = (e.y - 0.5) * -2.5;
        } else {
            xshift = e.y * -2.5;
            yshift = (e.x + 0.7) * 2.5;
        }
    }, true);


    for (var i = 0; i < layers.length; i++) {
        var l = layers[i];
        var z = l.getAttribute("z");
        l.style.MozTransform = "scale(" + (scale + (1 - scale) * (z)) + ")";
        l.style.zIndex = 1000 * z;
    }
    draw();
}


var oldX = 1000;
var oldY = 1000;

function draw() {
    landscape = (window.innerHeight < window.innerWidth);
    if (xshift > 1) xshift = 1;
    if (xshift < -1) xshift = -1;
    if (yshift > 1) yshift = 1;
    if (yshift < -1) yshift = -1;

    oldX = xshift;
    oldY = yshift;

    marginTop = (row1.orgHeight + Y_Amplitude * yshift);
    row1.style.height =  marginTop + "%";

    row3.style.height = (row3.orgHeight - Y_Amplitude * yshift) + "%";

    marginLeft = ds[0].orgWidth + X_Amplitude * xshift;
    for (var i = 0, ii = d1.length; i < ii; i++) { d1[i].style.width = marginLeft + "%"; }

    var width = (d3[0].orgWidth - X_Amplitude * xshift) + "%";
    for (var i = 0, ii = d3.length; i < ii; i++) {d3[i].style.width = width;}

    projectLayers();

    setTimeout(draw, 50);
    //window.mozRequestAnimationFrame(draw);
}


function projectLayers() {
    for (var i = 0; i < layers.length; i++) {
        var l = layers[i];
        var z = l.getAttribute("z");
        var mt = marginTop - (z) * marginTop;
        var ml = marginLeft - (z) * marginLeft;
        l.style.top = mt + "%";
        l.style.left = ml + "%";
    }
}
