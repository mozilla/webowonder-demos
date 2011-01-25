var targetOrigin = "*";

function initDemo() {
  var go = document.getElementById("go");
  var panel = document.getElementById("panel");
  var toMove = null;

  var section = document.getElementById("demo");

  section.addEventListener("MozTouchDown", function(e) {
      e.stopPropagation();
      }, false);

  go.addEventListener("mousedown", function(e) {e.preventDefault();}, true);

  go.addEventListener("MozTouchDown", function(e) {
      try {
      panel.querySelector("video[src='jackie.webm']").currentTime = 4;
      } catch(e) {};
      go.classList.add("pressed");
      window.setTimeout(function() {
        panel.classList.toggle("selected");
        }, 1000);
      }, true);

  var victims = document.querySelectorAll("svg foreignObject");
  for (var i = 0, ii = victims.length; i < ii; i++) {
    var v = victims[i];
    v.addEventListener("MozTouchUp", function(e) {
        toMove = null;
        }, true);
    v.addEventListener("mousedown", function(e) {e.preventDefault();}, true);

    log("event listener added");
    v.addEventListener("MozTouchDown", function(e) {
        log("event received");
        e.preventDefault();
        toMove = e.originalTarget;
        setTimeout(function() {
          if (!!toMove) {
          insert(toMove, e.clientX, e.clientY);
          }
          }, 1000);
        }, true);
  }


  go.addEventListener("MozTouchUp", function() {
      go.classList.remove("pressed");
      }, true);

  function insert(node, x, y) {
    var canvas = document.createElement("canvas");
    var div = document.createElement("div");
    div.appendChild(canvas);

    node = document.getElementById("bag").appendChild(node);

    panel.classList.remove("selected");
    div.className = "player";

    var width = node.tagName == "VIDEO" ? node.videoWidth:node.width;
    var height = node.tagName == "VIDEO" ? node.videoHeight:node.height;

    canvas.width = width;
    canvas.height = height;

    if (node.tagName == "VIDEO") {
      node.play();
      var _draw = function() {
        draw(div);
        window.mozRequestAnimationFrame(_draw);
      }
      window.mozRequestAnimationFrame(_draw);
    }

    section.firstChild.insertBefore(div, go);

    div.mirror = node;
    draw(div);

    makeEditable(div);
  }

  var NOTHING = 0;
  var DRAGGING = 1;
  var TRANSFORMING = 2;
  var CUTTING = 3;

  var finger1 = {};
  var finger2 = {};

  var A0;
  var B0;

  var mode = NOTHING;
  var moving = null;

  var victim;

  var OrgMatrix;

  function makeEditable(div) {

    // TOUCH DOWN

    div.addEventListener("MozTouchDown", function(e) {
        try {victim.classList.remove("selected");} catch(e) {}
        victim = div;
        victim.classList.add("selected");
        if (mode == NOTHING) {
        mode = DRAGGING;

        finger1.id = e.streamId;
        finger1.x = e.clientX;
        finger1.y = e.clientY;

        A0 = {x: e.clientX, y: e.clientY}
        B0 = {x: e.clientX + 10, y: e.clientY}
        return;
        }

        if (mode == DRAGGING) {
        mode = TRANSFORMING;

        finger2.id = e.streamId;
        finger2.x = e.clientX;
        finger2.y = e.clientY;

        A0 = {x: finger1.x, y: finger1.y};
        B0 = {x: finger2.x, y: finger2.y};

        OrgMatrix = victim._m;

        return;
        }
    }, true);

    // TOUCH UP

    window.addEventListener("MozTouchUp", function(e) {
        //if (mode == DRAGGING || mode == TRANSFORMING) {
        mode = NOTHING;
        //}
        }, true);

    // TOUCH MOVE
    window.addEventListener("MozTouchMove", function(e) {
        if (finger1.id == e.streamId) {
        finger1.x = e.clientX;
        finger1.y = e.clientY;
        }
        if (finger2.id == e.streamId) {
        finger2.x = e.clientX;
        finger2.y = e.clientY;
        }

        if (mode == DRAGGING && finger1.id == e.streamId) {
        var A1 = {x: e.clientX, y: e.clientY}
        var B1 = {x: e.clientX + 10, y: e.clientY}
        consolidate(victim, victim._m, A0, B0, A1, B1);
        A0 = A1;
        B0 = B1;
        }

        if (mode == DRAGGING && finger1.id != e.streamId) {
        mode = CUTTING;
        A0 = {x: e.clientX, y: e.clientY};
        }

        if (mode == CUTTING && finger1.id != e.streamId) {
          var A1 = {x: e.clientX, y: e.clientY};
          if (((A1.x - A0.x) *(A1.x - A0.x) + (A1.y - A0.y) *(A1.y - A0.y)) > (60000)) {
            cut(A0, A1, finger1);
            mode = NOTHING;
          }
        }

        if (mode == TRANSFORMING && finger2.id == e.streamId) {
          consolidate(victim, OrgMatrix, A0, B0, finger1, finger2);
        }

    }, true);
  }

  function consolidate(elt, oldM, A0, B0, A1, B1) {
    var m = ComputeTransform(A0, B0, A1, B1);

    if (!!oldM) {
      m = oldM.x(m);
    }

    elt._m = m;

    elt.style.MozTransform = MatrixToString(m);
  }



  function draw(elt) {
    var canvas = elt.firstChild;
    canvas.ctx = canvas.getContext("2d");
    var ctx = canvas.ctx;

    ctx.drawImage(elt.mirror, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 20;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    if (!elt.cut) return;

    for (var i = 0, ii = elt.cut.length; i < ii; i++) {
      var v = elt.cut[i];
      var [x0, y0, x1, y1, x3, y3, x2, y2] = v;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);

      ctx.lineTo(x3, y3);
      ctx.lineTo(x2, y2);

      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.globalCompositeOperation = "destination-out";
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 10;
      ctx.stroke();
    }
  }



  function cut(A0, A1, ref) {
    var m = victim._m.inv();

    var m11 = m.e(1, 1);
    var m12 = m.e(1, 2);
    var m21 = m.e(2, 1);
    var m22 = m.e(2, 2);
    var dx = m.e(3, 1);
    var dy = m.e(3, 2);

    A0.x = m11 * A0.x + m21 * A0.y + dx;
    A0.y = m12 * A0.x + m22 * A0.y + dy;

    A1.x = m11 * A1.x + m21 * A1.y + dx;
    A1.y = m12 * A1.x + m22 * A1.y + dy;

    var rx = m11 * ref.x + m21 * ref.y + dx;
    var ry = m12 * ref.x + m22 * ref.y + dy;

    var a = (A0.y - A1.y) / (A0.x - A1.x);
    var b = A0.y - a * A0.x;

    var fx = (ry - b) / a;
    var fingerleft = fx > rx;
    log(fingerleft);

    var width = victim.offsetWidth;
    var height = victim.offsetHeight;

    var y0 = 0;
    var x0 = -b / a;

    var y1 = height;
    var x1 = (y1 - b) / a;

    var ctx = victim.firstChild.ctx;

    var d = 1000;
    var diff = Math.sqrt(d * d * (a * a + 1));

    if (fingerleft && a > 0) {
      b -= diff;
    }
    if (!fingerleft && a > 0) {
      b += diff;
    }
    if (fingerleft && a <= 0) {
      b += diff;
    }
    if (!fingerleft && a <= 0) {
      b -= diff;
    }

    var y2 = 0;
    var x2 = -b / a;

    var y3 = height;
    var x3 = (y3 - b) / a;

    if (!victim.cut) {
      victim.cut = [];
    }
    victim.cut.push([x0, y0, x1, y1, x3, y3, x2, y2]);

    draw(victim);
  }

  function ComputeTransform (A0, B0, A1, B1) {
    function findC(A, B) {
      var C = {};
      C.x = (B.y - A.y) + A.x;
      C.y  = -1 * (B.x - A.x) + A.y;
      return C;
    }
    var C0 = findC(A0, B0);
    var C1 = findC(A1, B1);

    var denom = A0.x * (C0.y - B0.y) - B0.x * C0.y + C0.x * B0.y + (B0.x - C0.x) * A0.y;
    if (denom == 0) {
      throw("denom == 0");
    }
    var m11 = - (A0.y * (C1.x - B1.x) - B0.y * C1.x + C0.y * B1.x + (B0.y - C0.y) * A1.x) / denom;
    var m12 = (B0.y * C1.y + A0.y * (B1.y - C1.y) - C0.y * B1.y + (C0.y - B0.y) * A1.y) / denom;
    var m21 = (A0.x * (C1.x - B1.x) - B0.x * C1.x + C0.x * B1.x + (B0.x - C0.x) * A1.x) / denom;
    var m22 = - (B0.x * C1.y + A0.x * (B1.y - C1.y) - C0.x * B1.y + (C0.x - B0.x) * A1.y) / denom;
    var dx = (A0.x * (C0.y * B1.x - B0.y * C1.x) + A0.y * (B0.x * C1.x - C0.x * B1.x) + (C0.x * B0.y - B0.x * C0.y) * A1.x) / denom;
    var dy = (A0.x * (C0.y * B1.y - B0.y * C1.y) + A0.y * (B0.x * C1.y - C0.x * B1.y) + (C0.x * B0.y - B0.x * C0.y) * A1.y) / denom;

    return $M([
        [m11, m12, 0],
        [m21, m22, 0],
        [dx , dy , 1]
        ]);
  }

  function MatrixToString(m) {
    return "matrix(" + m.e(1, 1) + ", " + m.e(1, 2) + ", " + m.e(2, 1) + ", " + m.e(2, 2) + ", " + m.e(3, 1) + "px, " + m.e(3, 2) +  "px)";
  }

  window.parent.postMessage('loaded', targetOrigin);
}

window.onload = function () {
 var startX;
 var inGesture = false;
 var id;

 window.addEventListener("MozTouchDown", function(e) {
   if (inGesture) return;

   inGesture = true;

   startX = e.clientX;
   id = e.streamId;

   e.preventDefault();
   }, false);

 document.body.addEventListener("MozTouchMove", function(e) {
   if (!inGesture) return;
   if (e.streamId != id) return;
   var x = e.clientX - startX;

   var TR = 100;

   if (x < -TR) {
   history.forward();
   inGesture = false;
   }
   if (x > TR) {
   history.back();
   inGesture = false;
   }

   e.preventDefault();
   }, false);

 document.body.addEventListener("MozTouchUp", function(e) {
     if (!inGesture) return;
     if (e.streamId != id) return;
     inGesture = false;
 }, false);


 window.addEventListener("message", function(e) {
     if ("stop_demo" == e.data) window.parent.postMessage('finished_exit', targetOrigin);
 }, true);

 initDemo();
};


function log(msg) {
  var elt = document.getElementById("log");
  elt.value = msg + "\n" + elt.value;
}
